import axios from 'axios'

const api = axios.create({
  baseURL: '/api/jdr',
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_access')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (
      error.response?.status === 401 &&
      !original._retry &&
      localStorage.getItem('auth_refresh')
    ) {
      original._retry = true
      try {
        const res = await axios.post('/api/auth/refresh/', {
          refresh: localStorage.getItem('auth_refresh'),
        })
        const { access } = res.data as { access: string }
        localStorage.setItem('auth_access', access)
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      } catch {
        localStorage.removeItem('auth_access')
        localStorage.removeItem('auth_refresh')
        window.location.hash = '#/jdr/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
