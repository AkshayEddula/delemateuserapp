import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Simple OTP generation test
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString()
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()

    // Ensure delivery OTP is different from pickup OTP
    const finalDeliveryOtp = deliveryOtp === pickupOtp 
      ? Math.floor(1000 + Math.random() * 9000).toString()
      : deliveryOtp

    return NextResponse.json({ 
      success: true,
      pickup_otp: pickupOtp,
      delivery_otp: finalDeliveryOtp,
      message: 'Simple OTP generation test successful'
    })
  } catch (error) {
    console.error('Simple OTP Test Error:', error)
    return NextResponse.json({ 
      success: false,
      error: String(error),
      message: 'Simple OTP generation test failed'
    }, { status: 500 })
  }
}
