'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { login, requestOtp, loading, user, logout } = useAuth()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [lastOtpRequest, setLastOtpRequest] = useState<number>(0)
  const [cooldownTime, setCooldownTime] = useState<number>(0)
  const router = useRouter()

  const handleSendOtp = async () => {
    if (!phone) return alert('Enter phone number')
    
    // Debounce: prevent requests within 3 seconds
    const now = Date.now()
    const timeSinceLastRequest = now - lastOtpRequest
    if (timeSinceLastRequest < 3000) {
      const remainingTime = Math.ceil((3000 - timeSinceLastRequest) / 1000)
      alert(`Please wait ${remainingTime} seconds before requesting another OTP`)
      return
    }
    
    setSendingOtp(true)
    setLastOtpRequest(now)
    
    try {
      const success = await requestOtp(phone)
      if (success) {
        setStep('otp')
      }
    } catch (error) {
      console.error('Error sending OTP:', error)
    } finally {
      setSendingOtp(false)
    }
  }

  const handleLogin = async () => {
    if (!otp) return alert('Enter OTP code')
    
    setVerifyingOtp(true)
    try {
      const success = await login(phone, otp)
      if (success) {
        // Redirect to orders page after successful login
        router.push('/orders')
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/orders')
    }
  }, [user, router])

  // Cooldown timer effect
  useEffect(() => {
    if (lastOtpRequest > 0) {
      const interval = setInterval(() => {
        const now = Date.now()
        const timeSinceLastRequest = now - lastOtpRequest
        const remainingTime = Math.max(0, 3000 - timeSinceLastRequest)
        setCooldownTime(Math.ceil(remainingTime / 1000))
        
        if (remainingTime <= 0) {
          clearInterval(interval)
          setCooldownTime(0)
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [lastOtpRequest])

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
              disabled={sendingOtp || cooldownTime > 0}
              className={`w-full py-2 rounded-lg transition-colors font-medium ${
                sendingOtp || cooldownTime > 0
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#133bb7] hover:bg-[#0f2a8a]'
              } text-white`}
            >
              {sendingOtp ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending OTP...
                </div>
              ) : cooldownTime > 0 ? (
                `Wait ${cooldownTime}s`
              ) : (
                'Send OTP'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <p className="text-sm text-gray-600">
                OTP sent to <span className="font-medium">{phone}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OTP Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent text-gray-900 placeholder-gray-500"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={verifyingOtp}
              className={`w-full py-2 rounded-lg transition-colors font-medium ${
                verifyingOtp 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {verifyingOtp ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify & Login'
              )}
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
