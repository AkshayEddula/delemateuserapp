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

// Move to next rider in the queue
async function moveToNextRider(orderId: string, order: any) {
  try {
    // Get all riders who have been offered this order
    const { data: existingOffers, error: offersError } = await supabase
      .from('order_offers')
      .select('rider_id')
      .eq('order_id', orderId)

    if (offersError) {
      console.error('Error fetching existing offers:', offersError)
      return { success: false, error: offersError.message }
    }

    const offeredRiderIds = existingOffers?.map(offer => offer.rider_id) || []
    console.log(`Timer moveToNextRider for order ${orderId}: Already offered to riders:`, offeredRiderIds)

    // Find all available riders first
    const { data: allRiders, error: ridersError } = await supabase
      .from('users')
      .select('id, lat, lng, name, phone')
      .eq('role', 'rider')
      .eq('is_online', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)

    if (ridersError) {
      console.error('Error fetching riders:', ridersError)
      return { success: false, error: ridersError.message }
    }

    // Filter out riders who have already been offered
    const riders = allRiders?.filter(rider => !offeredRiderIds.includes(rider.id)) || []
    console.log(`Timer moveToNextRider for order ${orderId}: Available riders after filtering:`, riders.length, riders.map(r => r.id))

    if (!riders || riders.length === 0) {
      // No more riders available - cancel order
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)

      return { 
        success: false, 
        message: 'No more riders available',
        order_status: 'cancelled'
      }
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
      console.log(`Timer moveToNextRider for order ${orderId}: Offering to next rider:`, nextRider.id, nextRider.name)
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
        return { success: false, error: offerError.message }
      }

      // Update order with new offer expiration
      await supabase
        .from('orders')
        .update({ 
          offer_expires_at: offerExpiresAt.toISOString()
        })
        .eq('id', orderId)

      return { 
        success: true, 
        message: 'Offer sent to next rider',
        currentRider: nextRider,
        remainingRiders: riders.length - 1
      }
    } else {
      // No more riders available
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)

      return { 
        success: false, 
        message: 'No more riders available',
        order_status: 'cancelled'
      }
    }
  } catch (error) {
    console.error('Error moving to next rider:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Get order details with offer information
    const { data: order, error } = await supabase
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

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If order is not in assigned status, no timer needed
    if (order.status !== 'assigned') {
      return NextResponse.json({
        hasTimer: false,
        status: order.status,
        message: 'Order is not waiting for riders'
      })
    }

    const now = new Date()
    const orderCreatedAt = new Date(order.created_at)

    // Check if current offer has been declined
    const currentOffer = order.order_offers?.find(offer => offer.status === 'offered')
    const declinedOffers = order.order_offers?.filter(offer => offer.status === 'declined') || []
    
    console.log(`Timer check for order ${orderId}:`, {
      currentOffer: currentOffer?.rider_id,
      declinedCount: declinedOffers.length,
      declinedRiders: declinedOffers.map(d => d.rider_id)
    })
    
    // If there are declined offers and we have a current offer, check if we need to progress
    if (declinedOffers.length > 0) {
      // Check if the current offer is the same as any declined offer (shouldn't happen, but just in case)
      const currentOfferDeclined = declinedOffers.some(declined => declined.rider_id === currentOffer?.rider_id)
      
      if (currentOfferDeclined || !currentOffer) {
        console.log(`Order ${orderId}: Current offer was declined or no current offer, progressing to next rider`)
        const progressionResult = await moveToNextRider(orderId, order)
        
        if (progressionResult.success) {
          return NextResponse.json({
            hasTimer: true,
            status: 'assigned',
            currentRider: {
              number: declinedOffers.length + 1,
              timeRemaining: 120
            },
            totalTimeRemaining: 1800 - Math.floor((now.getTime() - orderCreatedAt.getTime()) / 1000),
            message: progressionResult.message
          })
        } else {
          return NextResponse.json({
            hasTimer: false,
            status: progressionResult.order_status || 'cancelled',
            message: progressionResult.message
          })
        }
      }
    }
    const totalTimeElapsed = Math.floor((now.getTime() - orderCreatedAt.getTime()) / 1000) // seconds
    const totalTimeRemaining = Math.max(0, 1800 - totalTimeElapsed) // 30 minutes = 1800 seconds
    
    // Check if total time has expired (30 minutes)
    if (totalTimeRemaining <= 0) {
      console.log(`Order ${orderId}: Total time expired (30 minutes), cancelling order`)
      
      // Cancel the order
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
      
      return NextResponse.json({
        hasTimer: false,
        status: 'cancelled',
        message: 'Order cancelled - no riders accepted within 30 minutes'
      })
    }

    // Calculate current rider timer
    let currentRiderTimeRemaining = 0
    let currentRiderNumber = 1

    if (order.offer_expires_at) {
      const offerExpiresAt = new Date(order.offer_expires_at)
      currentRiderTimeRemaining = Math.max(0, Math.floor((offerExpiresAt.getTime() - now.getTime()) / 1000))
      
      // Calculate which rider we're currently on based on elapsed time
      const ridersElapsed = Math.floor(totalTimeElapsed / 120) // 2 minutes = 120 seconds per rider
      currentRiderNumber = ridersElapsed + 1
    }

    // Check if we need to move to next rider
    if (currentRiderTimeRemaining <= 0 && totalTimeRemaining > 0) {
      console.log(`Order ${orderId}: Rider ${currentRiderNumber} time expired, moving to next rider`)
      
      // Mark current offer as declined due to timeout
      if (currentOffer) {
        await supabase
          .from('order_offers')
          .update({ status: 'declined' })
          .eq('id', currentOffer.id)
        console.log(`Order ${orderId}: Marked current offer as declined due to timeout`)
      }
      
      // Actually move to the next rider
      const progressionResult = await moveToNextRider(orderId, order)
      
      if (progressionResult.success) {
        const nextRiderNumber = currentRiderNumber + 1
        const nextRiderTimeRemaining = Math.min(120, totalTimeRemaining) // 2 minutes or remaining time
        
        return NextResponse.json({
          hasTimer: true,
          status: 'assigned',
          currentRider: {
            number: nextRiderNumber,
            timeRemaining: nextRiderTimeRemaining
          },
          totalTimeRemaining,
          message: progressionResult.message || `Moved to rider ${nextRiderNumber}`
        })
      } else {
        return NextResponse.json({
          hasTimer: false,
          status: progressionResult.order_status || 'cancelled',
          message: progressionResult.message || 'No more riders available'
        })
      }
    }

    return NextResponse.json({
      hasTimer: true,
      status: 'assigned',
      currentRider: {
        number: currentRiderNumber,
        timeRemaining: currentRiderTimeRemaining
      },
      totalTimeRemaining,
      needsProgression: false,
      message: `Waiting for rider ${currentRiderNumber} to respond`
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
