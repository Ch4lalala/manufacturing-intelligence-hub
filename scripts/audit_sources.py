#!/usr/bin/env python3
"""Read-only source audit and reproducible JSON extraction; no Excel authoring.
Run from any directory: python scripts/audit_sources.py. Never evaluate arbitrary formulas.
"""
from pathlib import Path
from datetime import date, datetime
from collections import Counter
from decimal import Decimal
import argparse, hashlib, json, re
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
from pptx import Presentation
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'processed'

def clean(v):
    if isinstance(v, (datetime, date)): return v.isoformat()
    return v

def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2, default=clean) + '\n', encoding='utf-8')

def ref(path, sheet=None, cell=None, slide=None):
    d={'file':path.relative_to(ROOT).as_posix()}
    if sheet: d['sheet']=sheet
    if cell: d['cell']=cell
    if slide: d['slide']=slide
    return d

def money(values):
    return float(sum((Decimal(str(v)) for v in values),Decimal('0')))

def condition_status(formula, ws, row):
    # Whitelist exactly the nested IF(OR(...),"TRIP",IF(OR(...),"ALARM","NORMAL")) in the originals.
    pat=r'^=IF\(OR\((.*?)\),"TRIP",IF\(OR\((.*?)\),"ALARM","NORMAL"\)\)$'
    m=re.fullmatch(pat, formula)
    if not m: raise ValueError(f'Unsupported formula: {formula}')
    def any_of(group):
        results=[]
        for term in group.split(','):
            t=re.fullmatch(r'([A-Z]+)(\d+)(>=|<=|>|<|=)(-?\d+(?:\.\d+)?)',term)
            if not t or int(t[2])!=row: raise ValueError(f'Unsupported condition: {term}')
            a=ws[f'{t[1]}{t[2]}'].value; b=float(t[4]); op=t[3]
            if not isinstance(a,(int,float)): raise ValueError('Non-numeric condition input')
            results.append({'>=':a>=b,'<=':a<=b,'>':a>b,'<':a<b,'=':a==b}[op])
        return any(results)
    return 'TRIP' if any_of(m[1]) else 'ALARM' if any_of(m[2]) else 'NORMAL'

