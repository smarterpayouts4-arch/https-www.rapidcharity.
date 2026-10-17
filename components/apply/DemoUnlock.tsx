"use client";

import { useEffect } from "react";
import { syncDemoKeyFromUrl } from "@/lib/application/demoMode";

/**
 * Remembers (or forgets, with ?demo=off) the private sample-mode unlock on any
 * /apply URL, then removes the parameter from the address bar. Renders nothing.
 */
export function DemoUnlock() {
  useEffect(() => {
    syncDemoKeyFromUrl();
  }, []);
  return null;
}
