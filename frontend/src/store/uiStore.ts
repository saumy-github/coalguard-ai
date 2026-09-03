import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message?: string
}

interface UIState {
  isSidebarOpen: boolean
  isSearchOpen: boolean
  isNotificationsOpen: boolean
  isOfflineMode: boolean
  activeSubTab: string
  toasts: Toast[]

  setIsSidebarOpen: (value: boolean) => void
  toggleSidebar: () => void
  setSearchOpen: (value: boolean) => void
  setNotificationsOpen: (value: boolean) => void
  setIsOfflineMode: (value: boolean) => void
  setActiveSubTab: (tab: string) => void
  addToast: (type: Toast['type'], title: string, message?: string) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>()((set, get) => ({
  isSidebarOpen: false,
  isSearchOpen: false,
  isNotificationsOpen: false,
  isOfflineMode: false,
  activeSubTab: 'overview',
  toasts: [],

  setIsSidebarOpen: (value) => set({ isSidebarOpen: value }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSearchOpen: (value) => set({ isSearchOpen: value }),
  setNotificationsOpen: (value) => set({ isNotificationsOpen: value }),
  setIsOfflineMode: (value) => set({ isOfflineMode: value }),
  setActiveSubTab: (tab) => set({ activeSubTab: tab }),

  addToast: (type, title, message) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9)
    set((state) => ({ toasts: [...state.toasts, { id, type, title, message }] }))
    setTimeout(() => get().removeToast(id), 4500)
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
