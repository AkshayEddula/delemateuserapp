'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

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
  login: (phone: string, otp: string) => Promise<void>
  requestOtp: (phone: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [otpStore, setOtpStore] = useState<{ [key: string]: string }>({}) // simulate OTP

  useEffect(() => {
    // On mount, check session in localStorage
    const savedUser = localStorage.getItem('user')
    if (savedUser) setUser(JSON.parse(savedUser))
    setLoading(false)
  }, [])

  // Simulate sending OTP
  const requestOtp = (phone: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    alert(`Simulated OTP for ${phone}: ${otp}`)
    setOtpStore(prev => ({ ...prev, [phone]: otp }))
  }

  const login = async (phone: string, otp: string) => {
    setLoading(true)
    const validOtp = otpStore[phone]
    if (validOtp !== otp) {
      alert('Invalid OTP')
      setLoading(false)
      return false
    }

    // Fetch existing user
    let { data: existing, error } = await supabase
      .from('users')
      .select('id, name, phone, role, lat, lng')
      .eq('phone', phone)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase select error:', error)
      setLoading(false)
      return false
    }

    let lat = 0, lng = 0
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      )
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch {
      console.warn('Location permission denied')
    }

    // Insert user if not exists
    if (!existing) {
      const { data, error: insertError } = await supabase
        .from('users')
        .insert([{ phone, role: 'user', lat, lng }])
        .select('id, name, phone, role, lat, lng')
        .single()

      if (insertError) {
        console.error('Supabase insert error:', insertError)
        alert('Signup failed: ' + insertError.message)
        setLoading(false)
        return false
      }

      existing = data
    }

    const loggedUser = { ...existing }
    setUser(loggedUser)
    localStorage.setItem('user', JSON.stringify(loggedUser))
    setLoading(false)
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
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
