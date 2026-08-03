"use client";

import { useEffect, useState } from "react";
import { startAutoSync, syncEvents, getPendingCount, flushQueue } from "@/lib/api-client";

export default function SyncStatus() {
  // Start "online" on both server and client's first render so hydration
  // matches; the real value (which only the browser knows) lands right
  // after mount via the effect below.
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to browser-only navigator.onLine post-mount
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onPendingChange = (e: Event) => setPending((e as CustomEvent<number>).detail);
    syncEvents.addEventListener("pending-change", onPendingChange);

    getPendingCount().then(setPending);
    const stop = startAutoSync();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      syncEvents.removeEventListener("pending-change", onPendingChange);
      stop?.();
    };
  }, []);

  if (online && pending === 0) {
    return (
      <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Synced
      </div>
    );
  }

  return (
    <button
      onClick={() => void flushQueue().then((r) => setPending(r.remaining))}
      className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-flex items-center gap-1.5 hover:bg-amber-100"
      title="Click to retry syncing now"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      {online ? "Online" : "Offline"}
      {pending > 0 ? ` · ${pending} pending sync` : ""}
    </button>
  );
}
