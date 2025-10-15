import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')

    if (!driver_id) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    // Get orders that are assigned and have active offers for this driver
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_offers!inner(
          id,
          status,
          created_at
        )
      `)
      .eq('status', 'assigned')
      .eq('order_offers.rider_id', driver_id)
      .eq('order_offers.status', 'offered')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching driver orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter out orders where the offer has expired
    const now = new Date()
    const validOrders = orders?.filter(order => {
      if (!order.offer_expires_at) return true
      const expiresAt = new Date(order.offer_expires_at)
      return now <= expiresAt
    }) || []

    return NextResponse.json({ orders: validOrders })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
