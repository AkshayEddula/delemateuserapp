import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Check if order exists and is accepted
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, user_id, driver_id')
      .eq('id', order_id)
      .eq('status', 'accepted')
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found or not accepted' }, { status: 404 })
    }

    // Check if OTPs already exist for this order
    const { data: existingOtps } = await supabase
      .from('order_otps')
      .select('pickup_otp, delivery_otp')
      .eq('order_id', order_id)
      .single()

    if (existingOtps) {
      return NextResponse.json({ 
        pickup_otp: existingOtps.pickup_otp,
        delivery_otp: existingOtps.delivery_otp,
        order_id: order_id
      })
    }

    // Generate OTPs manually (fallback if database function fails)
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString()
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()

    // Ensure delivery OTP is different from pickup OTP
    const finalDeliveryOtp = deliveryOtp === pickupOtp 
      ? Math.floor(1000 + Math.random() * 9000).toString()
      : deliveryOtp

    // Insert OTPs directly
    const { data: otpData, error: otpError } = await supabase
      .from('order_otps')
      .insert({
        order_id: order_id,
        pickup_otp: pickupOtp,
        delivery_otp: finalDeliveryOtp
      })
      .select()
      .single()

    if (otpError) {
      console.error('Error inserting OTPs:', otpError)
      return NextResponse.json({ error: 'Failed to generate OTPs' }, { status: 500 })
    }

    console.log('OTPs created successfully:', otpData)

    return NextResponse.json({
      pickup_otp: pickupOtp,
      delivery_otp: finalDeliveryOtp,
      order_id: order_id
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    console.log('Fetching OTPs for order:', order_id)

    const { data: otps, error } = await supabase
      .from('order_otps')
      .select('pickup_otp, delivery_otp, pickup_verified, delivery_verified, expires_at')
      .eq('order_id', order_id)
      .maybeSingle()

    console.log('OTP query result:', { otps, error })

    if (error) {
      console.error('Error fetching OTPs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!otps) {
      console.log('No OTPs found for order:', order_id)
      return NextResponse.json({ error: 'OTPs not found for this order' }, { status: 404 })
    }

    return NextResponse.json(otps)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
