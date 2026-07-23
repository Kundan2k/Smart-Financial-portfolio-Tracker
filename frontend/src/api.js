import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, try to refresh once, then force logout
api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refresh })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (name, email, password) =>
    api.post('/auth/register', { name, email, password }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  logout: () =>
    api.post('/auth/logout'),
  me: () =>
    api.get('/auth/me'),
}

export default api

export const expensesApi = {
  list:   (params = {}) => api.get('/expenses/', { params }),
  get:    (id)          => api.get(`/expenses/${id}`),
  create: (body)        => api.post('/expenses/', body),
  update: (id, body)    => api.patch(`/expenses/${id}`, body),
  remove: (id)          => api.delete(`/expenses/${id}`),
}

export const analyticsApi = {
  dashboard: (year) => api.get('/analytics/dashboard', { params: year ? { year } : {} }),
}

export const investmentsApi = {
  list:   (params = {}) => api.get('/investments/', { params }),
  get:    (id)          => api.get(`/investments/${id}`),
  create: (body)        => api.post('/investments/', body),
  update: (id, body)    => api.patch(`/investments/${id}`, body),
  remove: (id)          => api.delete(`/investments/${id}`),
}

export const mlApi = {
  status:    ()     => api.get('/ml/status'),
  modelInfo: ()     => api.get('/ml/model-info'),
  predict:   (body) => api.post('/ml/predict', body),
}

export const fraudApi = {
  status:       ()             => api.get('/fraud/status'),
  modelInfo:    ()             => api.get('/fraud/model-info'),
  scanExpenses: (params = {})  => api.get('/fraud/scan-expenses', { params }),
  scan:         (txList)       => api.post('/fraud/scan', txList),
}