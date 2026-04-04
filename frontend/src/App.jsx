import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { fetchRepoData, fetchRepoTree, buildFileTree, treeToArray } from './api/github'
import { saveAnalysis, getAnalysisById } from './api/supabase'
import { detectApiEndpoints, analyzeApiFlow } from './api/apiDetector'
import RepoDialog from './components/RepoDialog'
import FileTree from './components/FileTree'
import FileViewer from './components/FileViewer'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import KnowledgeGraph from './components/KnowledgeGraph'
import ApiVisualization from './components/ApiVisualization'
import './App.css'

// Separate component that uses auth
const AppContent = () => {
  const { user, isAuthenticated } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [repoInfo, setRepoInfo] = useState(null)
  const [fileTree, setFileTree] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [currentRepoUrl, setCurrentRepoUrl] = useState('')
  const [treeLoading, setTreeLoading] = useState(false)
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null)
  const [showGraph, setShowGraph] = useState(false)
  
  // API Visualization states
  const [showApiViz, setShowApiViz] = useState(false)
  const [apiEndpoints, setApiEndpoints] = useState([])
  const [apiFlows, setApiFlows] = useState([])
  const [detectingApi, setDetectingApi] = useState(false)

  const handleAnalyzeRepo = async (url) => {
    if (!isAuthenticated) {
      alert('Please login first to analyze repositories')
      return
    }

    setLoading(true)
    setTreeLoading(true)
    setCurrentRepoUrl(url)
    
    try {
      const repoResult = await fetchRepoData(url)
      
      if (!repoResult.success) {
        throw new Error(repoResult.error)
      }
      
      setRepoInfo(repoResult.data)
      
      const treeResult = await fetchRepoTree(url)
      
      if (treeResult.success && treeResult.data) {
        const treeObj = buildFileTree(treeResult.data)
        const treeArray = treeToArray(treeObj)
        setFileTree(treeArray)
        
        // Save analysis to database
        const savedAnalysis = await saveAnalysis(user.id, repoResult.data, treeArray)
        setCurrentAnalysisId(savedAnalysis.id)
        
        if (treeArray.length === 0) {
          alert('No files found in this repository.')
        }
      } else {
        alert('Could not fetch file tree.')
      }
      
      setIsDialogOpen(false)
      setCurrentView('analyzer')
    } catch (error) {
      console.error('Analysis error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
      setTreeLoading(false)
    }
  }

  const handleLoadAnalysis = async (analysis) => {
    setLoading(true)
    setRepoInfo({
      full_name: analysis.full_name,
      name: analysis.repo_name,
      description: analysis.description,
      stargazers_count: analysis.stars,
      forks_count: analysis.forks,
      language: analysis.language,
      html_url: analysis.repo_url
    })
    setFileTree(analysis.file_tree || [])
    setCurrentAnalysisId(analysis.id)
    setCurrentRepoUrl(analysis.repo_url)
    setCurrentView('analyzer')
    setLoading(false)
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  const handleReset = () => {
    setRepoInfo(null)
    setFileTree([])
    setSelectedFile(null)
    setCurrentRepoUrl('')
    setCurrentAnalysisId(null)
    setCurrentView('dashboard')
    setApiEndpoints([])
    setApiFlows([])
  }

  const handleNewAnalysis = () => {
    setIsDialogOpen(true)
  }

  const handleDetectApi = async () => {
    if (!repoInfo || !currentRepoUrl || !fileTree.length) {
      alert('Please analyze a repository first')
      return
    }
    
    setDetectingApi(true)
    try {
      const { framework, endpoints } = await detectApiEndpoints(currentRepoUrl, fileTree)
      setApiEndpoints(endpoints)
      
      // Analyze flow for each endpoint (limit to first 10 for performance)
      const allFlows = []
      for (const endpoint of endpoints.slice(0, 10)) {
        const flow = await analyzeApiFlow(currentRepoUrl, endpoint, fileTree)
        allFlows.push(...flow)
      }
      setApiFlows(allFlows)
      setShowApiViz(true)
      
      console.log(`Detected ${endpoints.length} endpoints using ${framework}`)
    } catch (error) {
      console.error('API detection error:', error)
      alert('Failed to detect API endpoints. The repository might not use a supported framework.')
    } finally {
      setDetectingApi(false)
    }
  }

  return (
    <div className="app">
      <Navbar 
        onGetStarted={handleNewAnalysis}
        onDashboard={() => setCurrentView('dashboard')}
        currentView={currentView}
      />

      {currentView === 'dashboard' ? (
        <Dashboard onSelectAnalysis={handleLoadAnalysis} />
      ) : repoInfo ? (
        <div className="analysis-container">
          <aside className="sidebar">
            <div className="repo-header">
              <h2>{repoInfo.full_name}</h2>
              {repoInfo.description && (
                <p className="repo-desc">{repoInfo.description.slice(0, 100)}...</p>
              )}
              {treeLoading && <div className="loading-tree">Loading files...</div>}
              
              <div className="repo-actions-sidebar">
                <button 
                  className="btn-graph"
                  onClick={() => setShowGraph(true)}
                >
                  🧠 Knowledge Graph
                </button>
                <button 
                  className="btn-api"
                  onClick={handleDetectApi}
                  disabled={detectingApi}
                >
                  {detectingApi ? '🔍 Detecting...' : '🔌 API Routes'}
                </button>
                <button 
                  className="btn-dashboard"
                  onClick={handleReset}
                >
                  📊 Dashboard
                </button>
              </div>
            </div>
            {!treeLoading && (
              <FileTree 
                treeData={fileTree} 
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            )}
          </aside>

          <main className="main-panel">
            {selectedFile ? (
              <FileViewer file={selectedFile} repoUrl={currentRepoUrl} />
            ) : (
              <div className="welcome-panel">
                <div className="welcome-content">
                  <h2>📁 Repository Explorer</h2>
                  <p>Select a file from the sidebar to view its contents</p>
                  <div className="repo-stats-summary">
                    <div className="stat-badge">
                      ⭐ {repoInfo.stargazers_count?.toLocaleString() || 0} stars
                    </div>
                    <div className="stat-badge">
                      🍴 {repoInfo.forks_count?.toLocaleString() || 0} forks
                    </div>
                    <div className="stat-badge">
                      💻 {repoInfo.language || 'N/A'}
                    </div>
                  </div>
                  <div className="action-buttons">
                    <a 
                      href={repoInfo.html_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="github-link"
                    >
                      View on GitHub →
                    </a>
                    <button 
                      className="btn-graph-main"
                      onClick={() => setShowGraph(true)}
                    >
                      🧠 Knowledge Graph
                    </button>
                    <button 
                      className="btn-api-main"
                      onClick={handleDetectApi}
                      disabled={detectingApi}
                    >
                      {detectingApi ? '🔍 Detecting APIs...' : '🔌 API Routes'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        <main className="main-content">
          <div className="hero">
            <h1>🚀 GitHub Repository Analyzer Pro</h1>
            <p>Explore any public GitHub repository with an interactive file tree and code viewer</p>
            {!isAuthenticated && (
              <p className="login-prompt">🔐 Please login to start analyzing repos</p>
            )}
            <button className="btn-hero" onClick={handleNewAnalysis}>
              Get Started
            </button>
          </div>
        </main>
      )}

      <RepoDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleAnalyzeRepo}
        loading={loading}
      />

      {showGraph && repoInfo && (
        <KnowledgeGraph 
          repoData={repoInfo}
          fileTree={fileTree}
          repoId={currentAnalysisId}
          onClose={() => setShowGraph(false)}
        />
      )}

      {showApiViz && repoInfo && (
        <ApiVisualization 
          endpoints={apiEndpoints}
          flows={apiFlows}
          onClose={() => setShowApiViz(false)}
          repoName={repoInfo.full_name}
        />
      )}
    </div>
  )
}

// Main App with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App