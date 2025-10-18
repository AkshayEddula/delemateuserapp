'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User as SupabaseUser } from '@supabase/supabase-js'

type User = {
  id: string
  name?: string
  phone: string
  role: 'user'
  lat?: number
  lng?: number
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (phone: string, otp: string) => Promise<boolean>
  requestOtp: (phone: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [otpRequestInProgress, setOtpRequestInProgress] = useState(false)

  useEffect(() => {
    // Check for existing session token
    const checkSession = () => {
      try {
        const sessionToken = localStorage.getItem('sessionToken')
        const savedUser = localStorage.getItem('user')
        
        if (sessionToken && savedUser) {
          // Verify session token is still valid
          const tokenData = JSON.parse(atob(sessionToken))
          const now = Math.floor(Date.now() / 1000)
          
          if (tokenData.exp > now) {
            // Session is still valid
            console.log('Valid session found, setting user:', JSON.parse(savedUser))
            setUser(JSON.parse(savedUser))
          } else {
            // Session expired, clear storage
            console.log('Session expired, clearing storage')
            localStorage.removeItem('sessionToken')
            localStorage.removeItem('user')
          }
        }
      } catch (error) {
        console.error('Session check error:', error)
        // Clear invalid session data
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  // Send OTP via server-side API
  const requestOtp = async (phone: string): Promise<boolean> => {
    // Prevent multiple simultaneous requests
    if (otpRequestInProgress) {
      console.log('OTP request already in progress, ignoring duplicate request')
      return false
    }

    setOtpRequestInProgress(true)
    
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phone
        }),
      });

      if (!response.ok) {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to send OTP')
        return false
      }

      const data = await response.json()
      alert(data.message || 'OTP sent successfully')
      return true
    } catch (error) {
      console.error('OTP request error:', error)
      alert('Failed to send OTP. Please try again.')
      return false
    } finally {
      setOtpRequestInProgress(false)
    }
  }

  const login = async (phone: string, otp: string) => {
    setLoading(true)
    
    try {
      // First verify OTP via server-side API
      const otpResponse = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phone,
          otp: otp,
        }),
      });

      if (!otpResponse.ok) {
        const errorData = await otpResponse.json()
        alert(errorData.error || 'Invalid OTP')
        setLoading(false)
        return false
      }

      // OTP verified, now create session with our API
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json()
        alert(errorData.error || 'Session creation failed')
        setLoading(false)
        return false
      }

      const { user: userData, sessionToken, isFirstTime } = await sessionResponse.json()

      // Store session token and user data
      if (sessionToken) {
        localStorage.setItem('sessionToken', sessionToken)
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('isFirstTime', isFirstTime.toString())
        setUser(userData)
        setLoading(false)
        return true
      } else {
        alert('Session creation failed')
        setLoading(false)
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed. Please try again.')
      setLoading(false)
      return false
    }
  }

  const logout = () => {
    // Clear session and user data
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, requestOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
