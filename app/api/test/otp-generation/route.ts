import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Test OTP generation
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString()
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()

    // Ensure delivery OTP is different from pickup OTP
    const finalDeliveryOtp = deliveryOtp === pickupOtp 
      ? Math.floor(1000 + Math.random() * 9000).toString()
      : deliveryOtp

    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('order_otps')
      .select('count')
      .limit(1)

    return NextResponse.json({ 
      success: true,
      generated_otps: {
        pickup_otp: pickupOtp,
        delivery_otp: finalDeliveryOtp
      },
      database_connection: !testError,
      message: 'OTP generation test successful'
    })
  } catch (error) {
    console.error('OTP Generation Test Error:', error)
    return NextResponse.json({ 
      success: false,
      error: String(error),
      message: 'OTP generation test failed'
    }, { status: 500 })
  }
}
