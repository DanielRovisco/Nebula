"use client";

import { useEffect } from "react";

/** Registers the service worker (push, offline page, offline favourites). Skipped in development to keep HMR predictable. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
