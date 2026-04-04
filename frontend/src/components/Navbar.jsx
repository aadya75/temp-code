import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import LoginModal from './LoginModal'
import './Navbar.css'

const Navbar = ({ onGetStarted }) => {
  const { user, signOut, isAuthenticated } = useAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>📊 GitHub Analyzer Pro</h1>
          </div>
          
          <div className="navbar-actions">
            {isAuthenticated ? (
              <>
                <span className="user-email">{user.email}</span>
                <button className="btn-get-started" onClick={onGetStarted}>
                  Analyze Repo
                </button>
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