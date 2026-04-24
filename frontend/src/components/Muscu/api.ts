import axios from 'axios'

const api = axios.create({
  baseURL: '/api/muscu',
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('muscu_access')
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
      localStorage.getItem('muscu_refresh')
    ) {
      original._retry = true
      try {
        const res = await axios.post('/api/muscu/auth/refresh/', {
          refresh: localStorage.getItem('muscu_refresh'),
        })
        const { access } = res.data as { access: string }
        localStorage.setItem('muscu_access', access)
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      } catch {
        localStorage.removeItem('muscu_access')
        localStorage.removeItem('muscu_refresh')
        window.location.hash = '#/irlrpg/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
