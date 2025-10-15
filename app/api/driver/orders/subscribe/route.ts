import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { driver_id } = body

    if (!driver_id) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    // Set up real-time subscription for new order offers
    const channel = supabase
      .channel(`driver_orders_${driver_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_offers',
        filter: `rider_id=eq.${driver_id}`
      }, (payload) => {
        // This will be handled by the client-side subscription
        console.log('New order offer for driver:', payload.new)
      })
      .subscribe()

    return NextResponse.json({ 
      message: 'Subscription created',
      channel: `driver_orders_${driver_id}`
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
