"use client";

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

let dbPromise: Promise<IDBPDatabase> | null = null;

function getIdb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
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
  return dbPromise;
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const db = await getIdb();
  return db.get("cache", key);
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  const db = await getIdb();
  await db.put("cache", value, key);
}

export async function queueMutation(item: Omit<QueueItem, "seq">): Promise<void> {
  const db = await getIdb();
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

export async function getQueue(): Promise<QueueItem[]> {
  const db = await getIdb();
  return (await db.getAll("syncQueue")) as QueueItem[];
}

export async function removeFromQueue(seq: number): Promise<void> {
  const db = await getIdb();
  await db.delete("syncQueue", seq);
}

export async function queueLength(): Promise<number> {
  const db = await getIdb();
  return db.count("syncQueue");
}
