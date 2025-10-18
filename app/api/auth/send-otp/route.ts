import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Call external OTP API from server
    const response = await fetch('https://delemate-api.onrender.com/api/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('External OTP API error:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Failed to send OTP' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('OTP sent successfully to:', phoneNumber)

    return NextResponse.json({
      success: true,
      message: data.message || 'OTP sent successfully'
    })

  } catch (error) {
    console.error('Server OTP send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
