import React, { createContext, useContext, useEffect, useState } from 'react'
import { signUp as apiSignUp, signIn as apiSignIn, signOut as apiSignOut, getSession } from '../api/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('access_token')
        
        if (!token) {
          setUser(null)
          setLoading(false)
          return
        }
        
        const response = await getSession()
        if (response.success && response.user) {
          setUser(response.user)
        } else {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          setUser(null)
        }
      } catch (error) {
        console.error('Session check failed:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const signUp = async (email, password) => {
    try {
      const response = await apiSignUp(email, password)
      if (response.success) {
        setUser(response.user)
      }
      return response
    } catch (error) {
      console.error('Sign up error in context:', error)
      throw error
    }
  }

  const signIn = async (email, password) => {
    try {
      const response = await apiSignIn(email, password)
      if (response.success) {
        setUser(response.user)
      }
      return response
    } catch (error) {
      console.error('Sign in error in context:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await apiSignOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}