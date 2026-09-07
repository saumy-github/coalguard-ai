import axios from 'axios'

// Backend routes mount at root (no /api prefix) — see backend/src/main.py.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  // Without this, a slow/stuck request (e.g. a large base64 photo in an
  // offline-queue sync, on a throttled connection) hangs forever with no
  // feedback — axios has no default timeout. 30s is generous for JSON but
  // not infinite.
  timeout: 30000,
})

// Attach the JWT from the auth store to every request. Imported lazily inside
// the interceptor (not at module scope) to avoid a circular import — authStore
// itself imports `api` from this file.
api.interceptors.request.use(async (config) => {
  const { useAuthStore } = await import('../store/authStore')
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// A 401 on regular routes means the token is invalid/expired — clear the session
// so the route guard redirects to /login.
// EXCEPTION: Attendance verification rejections should NEVER log the user out!
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAttendanceCall = error?.config?.url?.includes('/attendance')
    if (error?.response?.status === 401 && !isAttendanceCall) {
      const { useAuthStore } = await import('../store/authStore')
      useAuthStore.setState({ token: null, user: null })
    }
    return Promise.reject(error)
  }
)

