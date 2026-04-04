import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
    console.error('API Error:', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

// ============= Authentication Functions =============

export const signUp = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/signup', { email, password })
    if (response.data.success && response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('refresh_token', response.data.refresh_token)
    }
    return response.data
  } catch (error) {
    console.error('Signup API error:', error)
    throw {
      success: false,
      error: error.response?.data?.error || error.message || 'Signup failed'
    }
  }
}

export const signIn = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/signin', { email, password })
    if (response.data.success && response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('refresh_token', response.data.refresh_token)
    }
    return response.data
  } catch (error) {
    console.error('Signin API error:', error)
    throw {
      success: false,
      error: error.response?.data?.error || error.message || 'Signin failed'
    }
  }
}

export const signOut = async () => {
  try {
    const token = localStorage.getItem('access_token')
    if (token) {
      await apiClient.post('/auth/signout')
    }
  } catch (error) {
    console.error('Signout error:', error)
  } finally {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}

export const getSession = async () => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) {
      return { success: false, user: null }
    }
    const response = await apiClient.get('/auth/session')
    return response.data
  } catch (error) {
    console.error('Get session error:', error)
    return { success: false, user: null }
  }
}

// ============= GitHub Functions =============

export const fetchRepoData = async (repoUrl) => {
  try {
    const response = await apiClient.post('/github/fetch-repo-data', { repo_url: repoUrl })
    return response.data
  } catch (error) {
    console.error('Fetch repo error:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch repository'
    }
  }
}

export const fetchRepoTree = async (repoUrl) => {
  try {
    const response = await apiClient.post('/github/fetch-repo-tree', { repo_url: repoUrl })
    return response.data
  } catch (error) {
    console.error('Fetch tree error:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch tree'
    }
  }
}

export const getAnalysisHistory = async (userId) => {
  const token = localStorage.getItem('access_token')
  if (!token) {
    return { success: false, data: [], error: 'Not authenticated' }
  }
  
  try {
    const response = await apiClient.get(`/github/analysis-history/${userId}`)
    return response.data
  } catch (error) {
    console.error('Get analysis history error:', error)
    return { success: false, data: [], error: error.message }
  }
}

export const validateGithubUrl = (url) => {
  const regex = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/
  return regex.test(url)
}