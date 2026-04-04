import axios from 'axios'

export const fetchRepoData = async (repoUrl) => {
  try {
    // Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      throw new Error('Invalid GitHub URL format')
    }
    
    const [, owner, repo] = match
    
    // Fetch repository data from GitHub API (no auth needed for public repos)
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`)
    
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch repository'
    }
  }
}

export const validateGithubUrl = (url) => {
  const regex = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/
  return regex.test(url)
}