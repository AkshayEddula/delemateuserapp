'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

export default function DebugPage() {
  const { user } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runDebugTests()
  }, [user])

  const runDebugTests = async () => {
    const results: any = {
      user: user,
      timestamp: new Date().toISOString()
    }

    try {
      // Test 1: Basic database connection
      const { data: testData, error: testError } = await supabase
        .from('orders')
        .select('count')
        .limit(1)

      results.databaseConnection = {
        success: !testError,
        error: testError,
        data: testData
      }

      // Test 2: Check if user can access orders
      if (user?.id) {
        const { data: userOrders, error: userOrdersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .limit(5)

        results.userOrders = {
          success: !userOrdersError,
          error: userOrdersError,
          count: userOrders?.length || 0,
          orders: userOrders
        }
      }

      // Test 3: Check OTP function
      try {
        const { data: otpTest, error: otpError } = await supabase
          .rpc('generate_unique_otp')

        results.otpFunction = {
          success: !otpError,
          error: otpError,
          result: otpTest
        }
      } catch (otpErr) {
        results.otpFunction = {
          success: false,
          error: String(otpErr)
        }
      }

      // Test 4: Check API endpoints
      try {
        const response = await fetch('/api/test/otp')
        const apiData = await response.json()
        results.apiTest = {
          success: response.ok,
          status: response.status,
          data: apiData
        }
      } catch (apiErr) {
        results.apiTest = {
          success: false,
          error: String(apiErr)
        }
      }

    } catch (error) {
      results.generalError = String(error)
    }

    setDebugInfo(results)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Running debug tests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="mt-6">
          <button
            onClick={runDebugTests}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Run Tests Again
          </button>
        </div>
      </div>
    </div>
  )
}
