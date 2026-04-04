import { useState } from 'react'
import { fetchRepoData } from './api/github'
import RepoDialog from './components/RepoDialog'
import './App.css'

function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [repoInfo, setRepoInfo] = useState(null)

  // Handle repository analysis
  const handleAnalyzeRepo = async (url) => {
    setLoading(true)
    const result = await fetchRepoData(url)
    
    if (result.success) {
      setRepoInfo(result.data)
      setIsDialogOpen(false)
    } else {
      alert(`Error: ${result.error}`)
    }
    
    setLoading(false)
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>GitHub Analyzer</h1>
          </div>
          <div className="navbar-actions">
            <button className="btn-get-started" onClick={() => setIsDialogOpen(true)}>
              Analyze Repo
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {repoInfo ? (
          <div className="repo-card">
            <h2 className="repo-name">{repoInfo.full_name}</h2>
            {repoInfo.description && (
              <p className="repo-description">{repoInfo.description}</p>
            )}
            
            <div className="repo-stats">
              <div className="stat">
                <span className="stat-value">⭐ {repoInfo.stargazers_count.toLocaleString()}</span>
                <span className="stat-label">Stars</span>
              </div>
              <div className="stat">
                <span className="stat-value">🍴 {repoInfo.forks_count.toLocaleString()}</span>
                <span className="stat-label">Forks</span>
              </div>
              <div className="stat">
                <span className="stat-value">👁️ {repoInfo.watchers_count.toLocaleString()}</span>
                <span className="stat-label">Watchers</span>
              </div>
              <div className="stat">
                <span className="stat-value">⚠️ {repoInfo.open_issues_count.toLocaleString()}</span>
                <span className="stat-label">Open Issues</span>
              </div>
            </div>

            <div className="repo-details">
              {repoInfo.language && (
                <div className="detail-item">
                  <span className="detail-label">Language:</span>
                  <span className="detail-value">{repoInfo.language}</span>
                </div>
              )}
              {repoInfo.license && (
                <div className="detail-item">
                  <span className="detail-label">License:</span>
                  <span className="detail-value">{repoInfo.license.name}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Created:</span>
                <span className="detail-value">{new Date(repoInfo.created_at).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Updated:</span>
                <span className="detail-value">{new Date(repoInfo.updated_at).toLocaleDateString()}</span>
              </div>
              {repoInfo.homepage && (
                <div className="detail-item">
                  <span className="detail-label">Website:</span>
                  <a href={repoInfo.homepage} target="_blank" rel="noopener noreferrer" className="detail-link">
                    {repoInfo.homepage}
                  </a>
                </div>
              )}
            </div>

            <div className="repo-actions">
              <a 
                href={repoInfo.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-github"
              >
                View on GitHub →
              </a>
              <button 
                onClick={() => setRepoInfo(null)} 
                className="btn-new"
              >
                Analyze Another Repo
              </button>
            </div>
          </div>
        ) : (
          <div className="hero">
            <h1>GitHub Repository Analyzer</h1>
            <p>Enter any public GitHub repository URL to get detailed insights</p>
            <button className="btn-hero" onClick={() => setIsDialogOpen(true)}>
              Get Started
            </button>
          </div>
        )}
      </main>

      <RepoDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleAnalyzeRepo}
        loading={loading}
      />
    </div>
  )
}

export default App