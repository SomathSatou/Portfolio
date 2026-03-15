import axios from 'axios'

const api = axios.create({
  baseURL: '/api/jdr',
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jdr_access')
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
      localStorage.getItem('jdr_refresh')
    ) {
      original._retry = true
      try {
        const res = await axios.post('/api/jdr/auth/refresh/', {
          refresh: localStorage.getItem('jdr_refresh'),
        })
        const { access } = res.data as { access: string }
        localStorage.setItem('jdr_access', access)
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      } catch {
        localStorage.removeItem('jdr_access')
        localStorage.removeItem('jdr_refresh')
        window.location.hash = '#/jdr/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
