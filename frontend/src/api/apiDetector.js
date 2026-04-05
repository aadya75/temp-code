import axios from 'axios'

// Cache for fetched files to avoid duplicate API calls
const fileCache = new Map()

// Main function to detect API endpoints
export const detectApiEndpoints = async (repoUrl, fileTree) => {
  const endpoints = []
  
  // First, try to detect framework by looking at files
  let framework = await detectFramework(repoUrl, fileTree)
  
  console.log('Detected framework:', framework)
  
  // Detect endpoints based on framework
  switch (framework) {
    case 'fastapi':
      const fastapiEndpoints = await detectFastAPIEndpoints(repoUrl, fileTree)
      endpoints.push(...fastapiEndpoints)
      break
    case 'express':
      const expressEndpoints = await detectExpressEndpoints(repoUrl, fileTree)
      endpoints.push(...expressEndpoints)
      break
    case 'django':
      const djangoEndpoints = await detectDjangoEndpoints(repoUrl, fileTree)
      endpoints.push(...djangoEndpoints)
      break
    case 'flask':
      const flaskEndpoints = await detectFlaskEndpoints(repoUrl, fileTree)
      endpoints.push(...flaskEndpoints)
      break
    case 'spring':
      const springEndpoints = await detectSpringEndpoints(repoUrl, fileTree)
      endpoints.push(...springEndpoints)
      break
    default:
      // Try generic detection
      const genericEndpoints = await detectGenericEndpoints(repoUrl, fileTree)
      endpoints.push(...genericEndpoints)
  }
  
  return { framework, endpoints }
}

// Analyze call flow for an endpoint
export const analyzeApiFlow = async (repoUrl, endpoint, fileTree) => {
  const flow = []
  
  if (!endpoint.controller_file || endpoint.controller === 'unknown') {
    return flow
  }
  
  const fileContent = await fetchFileContent(repoUrl, endpoint.controller_file)
  
  if (!fileContent) {
    return flow
  }
  
  // Find the function implementation
  const functionPattern = new RegExp(
    `def\\s+${endpoint.controller}\\s*\\([^)]*\\)[^:]*:\\s*([\\s\\S]*?)(?=\\n\\S|\\n\\n|$)`, 'i'
  )
  
  const match = fileContent.match(functionPattern)
  
  if (match) {
    const functionBody = match[1]
    
    // Detect service calls
    const serviceCalls = functionBody.match(/(\w+Service)\.(\w+)/g)
    if (serviceCalls) {
      serviceCalls.forEach((call, idx) => {
        flow.push({
          flow_order: idx + 1,
          step_type: 'service',
          step_name: call,
          file_path: endpoint.controller_file,
          called_by: endpoint.controller
        })
      })
    }
    
    // Detect database calls
    const dbCalls = functionBody.match(/(\w+Repository|\w+Model|\w+DAO)\.(\w+)/g)
    if (dbCalls) {
      dbCalls.forEach((call, idx) => {
        flow.push({
          flow_order: flow.length + idx + 1,
          step_type: 'repository',
          step_name: call,
          file_path: endpoint.controller_file,
          called_by: endpoint.controller
        })
      })
    }
  }
  
  return flow
}

// Detect framework by examining files
const detectFramework = async (repoUrl, fileTree) => {
  // Look for requirements.txt or pyproject.toml
  const requirementsFile = findFile(fileTree, 'requirements.txt')
  const pyprojectFile = findFile(fileTree, 'pyproject.toml')
  
  if (requirementsFile) {
    const content = await fetchFileContent(repoUrl, requirementsFile.path)
    if (content && content.toLowerCase().includes('fastapi')) {
      return 'fastapi'
    }
    if (content && content.toLowerCase().includes('django')) {
      return 'django'
    }
    if (content && content.toLowerCase().includes('flask')) {
      return 'flask'
    }
  }
  
  if (pyprojectFile) {
    const content = await fetchFileContent(repoUrl, pyprojectFile.path)
    if (content && content.toLowerCase().includes('fastapi')) {
      return 'fastapi'
    }
  }
  
  // Look for main.py or app.py files with FastAPI patterns
  const pythonFiles = findRelevantFiles(fileTree, ['.py'])
  
  for (const file of pythonFiles.slice(0, 10)) {
    const content = await fetchFileContent(repoUrl, file.path)
    
    if (content) {
      if (content.includes('from fastapi import') || content.includes('FastAPI()')) {
        return 'fastapi'
      }
      if (content.includes('django.urls') || content.includes('urlpatterns')) {
        return 'django'
      }
      if (content.includes('from flask import') || content.includes('Flask(__name__)')) {
        return 'flask'
      }
    }
  }
  
  return 'unknown'
}

// FASTAPI DETECTION
const detectFastAPIEndpoints = async (repoUrl, fileTree) => {
  const endpoints = []
  
  // Only scan Python files that might contain routes
  const pythonFiles = findRelevantFiles(fileTree, ['.py'])
  
  console.log(`Scanning ${pythonFiles.length} Python files for FastAPI endpoints`)
  
  for (const file of pythonFiles) {
    const content = await fetchFileContent(repoUrl, file.path)
    
    if (!content || (!content.includes('FastAPI') && !content.includes('@app.') && !content.includes('@router.'))) {
      continue
    }
    
    console.log(`Scanning ${file.path} for FastAPI routes...`)
    
    // Pattern matching for routes
    const routePattern = /@(?:app|router)\.(get|post|put|delete|patch|options|head)\(\s*['"]([^'"]+)['"]/gi
    
    let match
    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1].toUpperCase()
      const path = match[2].startsWith('/') ? match[2] : '/' + match[2]
      
      // Find function name
      const afterMatch = content.slice(match.index + match[0].length)
      const funcMatch = afterMatch.match(/async\s+def\s+(\w+)|def\s+(\w+)/)
      const functionName = funcMatch ? (funcMatch[1] || funcMatch[2]) : 'handler'
      
      endpoints.push({
        method: method,
        path: path,
        controller: functionName,
        controller_file: file.path,
        line_number: getLineNumber(content, match.index),
        middleware: [],
        framework: 'fastapi'
      })
      
      console.log(`Found FastAPI endpoint: ${method} ${path} -> ${functionName}`)
    }
  }
  
  console.log(`Total FastAPI endpoints found: ${endpoints.length}`)
  return endpoints
}

// Helper function to find relevant files (skip tests, caches, etc.)
const findRelevantFiles = (tree, extensions) => {
  const results = []
  
  const search = (items) => {
    if (!items || !Array.isArray(items)) return
    
    for (const item of items) {
      // Skip test files, __pycache__, node_modules, etc.
      if (item.path && (
        item.path.includes('__pycache__') ||
        item.path.includes('node_modules') ||
        item.path.includes('test_') ||
        item.path.includes('.venv') ||
        item.path.includes('venv') ||
        item.path.includes('dist') ||
        item.path.includes('build')
      )) {
        continue
      }
      
      if (item.type === 'file' && extensions.some(ext => item.name.endsWith(ext))) {
        results.push(item)
      }
      if (item.type === 'directory' && item.children) {
        search(item.children)
      }
    }
  }
  
  search(tree)
  return results.slice(0, 50)
}

// Find a single file
const findFile = (tree, filename) => {
  if (!tree || !Array.isArray(tree)) return null
  
  for (const item of tree) {
    if (item.type === 'file' && item.name === filename) {
      return item
    }
    if (item.type === 'directory' && item.children) {
      const found = findFile(item.children, filename)
      if (found) return found
    }
  }
  return null
}

// Fetch file content with caching
const fetchFileContent = async (repoUrl, filePath) => {
  // Check cache first
  const cacheKey = `${repoUrl}|${filePath}`
  if (fileCache.has(cacheKey)) {
    console.log(`Cache hit: ${filePath}`)
    return fileCache.get(cacheKey)
  }
  
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) return ''
    
    const [, owner, repo] = match
    
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { 
        headers: { 
          'Accept': 'application/vnd.github.v3.raw'
        } 
      }
    )
    
    const content = typeof response.data === 'string' ? response.data : ''
    
    // Cache the result (with 5 minute TTL)
    fileCache.set(cacheKey, content)
    setTimeout(() => fileCache.delete(cacheKey), 5 * 60 * 1000)
    
    return content
  } catch (error) {
    if (error.response?.status === 403) {
      console.warn(`Rate limited or access denied for ${filePath}. Skipping...`)
    } else {
      console.error(`Failed to fetch ${filePath}:`, error.message)
    }
    return ''
  }
}

// Get line number from position
const getLineNumber = (content, position) => {
  return content.slice(0, position).split('\n').length
}

// Express detection (simplified)
const detectExpressEndpoints = async (repoUrl, fileTree) => {
  const endpoints = []
  return endpoints
}

// Django detection (simplified)
const detectDjangoEndpoints = async (repoUrl, fileTree) => {
  const endpoints = []
  return endpoints
}

// Flask detection (simplified)
const detectFlaskEndpoints = async (repoUrl, fileTree) => {
  const endpoints = []
  return endpoints
}

// Spring detection (simplified)
const detectSpringEndpoints = async (repoUrl, fileTree) => {
  const endpoints = []
  return endpoints
}

// Generic detection (simplified)
const detectGenericEndpoints = async (repoUrl, fileTree) => {
  const endpoints = []
  return endpoints
}