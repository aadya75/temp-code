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

export const fetchRepoTree = async (repoUrl, path = '') => {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      throw new Error('Invalid GitHub URL format')
    }
    
    const [, owner, repo] = match
    
    const repoResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`)
    const defaultBranch = repoResponse.data.default_branch
    
    const treeResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
    )
    
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

// NEW: Fetch specific lines from a file
export const fetchFileLines = async (repoUrl, filePath, startLine, endLine) => {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      throw new Error('Invalid GitHub URL format')
    }
    
    const [, owner, repo] = match
    
    // Fetch the raw file content
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { 
        headers: { 
          'Accept': 'application/vnd.github.v3.raw'
        } 
      }
    )
    
    const content = typeof response.data === 'string' ? response.data : ''
    const lines = content.split('\n')
    
    // Extract specific lines (adjust for 0-index)
    const startIdx = Math.max(0, startLine - 1)
    const endIdx = Math.min(lines.length, endLine)
    const selectedLines = lines.slice(startIdx, endIdx)
    
    return {
      success: true,
      data: {
        content: selectedLines.join('\n'),
        totalLines: lines.length,
        startLine,
        endLine: Math.min(endLine, lines.length)
      }
    }
  } catch (error) {
    console.error('Failed to fetch file lines:', error)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

// Build tree structure from flat list
export const buildFileTree = (files) => {
  const root = {}
  
  files.forEach(file => {
    if (!file || !file.path) return
    
    const parts = file.path.split('/')
    let currentLevel = root
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        if (file.type === 'blob') {
          currentLevel[part] = {
            name: part,
            type: 'file',
            path: file.path,
            size: file.size || 0
          }
        } else if (file.type === 'tree') {
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