import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, pickup_lat, pickup_lng, drop_lat, drop_lng, package_details, status } = body

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // First, create the order
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        user_id,
        pickup_lat,
        pickup_lng,
        drop_lat,
        drop_lng,
        package_details,
        status
      }])
      .select()
      .single()

    if (error) {
      console.error('API Error creating order:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Find available riders near pickup location
    const { data: riders, error: ridersError } = await supabase
      .from('users')
      .select('id, lat, lng, name, phone')
      .eq('role', 'rider')
      .eq('is_online', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)

    if (ridersError) {
      console.error('Error fetching riders:', ridersError)
      // Update order status to failed
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
      return NextResponse.json({ 
        order: { ...order, status: 'cancelled' }, 
        status: 'cancelled' 
      })
    }

    if (!riders || riders.length === 0) {
      // No riders available
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
      return NextResponse.json({ 
        order: { ...order, status: 'cancelled' }, 
        status: 'cancelled' 
      })
    }

    // Calculate distances and sort by nearest
    const ridersWithDistance = riders.map(rider => ({
      ...rider,
      distance: calculateDistance(pickup_lat, pickup_lng, rider.lat!, rider.lng!)
    })).sort((a, b) => a.distance - b.distance)

    // Take the nearest 3 riders (or all if less than 3)
    const nearestRiders = ridersWithDistance.slice(0, 3)

    // Create order offers for nearest riders
    const offerExpiresAt = new Date(Date.now() + 120 * 1000) // 120 seconds from now
    
    const { error: offersError } = await supabase
      .from('order_offers')
      .insert(nearestRiders.map(rider => ({
        order_id: order.id,
        rider_id: rider.id,
        status: 'offered'
      })))

    if (offersError) {
      console.error('Error creating offers:', offersError)
    }

    // Update order with offer expiration
    await supabase
      .from('orders')
      .update({ 
        status: 'assigned',
        offer_expires_at: offerExpiresAt.toISOString()
      })
      .eq('id', order.id)

    return NextResponse.json({ 
      order: { ...order, status: 'assigned' }, 
      riders: nearestRiders,
      status: 'assigned'
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
