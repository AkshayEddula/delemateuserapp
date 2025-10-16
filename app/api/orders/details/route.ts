import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Get order details with pricing information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const userId = searchParams.get('user_id')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Get order details with pricing
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        driver_id,
        pickup_lat,
        pickup_lng,
        drop_lat,
        drop_lng,
        distance_km,
        total_price,
        commission,
        rider_earnings,
        package_details,
        status,
        offer_expires_at,
        created_at,
        users!orders_user_id_fkey(
          id,
          name,
          phone
        ),
        driver:users!orders_driver_id_fkey(
          id,
          name,
          phone
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('Error fetching order details:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If user_id is provided, verify the user owns this order
    if (userId && order.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 })
    }

    // Format the response with pricing breakdown
    const response = {
      id: order.id,
      user: order.users,
      driver: order.driver,
      pickup: {
        lat: order.pickup_lat,
        lng: order.pickup_lng
      },
      drop: {
        lat: order.drop_lat,
        lng: order.drop_lng
      },
      pricing: {
        distance: order.distance_km,
        totalPrice: order.total_price,
        commission: order.commission,
        riderEarnings: order.rider_earnings,
        breakdown: {
          baseFare: order.distance_km <= 2 ? 30 : 30,
          distanceFare: order.total_price - (order.distance_km <= 2 ? 30 : 30),
          commissionRate: order.total_price > 0 ? Math.round((order.commission / order.total_price) * 100) : 0
        }
      },
      packageDetails: order.package_details,
      status: order.status,
      offerExpiresAt: order.offer_expires_at,
      createdAt: order.created_at
    }

    return NextResponse.json({ order: response })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}