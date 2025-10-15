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
    const { order_id } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('pickup_lat, pickup_lng, created_at, status')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      console.error('Error fetching order:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order is still assigned (not accepted or cancelled)
    if (order.status !== 'assigned') {
      return NextResponse.json({ status: 'order_not_available' })
    }

    // Check if 30 seconds have passed since order creation
    const orderCreatedAt = new Date(order.created_at)
    const timeElapsed = Date.now() - orderCreatedAt.getTime()
    
    if (timeElapsed < 30000) { // Less than 30 seconds
      return NextResponse.json({ status: 'too_early' })
    }

    // Find riders who have already been offered this order
    const { data: offeredRiders } = await supabase
      .from('order_offers')
      .select('rider_id')
      .eq('order_id', order_id)

    const offeredRiderIds = offeredRiders?.map(r => r.rider_id) || []

    // Find new available riders (excluding those already offered)
    const { data: availableRiders, error: ridersError } = await supabase
      .from('users')
      .select('id, lat, lng, name, phone')
      .eq('role', 'rider')
      .eq('is_online', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)

    if (ridersError) {
      console.error('Error fetching riders:', ridersError)
      return NextResponse.json({ error: ridersError.message }, { status: 500 })
    }

    // Filter out already offered riders
    const newRiders = availableRiders?.filter(rider => 
      !offeredRiderIds.includes(rider.id)
    ) || []

    if (newRiders.length === 0) {
      return NextResponse.json({ status: 'no_new_riders' })
    }

    // Calculate distances and find nearest new riders
    const ridersWithDistance = newRiders.map(rider => ({
      ...rider,
      distance: calculateDistance(order.pickup_lat, order.pickup_lng, rider.lat!, rider.lng!)
    })).sort((a, b) => a.distance - b.distance)

    const nearestRiders = ridersWithDistance.slice(0, 3)

    // Calculate remaining time (total 120 seconds - elapsed time)
    const remainingTime = Math.max(0, 120000 - timeElapsed)
    const offerExpiresAt = new Date(Date.now() + remainingTime)

    // Create new offers for the additional riders
    const { error: newOffersError } = await supabase
      .from('order_offers')
      .insert(nearestRiders.map(rider => ({
        order_id: order_id,
        rider_id: rider.id,
        status: 'offered'
      })))

    if (newOffersError) {
      console.error('Error creating new offers:', newOffersError)
      return NextResponse.json({ error: newOffersError.message }, { status: 500 })
    }

    // Update order with new expiration time
    await supabase
      .from('orders')
      .update({ 
        offer_expires_at: offerExpiresAt.toISOString()
      })
      .eq('id', order_id)

    return NextResponse.json({ 
      status: 'expanded',
      riders: nearestRiders,
      remainingTime: Math.floor(remainingTime / 1000)
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
