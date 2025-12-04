import { openDB } from 'idb';

const DB_NAME = 'offline-cache';

export async function saveDataToCache(data: any[], store_name:string) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(store_name);
    },
  });
  await db.put(store_name, data, 'all');
}

export async function getCachedData(store_name:string): Promise<any[] | null> {
  const db = await openDB(DB_NAME, 1);
  return db.get(store_name, 'all');
}

export async function clearCache(store_name:string) {
  const db = await openDB(DB_NAME, 1);
  return db.clear(store_name);
}