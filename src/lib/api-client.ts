"use client";

import { cacheGet, cacheSet, queueMutation, getQueue, removeFromQueue, queueLength } from "./idb";

export const syncEvents = new EventTarget();

async function notify() {
  const n = await queueLength();
  syncEvents.dispatchEvent(new CustomEvent("pending-change", { detail: n }));
}

/** GET with an offline fallback to the last cached response for this URL. */
export async function apiGet<T>(url: string): Promise<T | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    const data = (await res.json()) as T;
    await cacheSet(url, data);
    return data;
  } catch {
    return cacheGet<T>(url);
  }
}

/**
 * Write (POST/PUT/PATCH) that applies optimistically and, if the network
 * call fails, queues the mutation for later sync. Because every write
 * endpoint on the server is an unconditional upsert, a queued mutation
 * replayed later always overrides whatever is currently on the server -
 * i.e. offline edits win once they sync.
 */
export async function apiWrite<T>(
  method: "POST" | "PUT" | "PATCH",
  url: string,
  body: unknown,
  dedupeKey?: string
): Promise<T> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
    return (await res.json()) as T;
  } catch {
    await queueMutation({
      dedupeKey: dedupeKey ?? `${method} ${url}`,
      method,
      url,
      body,
      createdAt: new Date().toISOString(),
    });
    await notify();
    return body as T;
  }
}

export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { flushed: 0, remaining: await queueLength() };
  }
  const queue = await getQueue();
  let flushed = 0;
  for (const item of queue.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (!res.ok) throw new Error(`sync failed: ${res.status}`);
      if (item.seq !== undefined) await removeFromQueue(item.seq);
      flushed++;
    } catch {
      break; // stop on first failure, retry later
    }
  }
  await notify();
  return { flushed, remaining: await queueLength() };
}

export function startAutoSync() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => void flushQueue());
  const interval = setInterval(() => void flushQueue(), 15000);
  void flushQueue();
  return () => {
    clearInterval(interval);
    window.removeEventListener("online", () => void flushQueue());
  };
}

export async function getPendingCount(): Promise<number> {
  return queueLength();
}
