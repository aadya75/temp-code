import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './LoginModal.css'

const LoginModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      if (isLogin) {
        await signIn(email, password)
        onClose()
        setEmail('')
        setPassword('')
      } else {
        // Sign up - will work immediately since email confirmation is disabled
        await signUp(email, password)
        alert('Account created successfully! You can now login.')
        setIsLogin(true) // Switch to login mode
        setPassword('') // Clear password
      }
    } catch (err) {
      console.error('Auth error:', err)
      
      // User-friendly error messages
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password')
      } else if (err.message.includes('User already registered')) {
        setError('This email is already registered. Please login instead.')
        setIsLogin(true) // Switch to login mode
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className="login-container" onClick={(e) => e.stopPropagation()}>
        <div className="login-header">
          <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
          <button className="login-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="login-body">
            <input
              type="email"
              className="login-input"
              placeholder="Email (any email works for testing)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="off"
            />
            
            <input
              type="password"
              className="login-input"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
            
            {!isLogin && (
              <div className="info-message">
                ℹ️ For testing, you can use any email (e.g., test@example.com)
              </div>
            )}
            
            {error && <div className="login-error">{error}</div>}
          </div>
          
          <div className="login-footer">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>
            
            <button
              type="button"
              className="btn-switch"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setEmail('')
                setPassword('')
              }}
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginModal