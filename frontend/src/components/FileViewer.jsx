import { useState, useEffect } from 'react'
import axios from 'axios'
import './FileViewer.css'

const FileViewer = ({ file, repoUrl }) => {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (file && repoUrl) {
      fetchFileContent()
    }
  }, [file, repoUrl])

  const fetchFileContent = async () => {
    setLoading(true)
    setError('')
    
    try {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
      if (!match) throw new Error('Invalid repo URL')
      
      const [, owner, repo] = match
      
      // Get file content from GitHub API
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`
      )
      
      // Decode base64 content
      const decodedContent = atob(response.data.content)
      setContent(decodedContent)
    } catch (err) {
      setError('Failed to load file content')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getLanguageFromFilename = (filename) => {
    const ext = filename.split('.').pop()
    const languages = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      css: 'css',
      html: 'html',
      json: 'json',
      md: 'markdown',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby'
    }
    return languages[ext] || 'plaintext'
  }

  return (
    <div className="file-viewer">
      <div className="file-viewer-header">
        <div className="file-info">
          <span className="file-icon-viewer">{getLanguageFromFilename(file.name)}</span>
          <span className="file-path">{file.path}</span>
        </div>
        <div className="file-meta">
          <span>Size: {(file.size / 1024).toFixed(2)} KB</span>
        </div>
      </div>
      
      <div className="file-viewer-content">
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading file content...</p>
          </div>
        )}
        
        {error && (
          <div className="error-container">
            <p>❌ {error}</p>
          </div>
        )}
        
        {!loading && !error && content && (
          <pre className="code-block">
            <code>{content}</code>
          </pre>
        )}
      </div>
    </div>
  )
}

export default FileViewer