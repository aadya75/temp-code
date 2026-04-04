import './Navbar.css'

const Navbar = ({ user, onLogin, onLogout, onGetStarted }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>GitHub Analyzer</h1>
        </div>
        
        <div className="navbar-actions">
          {user ? (
            <>
              <span className="user-email">{user.email}</span>
              <button className="btn-get-started" onClick={onGetStarted}>
                Get Started
              </button>
              <button className="btn-logout" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <button className="btn-login" onClick={onLogin}>
              Login with GitHub
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar