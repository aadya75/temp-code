import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============= GitHub Routes (via Backend) =============

export const fetchRepoData = async (repoUrl) => {
  try {
    const response = await apiClient.post('/github/fetch-repo-data', { repo_url: repoUrl })
    return response.data
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Failed to fetch repository'
    }
  }
}

export const fetchRepoTree = async (repoUrl) => {
  try {
    const response = await apiClient.post('/github/fetch-repo-tree', { repo_url: repoUrl })
    return response.data
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Failed to fetch repository tree'
    }
  }
}

export const fetchAndUploadRepo = async (repoUrl) => {
  try {
    const response = await apiClient.post('/github/fetch-and-upload', { repo_url: repoUrl })
    return response.data
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Failed to fetch and upload repository'
    }
  }
}

// ============= Database Routes (via Backend) =============

export const saveAnalysis = async (userId, repoData, fileTree) => {
  try {
    const response = await apiClient.post('/github/save-analysis', {
      user_id: userId,
      repo_url: repoData.html_url,
      repo_name: repoData.name,
      full_name: repoData.full_name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
      file_tree: fileTree
    })
    return response.data
  } catch (error) {
    throw error.response?.data || error
  }
}

export const getAnalysisHistory = async (userId) => {
  try {
    const response = await apiClient.get(`/github/analysis-history/${userId}`)
    return response.data
  } catch (error) {
    throw error.response?.data || error
  }
}

export const getAnalysisById = async (analysisId) => {
  try {
    const response = await apiClient.get(`/github/analysis/${analysisId}`)
    return response.data
  } catch (error) {
    throw error.response?.data || error
  }
}

export const deleteAnalysis = async (analysisId) => {
  try {
    const response = await apiClient.delete(`/github/analysis/${analysisId}`)
    return response.data
  } catch (error) {
    throw error.response?.data || error
  }
}

export const saveKnowledgeGraph = async (repoId, graphData) => {
  try {
    const response = await apiClient.post('/github/save-knowledge-graph', {
      repo_id: repoId,
      graph_data: graphData,
      nodes_count: graphData.nodes?.length || 0,
      edges_count: graphData.edges?.length || 0
    })
    return response.data
  } catch (error) {
    throw error.response?.data || error
  }
}

export const getKnowledgeGraph = async (repoId) => {
  try {
    const response = await apiClient.get(`/github/knowledge-graph/${repoId}`)
    return response.data
  } catch (error) {
    throw error.response?.data || error
  }
}

// Helper function
export const validateGithubUrl = (url) => {
  const regex = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/
  return regex.test(url)
}