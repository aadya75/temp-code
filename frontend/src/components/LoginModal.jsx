import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './LoginModal.css'

const LoginModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      if (isSignUp) {
        const result = await signUp(email, password)
        if (result.success) {
          onClose()
          setEmail('')
          setPassword('')
          setIsSignUp(false)
        } else {
          setError(result.error || 'Sign up failed')
        }
      } else {
        const result = await signIn(email, password)
        if (result.success) {
          onClose()
          setEmail('')
          setPassword('')
          setIsSignUp(false)
        } else {
          setError(result.error || 'Sign in failed')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.error || err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    setEmail('')
    setPassword('')
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="toggle-mode">
          <button type="button" onClick={toggleMode}>
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginModal