import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Test if we can connect to the database
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('id')
      .limit(1)

    if (testError) {
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: testError 
      }, { status: 500 })
    }

    // Test OTP generation function
    const { data: otpResult, error: otpError } = await supabase
      .rpc('generate_unique_otp')

    if (otpError) {
      return NextResponse.json({ 
        error: 'OTP generation failed',
        details: otpError 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      testOtp: otpResult,
      message: 'Database and OTP functions are working'
    })
  } catch (error) {
    console.error('Test API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 })
  }
}
