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

// Helper function to check if rider is on the same route
function isRiderOnRoute(riderLat: number, riderLng: number, pickupLat: number, pickupLng: number, dropLat: number, dropLng: number): boolean {
  const distanceToPickup = calculateDistance(riderLat, riderLng, pickupLat, pickupLng)
  const distanceToDrop = calculateDistance(riderLat, riderLng, dropLat, dropLng)
  const totalRouteDistance = calculateDistance(pickupLat, pickupLng, dropLat, dropLng)
  
  const maxDetourDistance = totalRouteDistance * 1.5
  const riderTotalDistance = distanceToPickup + totalRouteDistance + distanceToDrop
  
  return distanceToPickup <= 5 && riderTotalDistance <= maxDetourDistance
}

// Handle rider response to offer (accept/decline)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, rider_id, response } = body // response: 'accepted' or 'declined'

    if (!order_id || !rider_id || !response) {
      return NextResponse.json({ error: 'Order ID, rider ID, and response are required' }, { status: 400 })
    }

    // Update the offer status
    const { error: offerError } = await supabase
      .from('order_offers')
      .update({ status: response })
      .eq('order_id', order_id)
      .eq('rider_id', rider_id)

    if (offerError) {
      console.error('Error updating offer:', offerError)
      return NextResponse.json({ error: offerError.message }, { status: 500 })
    }

    if (response === 'accepted') {
      // Rider accepted - assign order to rider
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted',
          driver_id: rider_id,
          offer_expires_at: null
        })
        .eq('id', order_id)

      if (orderError) {
        console.error('Error updating order:', orderError)
        return NextResponse.json({ error: orderError.message }, { status: 500 })
      }

      // Mark all other offers as declined
      await supabase
        .from('order_offers')
        .update({ status: 'declined' })
        .eq('order_id', order_id)
        .neq('rider_id', rider_id)

      return NextResponse.json({ 
        success: true, 
        message: 'Order accepted by rider',
        order_status: 'accepted'
      })
    } else {
      // Rider declined - move to next rider
      return await moveToNextRider(order_id)
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Move to next rider in the queue
async function moveToNextRider(orderId: string) {
  try {
    // Get the order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get all riders who have been offered this order
    const { data: existingOffers, error: offersError } = await supabase
      .from('order_offers')
      .select('rider_id')
      .eq('order_id', orderId)

    if (offersError) {
      console.error('Error fetching existing offers:', offersError)
      return NextResponse.json({ error: offersError.message }, { status: 500 })
    }

    const offeredRiderIds = existingOffers?.map(offer => offer.rider_id) || []

    // Find available riders who haven't been offered yet
    const { data: riders, error: ridersError } = await supabase
      .from('users')
      .select('id, lat, lng, name, phone')
      .eq('role', 'rider')
      .eq('is_online', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .not('id', 'in', `(${offeredRiderIds.join(',')})`)

    if (ridersError) {
      console.error('Error fetching riders:', ridersError)
      return NextResponse.json({ error: ridersError.message }, { status: 500 })
    }

    if (!riders || riders.length === 0) {
      // No more riders available - cancel order
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)

      return NextResponse.json({ 
        success: false, 
        message: 'No more riders available',
        order_status: 'cancelled'
      })
    }

    // Categorize remaining riders: those on route vs others
    const ridersOnRoute = []
    const otherRiders = []

    riders.forEach(rider => {
      const isOnRoute = isRiderOnRoute(rider.lat!, rider.lng!, order.pickup_lat, order.pickup_lng, order.drop_lat, order.drop_lng)
      const distance = calculateDistance(order.pickup_lat, order.pickup_lng, rider.lat!, rider.lng!)
      
      if (isOnRoute) {
        ridersOnRoute.push({ ...rider, distance, isOnRoute: true })
      } else {
        otherRiders.push({ ...rider, distance, isOnRoute: false })
      }
    })

    // Sort each category by distance
    ridersOnRoute.sort((a, b) => a.distance - b.distance)
    otherRiders.sort((a, b) => a.distance - b.distance)

    // Get the next rider
    const nextRider = [...ridersOnRoute, ...otherRiders][0]

    if (nextRider) {
      const offerExpiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
      
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
        return NextResponse.json({ error: offerError.message }, { status: 500 })
      }

      // Update order with new offer expiration
      await supabase
        .from('orders')
        .update({ 
          offer_expires_at: offerExpiresAt.toISOString()
        })
        .eq('id', orderId)

      return NextResponse.json({ 
        success: true, 
        message: 'Offer sent to next rider',
        currentRider: nextRider,
        remainingRiders: riders.length - 1
      })
    } else {
      // No more riders available
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)

      return NextResponse.json({ 
        success: false, 
        message: 'No more riders available',
        order_status: 'cancelled'
      })
    }
  } catch (error) {
    console.error('Error moving to next rider:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Check for expired offers and move to next rider
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Check if current offer has expired
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.offer_expires_at) {
      return NextResponse.json({ error: 'No active offer found' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(order.offer_expires_at)

    if (now > expiresAt) {
      // Offer has expired - mark as declined and move to next rider
      const { error: expireError } = await supabase
        .from('order_offers')
        .update({ status: 'expired' })
        .eq('order_id', orderId)
        .eq('status', 'offered')

      if (expireError) {
        console.error('Error expiring offer:', expireError)
      }

      return await moveToNextRider(orderId)
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'Offer still active',
        expires_at: order.offer_expires_at
      })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
