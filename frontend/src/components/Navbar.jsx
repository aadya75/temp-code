import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import LoginModal from './LoginModal'
import './Navbar.css'

const Navbar = ({ onGetStarted, onDashboard, currentView }) => {
  const { user, signOut, isAuthenticated } = useAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand" onClick={onDashboard} style={{ cursor: 'pointer' }}>
            <h1>📊 GitHub Analyzer Pro</h1>
          </div>
          
          <div className="navbar-actions">
            {isAuthenticated ? (
              <>
              
{/* <button 
    onClick={() => props.onOpenTraceability?.()}
    className="nav-btn traceability-btn"
>
    🔍 Traceability
</button> */}
                <button 
                  className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={onDashboard}
                >
                  Dashboard
                </button>
                <button 
                  className={`nav-btn ${currentView === 'analyzer' ? 'active' : ''}`}
                  onClick={onGetStarted}
                >
                  New Analysis
                </button>
                <span className="user-email">{user.email}</span>
                <button className="btn-logout" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <button className="btn-login" onClick={() => setIsLoginModalOpen(true)}>
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </nav>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  )
}

export default Navbar