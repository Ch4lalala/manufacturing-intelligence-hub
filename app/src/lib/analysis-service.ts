import type { Bundle } from "./types";
import { analyze, replay } from "./analysis";
import {
  authorizeLive,
  liveStore,
  type LiveConfig,
  type LiveStore,
} from "./live-access";
export async function guardedAnalysis(
  request: Request,
  bundle: Bundle,
  live: boolean,
  access: LiveConfig,
  provider: { key?: string; model?: string; base?: string },
  fetcher: typeof fetch = fetch,
  limiter: LiveStore = liveStore(access),
) {
  if (!live) return { status: 200, analysis: replay(bundle) };
  const auth = await authorizeLive(request, access, limiter);
  if (!auth.ok)
    return {
      status: auth.status,
      analysis: replay(
        bundle,
        "Evidence replay - no live AI call. " + auth.reason,
        "blocked",
      ),
    };
  if (!provider.key || !provider.model)
    return {
      status: 200,
      analysis: replay(
        bundle,
        "Evidence replay - no live AI call. Live API NOT TESTED: server key/model missing.",
        "blocked",
      ),
    };
  if (replay(bundle).signals.state !== "anomaly")
    return {
      status: 200,
      analysis: replay(
        bundle,
        "Evidence replay - no live AI call. Insufficient anomaly evidence.",
        "not_requested",
      ),
    };
  let quota;
  try {
    quota = await limiter.acquire(access, undefined, auth.id);
  } catch {
    return {
      status: 503,
      analysis: replay(
        bundle,
        "Evidence replay - no live AI call. Shared live access store is unavailable.",
        "blocked",
      ),
    };
  }
  if (!quota.ok)
    return {
      status: quota.status,
      analysis: replay(
        bundle,
        "Evidence replay - no live AI call. " + quota.reason,
        "blocked",
      ),
    };
  try {
    return {
      status: 200,
      analysis: await analyze(bundle, true, provider, fetcher, request.signal),
    };
  } finally {
    // A crashed instance or failed release retains a conservative slot for at
    // most sixty seconds. It never refunds an attempted provider call.
    try {
      await quota.release();
    } catch {
      /* Redis lease expiry recovers the slot. */
    }
  }
}
