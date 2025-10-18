import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json()

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    // Validate OTP format (6 digits)
    const otpRegex = /^\d{6}$/
    if (!otpRegex.test(otp)) {
      return NextResponse.json(
        { error: 'OTP must be 6 digits' },
        { status: 400 }
      )
    }

    // Call external OTP verification API from server
    const response = await fetch('https://delemate-api.onrender.com/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        otp: otp,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('External OTP verification error:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Invalid OTP' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('OTP verified successfully for:', phoneNumber)

    return NextResponse.json({
      success: true,
      message: data.message || 'OTP verified successfully'
    })

  } catch (error) {
    console.error('Server OTP verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
