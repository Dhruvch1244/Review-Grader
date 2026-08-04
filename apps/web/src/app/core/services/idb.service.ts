import { Injectable } from "@angular/core";
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "review-grader";
const DB_VERSION = 1;

interface QueueItem {
  seq?: number;
  dedupeKey: string;
  method: string;
  url: string;
  body: unknown;
  createdAt: string;
}

@Injectable({ providedIn: "root" })
export class IdbService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private getIdb() {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("cache")) {
            db.createObjectStore("cache");
          }
          if (!db.objectStoreNames.contains("syncQueue")) {
            db.createObjectStore("syncQueue", { keyPath: "seq", autoIncrement: true });
          }
        },
      });
    }
    return this.dbPromise;
  }

  async cacheGet<T>(key: string): Promise<T | undefined> {
    const db = await this.getIdb();
    return db.get("cache", key);
  }

  async cacheSet<T>(key: string, value: T): Promise<void> {
    const db = await this.getIdb();
    await db.put("cache", value, key);
  }

  async queueMutation(item: Omit<QueueItem, "seq">): Promise<void> {
    const db = await this.getIdb();
    const tx = db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");
    const all = (await store.getAll()) as QueueItem[];
    for (const existing of all) {
      if (existing.dedupeKey === item.dedupeKey && existing.seq !== undefined) {
        await store.delete(existing.seq);
      }
    }
    await store.add(item);
    await tx.done;
  }

  async getQueue(): Promise<QueueItem[]> {
    const db = await this.getIdb();
    return (await db.getAll("syncQueue")) as QueueItem[];
  }

  async removeFromQueue(seq: number): Promise<void> {
    const db = await this.getIdb();
    await db.delete("syncQueue", seq);
  }

  async queueLength(): Promise<number> {
    const db = await this.getIdb();
    return db.count("syncQueue");
  }
}