def main():
    OUT.mkdir(exist_ok=True)
    existing_inventory = OUT/'source_inventory.json'
    if existing_inventory.is_file():
        for entry in json.loads(existing_inventory.read_text(encoding='utf-8')):
            original = ROOT/entry['path']
            if not original.is_file() or hashlib.sha256(original.read_bytes()).hexdigest() != entry['sha256']:
                raise ValueError(f"Source snapshot missing/changed; review before re-extraction: {entry['path']}")
    for category, ext, expected in [('production','.xlsx',5),('equipment','.xlsx',5),('rca','.pptx',5),('incidents','.xlsx',1),('explanation','.pptx',1)]:
        found=list((ROOT/'sources/baseline'/category).glob('*'+ext))
        if len(found)!=expected: raise ValueError(f'Incomplete source category {category}: {len(found)} vs {expected}')
    inventory=[]; books={}; presentations=[]; pdfs=[]
    for path in sorted((ROOT/'sources').rglob('*')):
        if not path.is_file(): continue
        entry={'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        if path.suffix=='.xlsx':
            wf=load_workbook(path,data_only=False); wc=load_workbook(path,data_only=True)
            sheets=[]
            for ws in wf:
                rows=[]; formulas=[]
                for row in ws:
                    rows.append([clean(c.value) for c in row])
                    for c in row:
                        if c.data_type=='f': formulas.append({'cell':c.coordinate,'formula':c.value,'cached':clean(wc[ws.title][c.coordinate].value)})
                sheets.append({'name':ws.title,'rows':ws.max_row,'columns':ws.max_column,'values':rows,'formulas':formulas})
            books[entry['path']]={'sheets':sheets}; entry['sheet_profiles']=[{'name':s['name'],'rows':s['rows'],'columns':s['columns'],'formula_count':len(s['formulas']),'missing_formula_caches':sum(x['cached'] is None for x in s['formulas'])} for s in sheets]
        elif path.suffix=='.pptx':
            slides=[]
            for i,slide in enumerate(Presentation(path).slides,1):
                blocks=[]
                for shape in slide.shapes:
                    if shape.has_text_frame and shape.text.strip(): blocks.append({'shape_id':shape.shape_id,'type':'text','text':shape.text})
                    if shape.has_table: blocks.append({'shape_id':shape.shape_id,'type':'table','rows':[[c.text for c in row.cells] for row in shape.table.rows]})
                slides.append({'slide':i,'blocks':blocks,'source':ref(path,slide=i)})
            presentations.append({'file':entry['path'],'slides':slides});entry['slide_count']=len(slides)
        elif path.suffix=='.pdf':
            reader=PdfReader(path); pages=[{'page':i,'text':p.extract_text() or ''} for i,p in enumerate(reader.pages,1)]
            pdfs.append({'file':entry['path'],'pages':pages});entry['page_count']=len(pages)
        inventory.append(entry)
    write('source_inventory.json',inventory);write('workbook_extraction.json',books)
    write('presentation_extraction.json',presentations);write('official_text.json',pdfs)

    ip=ROOT/'sources/baseline/incidents/Incident Database.xlsx'; w=load_workbook(ip,data_only=False)['Incident Database']
    headers=[c.value for c in w[3]]; incidents=[]
    for row in list(w.rows)[3:]:
        if row[0].value is None: continue
        incidents.append({'id':f'incident-row-{row[0].row}','values':dict(zip(headers,[clean(c.value) for c in row])),'source':ref(ip,w.title,f'A{row[0].row}:W{row[0].row}')})
    write('incidents.json',incidents)
    iv=[i['values'] for i in incidents]
    nums={k:money(r[k] for r in iv) for k in ['Downtime (hrs)','Act. Loss (k US$)','Pot. Loss (k US$)','Total Loss (k US$)']}
    reconciles=all(Decimal(str(r['Total Loss (k US$)'])) == Decimal(str(r['Act. Loss (k US$)'])) + Decimal(str(r['Pot. Loss (k US$)'])) for r in iv)
    if not reconciles:raise ValueError('Row-level total-loss reconciliation failed')
    def valid_ar(v): return v is not None and str(v).strip().lower() not in {'','n/a','na','-'}
    ar_counts=Counter(r['AR No.'] for r in iv if valid_ar(r['AR No.']))
    metrics={'computed_from_raw_not_dashboard_cache':True,'incident_count':len(iv),'incident_date_min':min(r['Date of Occur.'] for r in iv),'incident_date_max':max(r['Date of Occur.'] for r in iv),'plant_count':len(set(r['Plant'] for r in iv)),'unique_asset_tags':len(set(r['Tag Number'] for r in iv)),'missing_ar_count':sum(not valid_ar(r['AR No.']) for r in iv),'missing_ar_representation':dict(Counter(str(r['AR No.']) for r in iv if not valid_ar(r['AR No.']))),'duplicate_ar_identifiers':{k:v for k,v in ar_counts.items() if v>1},'register_status_counts':dict(Counter(r['Overall Status'] for r in iv)),**nums,'source':ref(ip,w.title,'A4:W383'),'row_total_loss_equals_actual_plus_potential':reconciles}
    assets=[]
    for p in sorted((ROOT/'sources/baseline/equipment').glob('*.xlsx')):
        wb=load_workbook(p,data_only=False); info=wb['Equipment Info']; ws=wb['Condition History']; summary=wb['Performance Summary']; tag=info['B4'].value
        conditions=[]
        for row in list(ws.rows)[1:]:
            n=row[0].row; status=condition_status(ws[f'G{n}'].value,ws,n)
            conditions.append({'row':n,'week':row[0].value,'date':row[1].value,'measurements':[c.value for c in row[2:6]],'status':status,'status_formula':ws[f'G{n}'].value,'remark':row[7].value,'source':ref(p,ws.title,f'A{n}:H{n}')})
        cached=load_workbook(p,data_only=True)['Condition History']
        for c in conditions:
            if cached[f'G{c["row"]}'].value not in (None,c['status']): raise ValueError(f'Health formula/cache disagreement {tag} row {c["row"]}')
        pp=ROOT/'sources/baseline/production'/p.name.replace('Equipment Performance','Production Data'); wp=load_workbook(pp,data_only=False); pr=wp['Sheet2']; ph=[c.value for c in pr[1]]
        production=[{'values':dict(zip(ph,[c.value for c in row])),'source':ref(pp,pr.title,f'A{row[0].row}:H{row[0].row}')} for row in list(pr.rows)[1:] if row[0].value]
        if len(production)!=720 or len(conditions)!=26: raise ValueError(f'Unexpected observation counts for {tag}')
        thresholds=[{'parameter':info[f'C{n}'].value,'limits_text':info[f'D{n}'].value,'source':ref(p,info.title,f'C{n}:D{n}')} for n in range(5,9)]
        ar=info['B13'].value
        event_date=datetime.strptime(info['B14'].value,'%d-%b-%Y').date().isoformat()
        linked=[i for i in incidents if i['values']['AR No.']==ar and i['values']['Tag Number']==tag and i['values']['Date of Occur.']==event_date and '('+i['values']['Plant']+')' in info['B8'].value]
        if len(linked)!=1: raise ValueError(f'Qualified AR/tag/plant/date join cardinality {tag}: {len(linked)}')
        reports=[d for d in presentations if '/rca/' in d['file'] and tag in d['file']]
        if len(reports)!=1 or len(reports[0]['slides'])!=11: raise ValueError(f'RCA report coverage {tag}')
        report_text=' '.join(b.get('text','')+' '.join(' '.join(map(str,row)) for row in b.get('rows',[])) for s in reports[0]['slides'] for b in s['blocks'])
        if ar not in report_text or tag not in report_text: raise ValueError(f'RCA identity mismatch {tag}')
        asset={'tag':tag,'name':info['B5'].value,'plant_text':info['B8'].value,'class':info['B7'].value,'criticality_source':info['B10'].value,'ar':ar,'failure_date_source':info['B14'].value,'info_source':ref(p,info.title,'A4:D15'),'thresholds':thresholds,'condition_headers':[c.value for c in ws[1]][2:6],'conditions':conditions,'production_metadata':[dict(zip([c.value for c in wp['PI Tag'][1]],[c.value for c in row])) for row in list(wp['PI Tag'].rows)[1:]],'production':production,'linked_incident_id':linked[0]['id'],'performance_source_values':[{'kpi':summary[f'A{n}'].value,'value_or_formula':summary[f'B{n}'].value,'basis':summary[f'C{n}'].value,'source':ref(p,summary.title,f'A{n}:C{n}')} for n in range(4,17)]}
        assets.append(asset)
    write('assets.json',assets)
    metrics['five_linked_examples']={'downtime_hours':money(a['values']['Downtime (hrs)'] for a in incidents[:5]),'actual_loss_k_usd':money(a['values']['Act. Loss (k US$)'] for a in incidents[:5]),'scope':'first five linked RCA incident rows only','source':ref(ip,w.title,'A4:W8')}
    metrics['asset_profiles']=[]
    for a in assets:
        trip_idx=next(i for i,c in enumerate(a['conditions']) if c['status']=='TRIP')
        metrics['asset_profiles'].append({'tag':a['tag'],'weekly_readings':len(a['conditions']),'hourly_records':len(a['production']),'production_first':a['production'][0]['values']['Timestamp'],'production_last':a['production'][-1]['values']['Timestamp'],'weekly_status_counts':dict(Counter(c['status'] for c in a['conditions'])),'alarm_readings_before_first_trip':sum(c['status']=='ALARM' for c in a['conditions'][:trip_idx]),'first_trip':a['conditions'][trip_idx],'unit_metadata':{x['Name']:x['engunits'] for x in a['production_metadata']},'source_info':a['info_source']})
    metrics['ko_22_apr']=next(c for a in assets if a['tag']=='KO-3201' for c in a['conditions'] if c['date']=='2026-04-22')
    write('verified_metrics.json',metrics)
    summary={'source_files':len(inventory),'baseline_data_files':16,'baseline_explanation_files':1,'official_pdfs':2,'meeting_note_files':1,'reference_files':2,'incident_count':metrics['incident_count'],'totals':nums,'asset_record_counts':[{k:x[k] for k in ['tag','weekly_readings','hourly_records','alarm_readings_before_first_trip']} for x in metrics['asset_profiles']]}
    print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
