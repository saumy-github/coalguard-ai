import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Field names match research/lld.md §4's Observation schema (description/pillar/
// photo_urls/voice_note_url/lat/lng), not the older mobile-split prototype's
// notes/category/severity/latitude/longitude shape.
export type Pillar = 'safety' | 'environment' | 'production' | 'labour'

export interface Observation {
  id?: number
  description: string
  pillar: Pillar
  photo_urls: string[]
  voice_note_url: string | null
  lat: number | null
  lng: number | null
  // Matches backend/src/schemas/inspections.py's ObservationIn.captured_at —
  // named for what it is (when the Worker captured this), not just "timestamp".
  captured_at: string
  synced: number // 0 = pending, 1 = synced
}

interface WorkerDB extends DBSchema {
  observations: {
    key: number
    value: Observation
    indexes: { 'by-synced': number }
  }
}

let dbPromise: Promise<IDBPDatabase<WorkerDB>>

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<WorkerDB>('coalguard-worker-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('observations', {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('by-synced', 'synced')
      },
    })
  }
  return dbPromise
}

export const addObservation = async (observation: Observation) => {
  const db = await initDB()
  return db.add('observations', observation)
}

export const getPendingObservations = async () => {
  const db = await initDB()
  return db.getAllFromIndex('observations', 'by-synced', 0)
}

export const markObservationSynced = async (id: number) => {
  const db = await initDB()
  const tx = db.transaction('observations', 'readwrite')
  const store = tx.objectStore('observations')
  const observation = await store.get(id)
  if (observation) {
    observation.synced = 1
    await store.put(observation)
  }
  await tx.done
}

export const getAllObservations = async () => {
  const db = await initDB()
  return db.getAll('observations')
}
