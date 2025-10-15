import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    console.log('Fetching order details for ID:', order_id)

    // Get the order using service role (bypasses RLS)
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError) {
      console.error('Order fetch error:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('Order found:', orderData)

    // If order has a driver, fetch driver details
    let driverData = null
    if (orderData.driver_id) {
      console.log('Fetching driver details for ID:', orderData.driver_id)
      const { data: driver, error: driverError } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', orderData.driver_id)
        .single()

      if (!driverError && driver) {
        driverData = driver
        console.log('Driver found:', driver)
      } else {
        console.error('Driver fetch error:', driverError)
      }
    }

    const finalOrder = {
      ...orderData,
      driver: driverData
    }

    console.log('Returning order:', finalOrder)
    return NextResponse.json({ order: finalOrder })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
