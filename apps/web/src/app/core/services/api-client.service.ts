import { Injectable, signal } from "@angular/core";
import { IdbService } from "./idb.service";

@Injectable({ providedIn: "root" })
export class ApiClientService {
  /** Pending sync-queue count, read directly by SyncStatusComponent - the
   * signal-based equivalent of the old EventTarget("pending-change") pub/sub. */
  readonly pendingCount = signal(0);

  private autoSyncStarted = false;

  constructor(private idb: IdbService) {}

  private async notify() {
    this.pendingCount.set(await this.idb.queueLength());
  }

  /** GET with an offline fallback to the last cached response for this URL. */
  async apiGet<T>(url: string): Promise<T | undefined> {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
      const data = (await res.json()) as T;
      await this.idb.cacheSet(url, data);
      return data;
    } catch {
      return this.idb.cacheGet<T>(url);
    }
  }

  /**
   * Write (POST/PUT/PATCH/DELETE) that applies optimistically and, if the
   * network call fails, queues the mutation for later sync. Because every
   * write endpoint on the server is an unconditional upsert, a queued
   * mutation replayed later always overrides whatever is currently on the
   * server - i.e. offline edits win once they sync.
   */
  async apiWrite<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", url: string, body?: unknown, dedupeKey?: string): Promise<T> {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
      return (await res.json()) as T;
    } catch {
      await this.idb.queueMutation({
        dedupeKey: dedupeKey ?? `${method} ${url}`,
        method,
        url,
        body,
        createdAt: new Date().toISOString(),
      });
      await this.notify();
      return body as T;
    }
  }

  async flushQueue(): Promise<{ flushed: number; remaining: number }> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { flushed: 0, remaining: await this.idb.queueLength() };
    }
    const queue = await this.idb.getQueue();
    let flushed = 0;
    // Sequential on purpose, not Promise.all: this is what makes
    // "offline edits always win" hold - stop on the first failure and
    // retry later rather than replaying out of order.
    for (const item of queue.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.body),
        });
        if (!res.ok) throw new Error(`sync failed: ${res.status}`);
        if (item.seq !== undefined) await this.idb.removeFromQueue(item.seq);
        flushed++;
      } catch {
        break;
      }
    }
    await this.notify();
    return { flushed, remaining: await this.idb.queueLength() };
  }

  startAutoSync() {
    if (this.autoSyncStarted || typeof window === "undefined") return;
    this.autoSyncStarted = true;
    window.addEventListener("online", () => void this.flushQueue());
    setInterval(() => void this.flushQueue(), 15000);
    void this.flushQueue();
  }

  async getPendingCount(): Promise<number> {
    return this.idb.queueLength();
  }
}
