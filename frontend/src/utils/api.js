import axios from 'axios'

const api = axios.create({
  baseURL: 'https://pathaegis-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pathaegis_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pathaegis_token')
      localStorage.removeItem('pathaegis_user')
      window.location.href = '/login'
    }

    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (data) => api.post('/register', data),
  login: (data) => api.post('/login', data),
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
}

export const roadAPI = {
  getPotholes: (params) => api.get('/potholes', { params }),
  getStats: () => api.get('/stats'),
  reportPothole: (data) => api.post('/pothole', data),
}

export default api
