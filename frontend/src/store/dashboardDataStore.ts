import { create } from 'zustand'
import {
  OPERATING_MINES,
  LIVE_SENSORS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_TRAIL,
  INITIAL_INSPECTIONS,
  WORKER_TASKS,
  NOTIFICATIONS_DATA,
  type Ticket,
} from '../data/mockData'
import { useAuthStore } from './authStore'
import { useUIStore } from './uiStore'
import { displayName, userTypeLabel } from '../lib/userDisplay'

interface DashboardDataState {
  mines: typeof OPERATING_MINES
  sensors: typeof LIVE_SENSORS
  tickets: Ticket[]
  auditTrail: typeof INITIAL_AUDIT_TRAIL
  inspections: typeof INITIAL_INSPECTIONS
  workerTasks: typeof WORKER_TASKS
  notifications: typeof NOTIFICATIONS_DATA
  isHazardSimulated: boolean
  evacuationBroadcasted: boolean

  setNotifications: (updater: (prev: typeof NOTIFICATIONS_DATA) => typeof NOTIFICATIONS_DATA) => void
  addTicket: (ticketData: Partial<Ticket>, silent?: boolean) => Ticket
  resolveTicket: (ticketId: string, correctiveAction?: string, silent?: boolean) => void
  simulateHazard: (silent?: boolean) => void
  resetHazard: (silent?: boolean) => void
  broadcastEvacuation: (message?: string) => void
  markTaskComplete: (taskId: string) => void
}

export const useDashboardDataStore = create<DashboardDataState>()((set, get) => ({
  mines: OPERATING_MINES,
  sensors: LIVE_SENSORS,
  tickets: INITIAL_TICKETS,
  auditTrail: INITIAL_AUDIT_TRAIL,
  inspections: INITIAL_INSPECTIONS,
  workerTasks: WORKER_TASKS,
  notifications: NOTIFICATIONS_DATA,
  isHazardSimulated: false,
  evacuationBroadcasted: false,

  setNotifications: (updater) => set((state) => ({ notifications: updater(state.notifications) })),

  addTicket: (ticketData, silent = false) => {
    const user = useAuthStore.getState().user
    const newId = `TCK-2026-${Math.floor(1000 + Math.random() * 9000)}`
    const newTicket: Ticket = {
      id: newId,
      title: ticketData.title || 'Safety Issue Reported',
      description: ticketData.description || '',
      category: ticketData.category || 'General Safety',
      severity: ticketData.severity || 'medium',
      status: 'action_required',
      mineId: 'mine-01',
      mineName: 'Sector 7G Deep Coalfield',
      location: ticketData.location || 'Sub-Level -320m',
      reportedBy: ticketData.reportedBy || `${displayName(user)} (${userTypeLabel(user?.user_type)})`,
      assignedTo: 'Mine Safety Officer',
      createdAt: 'Just now',
      dgmsRegulationRef: ticketData.dgmsRegulationRef || 'CMR 2017 Safety Code',
      aiSuggestedAction:
        ticketData.aiSuggestedAction || 'Inspect the area and confirm safe conditions before resuming work.',
      ledgerHash: `REC-0x${Math.random().toString(16).substring(2, 12)}`,
    }

    set((state) => ({ tickets: [newTicket, ...state.tickets] }))

    const auditTrail = get().auditTrail
    const auditEntry = {
      blockNumber: auditTrail.length > 0 ? auditTrail[0].blockNumber + 1 : 5000,
      timestamp: 'Just now',
      action: 'Safety Ticket Created',
      actor: displayName(user),
      actorRole: userTypeLabel(user?.user_type),
      targetId: newId,
      details: `${newTicket.title} (${newTicket.location})`,
      verified: true,
    }
    set((state) => ({ auditTrail: [auditEntry, ...state.auditTrail] }))

    if (!silent) useUIStore.getState().addToast('warning', 'Safety Ticket Created', `Ticket ${newId} logged and assigned.`)
    return newTicket
  },

  resolveTicket: (ticketId, correctiveAction, silent = false) => {
    const user = useAuthStore.getState().user
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'resolved',
              resolvedAt: 'Just now',
              correctiveActionTaken: correctiveAction || 'Issue verified and resolved by safety officer.',
            }
          : t
      ),
    }))

    const auditTrail = get().auditTrail
    const auditEntry = {
      blockNumber: auditTrail[0]?.blockNumber ? auditTrail[0].blockNumber + 1 : 5001,
      timestamp: 'Just now',
      action: 'Safety Issue Resolved',
      actor: displayName(user),
      actorRole: userTypeLabel(user?.user_type),
      targetId: ticketId,
      details: correctiveAction || 'Safety condition restored to normal.',
      verified: true,
    }
    set((state) => ({ auditTrail: [auditEntry, ...state.auditTrail] }))

    if (!silent) useUIStore.getState().addToast('success', 'Issue Resolved', `Ticket ${ticketId} marked as resolved.`)
  },

  simulateHazard: (silent = false) => {
    set({ isHazardSimulated: true })
    set((state) => ({
      sensors: state.sensors.map((s) =>
        s.id === 'sns-01'
          ? { ...s, methaneLEL: 1.42, carbonMonoxidePPM: 42, status: 'critical', lastPing: 'Just now' }
          : s
      ),
    }))

    get().addTicket(
      {
        title: 'High Methane Level in Face 4B Return Incline',
        description:
          'Sensor SN-7G-CH4-04 recorded methane at 1.42% (limit: 1.25%). Immediate ventilation adjustment and evacuation alert recommended.',
        category: 'Gas Leakage',
        severity: 'critical',
        location: 'Shaft 3, Seam IV, Sub-Level -320m',
        reportedBy: 'Automatic Sensor Warning (SN-7G-CH4-04)',
        dgmsRegulationRef: 'CMR 2017 Regulation 169 (Gas Safety)',
        aiSuggestedAction:
          '1. Pause machinery power at Face 4B.\n2. Increase auxiliary fan booster.\n3. Move workers to Fresh Air Station.\n4. Take manual reading before restart.',
      },
      silent
    )

    if (!silent) useUIStore.getState().addToast('error', 'Safety Alert Triggered', 'High Methane level (1.42%) detected at Face 4B.')
  },

  resetHazard: (silent = false) => {
    set({ isHazardSimulated: false, evacuationBroadcasted: false })
    set((state) => ({
      sensors: state.sensors.map((s) =>
        s.id === 'sns-01'
          ? { ...s, methaneLEL: 0.42, carbonMonoxidePPM: 14, status: 'optimal', lastPing: 'Just now' }
          : s
      ),
    }))
    if (!silent) useUIStore.getState().addToast('success', 'Sensor Reset', 'Methane level back to normal (0.42%).')
  },

  broadcastEvacuation: (message) => {
    set({ evacuationBroadcasted: true })
    const notif = {
      id: 'notif_' + Date.now(),
      title: 'Emergency Evacuation Notice',
      message: message || 'All personnel in Face 4B: Move to Fresh Air Base at Crosscut 9 immediately.',
      time: 'Just now',
      type: 'warning',
      unread: true,
    }
    set((state) => ({ notifications: [notif, ...state.notifications] }))
    useUIStore.getState().addToast('warning', 'Evacuation Broadcast Sent', 'Audio-visual alert sent to 14 workers in Face 4B.')
  },

  markTaskComplete: (taskId) => {
    set((state) => ({
      workerTasks: state.workerTasks.map((task) => (task.id === taskId ? { ...task, status: 'completed' } : task)),
    }))
    useUIStore.getState().addToast('success', 'Task Completed', 'Inspection item marked as complete.')
  },
}))
