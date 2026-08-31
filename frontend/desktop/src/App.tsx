import { useEffect, useState } from 'react'
import { api } from './lib/api'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { InspectorApp } from './pages/inspector/InspectorApp';

type DbStatus = { status: string; mongodb: string }

function CommandCenter() {
  const [dbStatus, setDbStatus] = useState<DbStatus | 'loading' | 'unreachable'>('loading')

  useEffect(() => {
    api
      .get<DbStatus>('/health/db')
      .then((res) => setDbStatus(res.data))
      .catch(() => setDbStatus('unreachable'))
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        CoalGuard Command Center
      </h1>
      <p className="mt-4 max-w-md text-slate-400">
        Monitoring Dashboard (Placeholder)
      </p>
      <div className="mt-8 flex flex-col items-center gap-4">
        <Link to="/inspector" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors">
          Open Field Inspector App
        </Link>
      </div>
      <p className="mt-12 text-sm text-slate-500">
        Backend + MongoDB:{' '}
        {dbStatus === 'loading' && 'checking...'}
        {dbStatus === 'unreachable' && 'unreachable'}
        {typeof dbStatus === 'object' && dbStatus.mongodb}
      </p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/inspector" element={<InspectorApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
