import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        offer_expires_at,
        pickup_lat,
        pickup_lng,
        drop_lat,
        drop_lng,
        order_offers(
          id,
          status,
          created_at,
          rider_id
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'assigned') {
      return NextResponse.json({ error: 'Order is not in assigned status' }, { status: 400 })
    }

    // Check if current offer has expired
    const now = new Date()
    const offerExpiresAt = order.offer_expires_at ? new Date(order.offer_expires_at) : null

    if (!offerExpiresAt || now < offerExpiresAt) {
      return NextResponse.json({ 
        success: false, 
        message: 'Current offer has not expired yet' 
      })
    }

    // Mark current offer as expired
    const currentOffer = order.order_offers?.find(offer => offer.status === 'offered')
    if (currentOffer) {
      await supabase
        .from('order_offers')
        .update({ status: 'expired' })
        .eq('id', currentOffer.id)
    }

    // Get all riders who haven't been offered this order yet
    const offeredRiderIds = order.order_offers?.map(offer => offer.rider_id) || []
    
    const { data: availableRiders, error: ridersError } = await supabase
      .from('users')
      .select('id, lat, lng, name, phone')
      .eq('role', 'rider')
      .eq('is_online', true)
      .not('id', 'in', `(${offeredRiderIds.join(',')})`)

    if (ridersError) {
      console.error('Error fetching available riders:', ridersError)
      return NextResponse.json({ error: 'Failed to fetch available riders' }, { status: 500 })
    }

    if (!availableRiders || availableRiders.length === 0) {
      // No more riders available, cancel the order
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)

      return NextResponse.json({
        success: true,
        status: 'cancelled',
        message: 'No more riders available, order cancelled'
      })
    }

    // Calculate distance for each rider and sort them
    const ridersWithDistance = availableRiders.map(rider => {
      if (!rider.lat || !rider.lng) return { ...rider, distance: Infinity }
      
      const distance = calculateDistance(
        rider.lat, rider.lng,
        order.pickup_lat, order.pickup_lng
      )
      return { ...rider, distance }
    }).sort((a, b) => a.distance - b.distance)

    // Check if any riders are on the same route
    const ridersOnRoute = ridersWithDistance.filter(rider => 
      isRiderOnRoute(
        rider.lat!, rider.lng!,
        order.pickup_lat, order.pickup_lng,
        order.drop_lat, order.drop_lng
      )
    )

    const otherRiders = ridersWithDistance.filter(rider => 
      !isRiderOnRoute(
        rider.lat!, rider.lng!,
        order.pickup_lat, order.pickup_lng,
        order.drop_lat, order.drop_lng
      )
    )

    // Combine: route riders first, then others
    const allRiders = [...ridersOnRoute, ...otherRiders]

    if (allRiders.length === 0) {
      // No more riders available
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)

      return NextResponse.json({
        success: true,
        status: 'cancelled',
        message: 'No more riders available, order cancelled'
      })
    }

    // Offer to the next rider
    const nextRider = allRiders[0]
    const newOfferExpiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now

    // Create offer for next rider
    const { error: offerError } = await supabase
      .from('order_offers')
      .insert([{
        order_id: orderId,
        rider_id: nextRider.id,
        status: 'offered'
      }])

    if (offerError) {
      console.error('Error creating next offer:', offerError)
      return NextResponse.json({ error: 'Failed to create next offer' }, { status: 500 })
    }

    // Update order with new offer expiration
    await supabase
      .from('orders')
      .update({ 
        offer_expires_at: newOfferExpiresAt.toISOString()
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      status: 'assigned',
      nextRider: {
        id: nextRider.id,
        name: nextRider.name,
        phone: nextRider.phone
      },
      offerExpiresAt: newOfferExpiresAt.toISOString(),
      message: `Offer sent to next rider: ${nextRider.name || nextRider.phone}`
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Helper function to check if rider is on the same route
function isRiderOnRoute(riderLat: number, riderLng: number, pickupLat: number, pickupLng: number, dropLat: number, dropLng: number): boolean {
  // Calculate distance from rider to pickup and drop points
  const distanceToPickup = calculateDistance(riderLat, riderLng, pickupLat, pickupLng)
  const distanceToDrop = calculateDistance(riderLat, riderLng, dropLat, dropLng)
  const pickupToDrop = calculateDistance(pickupLat, pickupLng, dropLat, dropLng)
  
  // If rider is close to the route (within 2km of pickup or drop), consider them on route
  return distanceToPickup <= 2 || distanceToDrop <= 2
}
