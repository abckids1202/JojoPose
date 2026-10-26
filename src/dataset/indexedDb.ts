import type { FeatureRecord } from './featureRecord'

const DB_NAME = 'jojo-pose-dataset'
const STORE = 'feature-records'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, VERSION); request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}
export async function addFeatureRecord(record: FeatureRecord): Promise<void> { const db = await openDb(); await new Promise<void>((resolve, reject) => { const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error) }); db.close() }
export async function getFeatureRecords(): Promise<FeatureRecord[]> { const db = await openDb(); const result = await new Promise<FeatureRecord[]>((resolve, reject) => { const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll(); request.onsuccess = () => resolve(request.result as FeatureRecord[]); request.onerror = () => reject(request.error) }); db.close(); return result }
export async function clearFeatureRecords(): Promise<void> { const db = await openDb(); await new Promise<void>((resolve, reject) => { const request = db.transaction(STORE, 'readwrite').objectStore(STORE).clear(); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error) }); db.close() }
