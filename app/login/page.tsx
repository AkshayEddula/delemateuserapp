'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { login, requestOtp, loading, user, logout } = useAuth()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')

  const handleSendOtp = () => {
    if (!phone) return alert('Enter phone number')
    requestOtp(phone)
    setStep('otp')
  }

  const handleLogin = async () => {
    await login(phone, otp)
  }

  if (loading) return <p>Loading...</p>

  if (user) {
    return (
      <div className="p-6 text-center">
        <h2>Welcome, {user.phone}</h2>
        <p>Location: {user.lat?.toFixed(4)}, {user.lng?.toFixed(4)}</p>
        <div>
          <button onClick={() => logout()}>Logout</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="p-6 border rounded-lg w-80 text-center space-y-4">
        <h1 className="text-xl font-bold">Login with Mobile</h1>

        {step === 'phone' ? (
          <>
            <input
              type="tel"
              placeholder="Enter mobile number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="border p-2 w-full rounded"
            />
            <button
              onClick={handleSendOtp}
              className="bg-blue-600 text-white w-full py-2 rounded"
            >
              Send OTP
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              className="border p-2 w-full rounded"
            />
            <button
              onClick={handleLogin}
              className="bg-green-600 text-white w-full py-2 rounded"
            >
              Verify & Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
