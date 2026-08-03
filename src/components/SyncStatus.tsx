"use client";

import { useEffect, useState } from "react";
import { startAutoSync, syncEvents, getPendingCount, flushQueue } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

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
      <Badge variant="outline" className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Synced
      </Badge>
    );
  }

  return (
    <button
      onClick={() => void flushQueue().then((r) => setPending(r.remaining))}
      title="Click to retry syncing now"
    >
      <Badge variant="outline" className="gap-1.5 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 cursor-pointer">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {online ? "Online" : "Offline"}
        {pending > 0 ? ` · ${pending} pending` : ""}
      </Badge>
    </button>
  );
}
