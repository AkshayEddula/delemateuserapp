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

    const { data: order, error } = await supabase
      .from('orders')
      .select('status, driver_id, offer_expires_at')
      .eq('id', order_id)
      .single()

    if (error) {
      console.error('Error fetching order status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if offer has expired
    if (order.status === 'assigned' && order.offer_expires_at) {
      const now = new Date()
      const expiresAt = new Date(order.offer_expires_at)
      
      if (now > expiresAt) {
        // Offer expired, check if any rider accepted
        const { data: acceptedOffers } = await supabase
          .from('order_offers')
          .select('rider_id')
          .eq('order_id', order_id)
          .eq('status', 'accepted')
          .limit(1)

        if (!acceptedOffers || acceptedOffers.length === 0) {
          // No one accepted, try to find more riders or cancel
          const { data: declinedRiders } = await supabase
            .from('order_offers')
            .select('rider_id')
            .eq('order_id', order_id)
            .in('status', ['declined', 'expired'])

          const declinedRiderIds = declinedRiders?.map(r => r.rider_id) || []

          const { data: availableRiders } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'rider')
            .eq('is_online', true)
            .not('id', 'in', `(${declinedRiderIds.join(',')})`)

          if (!availableRiders || availableRiders.length === 0) {
            // No more riders available, cancel order
            await supabase
              .from('orders')
              .update({ status: 'cancelled' })
              .eq('id', order_id)
            
            return NextResponse.json({ status: 'cancelled' })
          }
        }
      }
    }

    return NextResponse.json({ 
      status: order.status,
      driver_id: order.driver_id
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
