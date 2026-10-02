import { catalog } from "@/lib/data";
import { Hub } from "@/components/hub";
export default function Page() {
  return <Hub catalog={catalog()} />;
}
