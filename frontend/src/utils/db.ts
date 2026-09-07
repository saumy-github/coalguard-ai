import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Matches backend/src/routes/issues.py's POST /issues multipart contract —
// one photo (not an array), level/section (not lat/lng, per the checkpoint-
// location model in research/location-and-pwa-notes-7-sep.md).
export interface IssueReport {
  id?: number
  observation: string
  level: string
  section: number
  photo_data_url: string | null
  captured_at: string
  synced: number // 0 = pending, 1 = synced
}

interface WorkerDB extends DBSchema {
  issue_reports: {
    key: number
    value: IssueReport
    indexes: { 'by-synced': number }
  }
}

let dbPromise: Promise<IDBPDatabase<WorkerDB>>

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<WorkerDB>('coalguard-worker-db', 2, {
      upgrade(db, oldVersion) {
        // v1's `observations` store (Inspections) is gone — this whole
        // capture flow now feeds POST /issues instead. Cast needed since
        // 'observations' isn't part of the current (v2) typed schema.
        const legacyStoreName = 'observations' as unknown as 'issue_reports'
        if (oldVersion < 2 && db.objectStoreNames.contains(legacyStoreName)) {
          db.deleteObjectStore(legacyStoreName)
        }
        const store = db.createObjectStore('issue_reports', {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('by-synced', 'synced')
      },
    })
  }
  return dbPromise
}

export const addIssueReport = async (report: IssueReport) => {
  const db = await initDB()
  return db.add('issue_reports', report)
}

export const getPendingIssueReports = async () => {
  const db = await initDB()
  return db.getAllFromIndex('issue_reports', 'by-synced', 0)
}

export const markIssueReportSynced = async (id: number) => {
  const db = await initDB()
  const tx = db.transaction('issue_reports', 'readwrite')
  const store = tx.objectStore('issue_reports')
  const report = await store.get(id)
  if (report) {
    report.synced = 1
    await store.put(report)
  }
  await tx.done
}
