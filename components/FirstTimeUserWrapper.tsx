'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import NameCollection from './NameCollection'

interface FirstTimeUserWrapperProps {
  children: React.ReactNode
}

export default function FirstTimeUserWrapper({ children }: FirstTimeUserWrapperProps) {
  const [showNameCollection, setShowNameCollection] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    // Check if user is logged in and if they need to provide their name
    const checkFirstTime = () => {
      if (user) {
        const isFirstTime = localStorage.getItem('isFirstTime') === 'true'
        const hasName = user.name && user.name.trim() !== ''
        
        if (isFirstTime && !hasName) {
          setShowNameCollection(true)
        } else {
          setShowNameCollection(false)
        }
      } else {
        setShowNameCollection(false)
      }
      setLoading(false)
    }

    checkFirstTime()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (showNameCollection) {
    return <NameCollection onComplete={() => setShowNameCollection(false)} />
  }

  return <>{children}</>
}
