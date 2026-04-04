import { useState } from 'react'
import './RepoDialog.css'

const RepoDialog = ({ isOpen, onClose, onSubmit, loading }) => {
  const [repoUrl, setRepoUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL')
      return
    }
    
    const githubRegex = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/
    if (!githubRegex.test(repoUrl)) {
      setError('Please enter a valid GitHub URL (e.g., https://github.com/facebook/react)')
      return
    }
    
    setError('')
    onSubmit(repoUrl)
    setRepoUrl('') // Clear input after submit
  }

  if (!isOpen) return null

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Analyze GitHub Repository</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <p className="dialog-description">
              Enter the URL of any public GitHub repository
            </p>
            
            <input
              type="text"
              className={`dialog-input ${error ? 'error' : ''}`}
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value)
                setError('')
              }}
              disabled={loading}
              autoFocus
            />
            
            {error && <div className="dialog-error">{error}</div>}
          </div>
          
          <div className="dialog-footer">
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RepoDialog