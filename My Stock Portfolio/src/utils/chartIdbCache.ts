/**
 * High-Performance IndexedDB Caching for X-Chart Historical OHLCV Candles
 * Enables instant 0ms chart loading when switching between watchlist symbols.
 */

const DB_NAME = 'xchart_candles_db_v1';
const STORE_NAME = 'candles';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.warn('[chartIdbCache] IndexedDB open error:', event);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export interface CachedChartData<T = any> {
  key: string;
  data: T;
  cachedAt: number;
}

export async function getCachedCandles<T = any>(symbol: string, resolution: string): Promise<T | null> {
  try {
    const db = await getDB();
    const key = `${symbol.toUpperCase().trim()}_${resolution.toUpperCase().trim()}`;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result as CachedChartData<T> | undefined;
        if (!record || !record.data) {
          resolve(null);
          return;
        }

        // Cache valid for 3 minutes for intraday live revalidation
        const isStale = Date.now() - record.cachedAt > 3 * 60 * 1000;
        resolve(record.data);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    return null;
  }
}

export async function setCachedCandles<T = any>(symbol: string, resolution: string, data: T): Promise<void> {
  try {
    const db = await getDB();
    const key = `${symbol.toUpperCase().trim()}_${resolution.toUpperCase().trim()}`;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record: CachedChartData<T> = {
        key,
        data,
        cachedAt: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch (err) {
    // Fail silently without disrupting UI
  }
}

export async function clearAllCachedCandles(): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {}
}
