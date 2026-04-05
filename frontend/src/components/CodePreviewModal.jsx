import { useState, useEffect } from 'react'
import { fetchFileLines } from '../api/github'
import './CodePreviewModal.css'

const CodePreviewModal = ({ isOpen, onClose, nodeData, repoUrl }) => {
  const [codeContent, setCodeContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && nodeData && nodeData.filePath && nodeData.startLine) {
      fetchCodeLines()
    }
  }, [isOpen, nodeData])

  const fetchCodeLines = async () => {
    setLoading(true)
    setError('')
    
    try {
      const result = await fetchFileLines(
        repoUrl,
        nodeData.filePath,
        nodeData.startLine,
        nodeData.endLine || nodeData.startLine + 10
      )
      
      if (result.success) {
        setCodeContent(result.data.content)
      } else {
        setError(result.error || 'Failed to load code')
      }
    } catch (err) {
      setError('Error loading code preview')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="code-preview-overlay" onClick={onClose}>
      <div className="code-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="code-preview-header">
          <div className="header-info">
            <span className="node-type-badge">{nodeData?.type || 'Node'}</span>
            <h3>{nodeData?.label || 'Code Preview'}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="code-preview-location">
          <span className="location-icon">📁</span>
          <span className="location-path">{nodeData?.filePath}</span>
          <span className="location-lines">
            Lines {nodeData?.startLine} - {nodeData?.endLine || nodeData?.startLine + 10}
          </span>
        </div>
        
        <div className="code-preview-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner-small"></div>
              <p>Loading code...</p>
            </div>
          )}
          
          {error && (
            <div className="error-state">
              <p>❌ {error}</p>
            </div>
          )}
          
          {!loading && !error && codeContent && (
            <pre className="code-preview">
              <code>{codeContent}</code>
            </pre>
          )}
        </div>
        
        <div className="code-preview-footer">
          <button className="view-full-btn" onClick={() => {
            window.open(`${repoUrl}/blob/main/${nodeData?.filePath}#L${nodeData?.startLine}-L${nodeData?.endLine || nodeData?.startLine + 10}`, '_blank')
          }}>
            View Full File on GitHub →
          </button>
        </div>
      </div>
    </div>
  )
}

export default CodePreviewModal