import { useEffect, useState } from 'react'
import { api } from './lib/api'

type DbStatus = { status: string; mongodb: string }

function App() {
  const [dbStatus, setDbStatus] = useState<DbStatus | 'loading' | 'unreachable'>(
    'loading',
  )

  useEffect(() => {
    api
      .get<DbStatus>('/health/db')
      .then((res) => setDbStatus(res.data))
      .catch(() => setDbStatus('unreachable'))
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        CoalGuard
      </h1>
      <p className="mt-4 max-w-md text-slate-400">
        Vite + React + TypeScript + Tailwind CSS, ready to deploy on Vercel.
      </p>
      <p className="mt-6 text-sm text-slate-500">
        Backend + MongoDB:{' '}
        {dbStatus === 'loading' && 'checking...'}
        {dbStatus === 'unreachable' && 'unreachable'}
        {typeof dbStatus === 'object' && dbStatus.mongodb}
      </p>
    </div>
  )
}

export default App
