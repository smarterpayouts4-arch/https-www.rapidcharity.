/**
 * Browser side of the private sample-mode unlock. Safe to import in client
 * components: it never contains the key itself, only remembers whatever the
 * `?demo=` parameter said and sends it to the server, which checks it
 * (see lib/application/mockGate.ts).
 */
/** Query parameter that unlocks (`?demo=<key>`) or locks (`?demo=off`) sample mode. */
export const DEMO_PARAM = "demo";
/** Value of DEMO_PARAM that turns sample mode off again in this browser. */
export const DEMO_OFF = "off";
/** Request header the browser uses to send the remembered key to the dev API routes. */
export const DEMO_HEADER = "x-rapid-demo";
/** localStorage key where the browser remembers the unlock. */
export const DEMO_STORAGE_KEY = "rapid-charity-demo";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reads `?demo=` from the current URL, remembers or forgets it, removes it from
 * the address bar, and returns the key now remembered ("" when none).
 */
export function syncDemoKeyFromUrl(): string {
  if (typeof window === "undefined") return "";
  const store = storage();
  const url = new URL(window.location.href);
  const value = url.searchParams.get(DEMO_PARAM);
  if (value !== null) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === DEMO_OFF) store?.removeItem(DEMO_STORAGE_KEY);
    else store?.setItem(DEMO_STORAGE_KEY, trimmed.slice(0, 64));
    url.searchParams.delete(DEMO_PARAM);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return store?.getItem(DEMO_STORAGE_KEY) ?? "";
}

export function rememberedDemoKey(): string {
  return storage()?.getItem(DEMO_STORAGE_KEY) ?? "";
}

export function forgetDemoKey(): void {
  storage()?.removeItem(DEMO_STORAGE_KEY);
}

/** Headers for the dev API routes; empty when sample mode was never unlocked here. */
export function demoHeaders(): Record<string, string> {
  const key = rememberedDemoKey();
  return key ? { [DEMO_HEADER]: key } : {};
}
