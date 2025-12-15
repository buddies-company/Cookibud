import { openDB } from 'idb';

const DB_NAME = 'offline-cache';

export async function saveDataToCache<T = unknown>(data: T, store_name: string) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(store_name);
    },
  });
  await db.put(store_name, data, 'all');
}

export async function getCachedData<T = unknown>(store_name: string): Promise<T | null> {
  const db = await openDB(DB_NAME, 1);
  return (await db.get(store_name, 'all')) as T | null;
}

export async function clearCache(store_name:string) {
  const db = await openDB(DB_NAME, 1);
  return db.clear(store_name);
}