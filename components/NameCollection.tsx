'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

interface NameCollectionProps {
  onComplete: () => void
}

export default function NameCollection({ onComplete }: NameCollectionProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('Please enter your name')
      return
    }

    setLoading(true)

    try {
      const sessionToken = localStorage.getItem('sessionToken')
      
      const response = await fetch('/api/auth/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update name')
        setLoading(false)
        return
      }

      const { user: updatedUser } = await response.json()
      
      // Update local storage and context
      localStorage.setItem('user', JSON.stringify(updatedUser))
      localStorage.removeItem('isFirstTime')
      
      // Trigger a page refresh to update the user context
      window.location.reload()
      
    } catch (error) {
      console.error('Name update error:', error)
      alert('Failed to update name. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Delemate!</h1>
          <p className="text-gray-600">Please tell us your name to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Phone: {user?.phone}
          </p>
        </div>
      </div>
    </div>
  )
}
