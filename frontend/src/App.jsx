import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { getAnalysisHistory } from './api/api'
import LoginModal from './components/LoginModal'

function App() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Only fetch analysis history when user is authenticated
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated || !user) {
        setAnalysisHistory([])
        return
      }
      
      setLoadingHistory(true)
      try {
        const response = await getAnalysisHistory(user.id)
        if (response.success) {
          setAnalysisHistory(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch analysis history:', error)
        setAnalysisHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [isAuthenticated, user])

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Your app content */}
      {!isAuthenticated ? (
        <div className="welcome-screen">
          <h1>Welcome to GitHub Repo Analyzer</h1>
          <button onClick={() => setShowLoginModal(true)}>
            Get Started
          </button>
        </div>
      ) : (
        <div className="dashboard">
          <div className="header">
            <h1>Your Analysis History</h1>
            <button onClick={() => setShowLoginModal(true)}>
              New Analysis
            </button>
          </div>
          
          {loadingHistory ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your analysis history...</p>
            </div>
          ) : analysisHistory.length === 0 ? (
            <div className="empty-state">
              <p>No analyses yet. Start by analyzing a repository!</p>
            </div>
          ) : (
            <div className="history-list">
              {analysisHistory.map((analysis) => (
                <div key={analysis.id} className="analysis-card">
                  <h3>{analysis.repo_name}</h3>
                  <p>{analysis.description}</p>
                  <div className="stats">
                    <span>⭐ {analysis.stars}</span>
                    <span>🍴 {analysis.forks}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </div>
  )
}

export default App