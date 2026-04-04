import axios from 'axios'

export const fetchRepoData = async (repoUrl) => {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      throw new Error('Invalid GitHub URL format')
    }
    
    const [, owner, repo] = match
    
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

// Fetch repository file tree
export const fetchRepoTree = async (repoUrl) => {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      throw new Error('Invalid GitHub URL format')
    }
    
    const [, owner, repo] = match
    
    // First get the default branch
    const repoResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`)
    const defaultBranch = repoResponse.data.default_branch
    
    // Get the tree recursively
    const treeResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
    )
    
    // Filter out only files (blobs) and directories (trees)
    const tree = treeResponse.data.tree.filter(item => 
      item.type === 'blob' || item.type === 'tree'
    )
    
    return {
      success: true,
      data: tree
    }
  } catch (error) {
    console.error('Tree fetch error:', error)
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch repository tree'
    }
  }
}

// Build tree structure from flat list - FIXED VERSION
export const buildFileTree = (files) => {
  const root = {}
  
  files.forEach(file => {
    // Skip if path is undefined or null
    if (!file || !file.path) return
    
    const parts = file.path.split('/')
    let currentLevel = root
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // This is a file (blob)
        if (file.type === 'blob') {
          currentLevel[part] = {
            name: part,
            type: 'file',
            path: file.path,
            size: file.size || 0
          }
        } else if (file.type === 'tree') {
          // This is a directory
          if (!currentLevel[part]) {
            currentLevel[part] = {
              name: part,
              type: 'directory',
              path: parts.slice(0, index + 1).join('/'),
              children: {}
            }
          }
        }
      } else {
        // This is a directory in the path
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            type: 'directory',
            path: parts.slice(0, index + 1).join('/'),
            children: {}
          }
        }
        currentLevel = currentLevel[part].children
      }
    })
  })
  
  return root
}

// Convert tree object to array for rendering - FIXED VERSION
export const treeToArray = (treeObj) => {
  if (!treeObj) return []
  
  return Object.keys(treeObj).map(key => {
    const item = treeObj[key]
    if (item.type === 'directory') {
      return {
        ...item,
        children: treeToArray(item.children)
      }
    }
    return item
  })
}

export const validateGithubUrl = (url) => {
  const regex = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/
  return regex.test(url)
}