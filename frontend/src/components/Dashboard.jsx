import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAnalysisHistory, deleteAnalysis } from '../api/supabase'
import './Dashboard.css'

const Dashboard = ({ onSelectAnalysis }) => {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (user) {
      loadAnalyses()
    }
  }, [user])

  const loadAnalyses = async () => {
    try {
      const data = await getAnalysisHistory(user.id)
      setAnalyses(data)
    } catch (error) {
      console.error('Error loading analyses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this analysis?')) {
      setDeleting(id)
      try {
        await deleteAnalysis(id)
        setAnalyses(analyses.filter(a => a.id !== id))
      } catch (error) {
        console.error('Error deleting:', error)
        alert('Failed to delete analysis')
      } finally {
        setDeleting(null)
      }
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your analyses...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Your Analysis History</h2>
        <p>Previously analyzed repositories ({analyses.length})</p>
      </div>

      <div className="analyses-grid">
        {analyses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No analyses yet</h3>
            <p>Start by analyzing your first repository!</p>
          </div>
        ) : (
          analyses.map((analysis) => (
            <div 
              key={analysis.id} 
              className="analysis-card"
              onClick={() => onSelectAnalysis(analysis)}
            >
              <div className="card-header">
                <div className="repo-icon">📁</div>
                <div className="repo-info">
                  <h3>{analysis.repo_name}</h3>
                  <p className="full-name">{analysis.full_name}</p>
                </div>
                <button 
                  className="delete-btn"
                  onClick={(e) => handleDelete(analysis.id, e)}
                  disabled={deleting === analysis.id}
                >
                  {deleting === analysis.id ? '...' : '🗑️'}
                </button>
              </div>
              
              {analysis.description && (
                <p className="repo-description-preview">
                  {analysis.description.length > 100 
                    ? analysis.description.substring(0, 100) + '...' 
                    : analysis.description}
                </p>
              )}
              
              <div className="card-stats">
                <span className="stat">⭐ {analysis.stars?.toLocaleString() || 0}</span>
                <span className="stat">🍴 {analysis.forks?.toLocaleString() || 0}</span>
                {analysis.language && (
                  <span className="stat">💻 {analysis.language}</span>
                )}
              </div>
              
              <div className="card-footer">
                <span className="analyzed-date">
                  📅 {formatDate(analysis.analyzed_at)}
                </span>
                <button className="reopen-btn">Reopen Analysis →</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Dashboard