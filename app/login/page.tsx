'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { login, requestOtp, loading, user, logout } = useAuth()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const router = useRouter()

  const handleSendOtp = () => {
    if (!phone) return alert('Enter phone number')
    requestOtp(phone)
    setStep('otp')
  }

  const handleLogin = async () => {
    const success = await login(phone, otp)
    if (success) {
      // Redirect to orders page after successful login
      router.push('/orders')
    }
  }

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/orders')
    }
  }, [user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#133bb7] to-[#3b5bc7] rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            📱
          </div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-600 text-sm">Sign in with your mobile number</p>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
              <input
                type="tel"
                placeholder="Enter your mobile number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>
            <button
              onClick={handleSendOtp}
              className="w-full bg-[#133bb7] text-white py-2 rounded-lg hover:bg-[#0f2a8a] transition-colors font-medium"
            >
              Send OTP
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OTP Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Verify & Login
            </button>
            <button
              onClick={() => setStep('phone')}
              className="w-full text-[#133bb7] text-sm hover:text-[#0f2a8a] transition-colors"
            >
              ← Back to phone number
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
