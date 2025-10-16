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

// Pricing calculation based on distance-based fare structure
function calculateOrderPrice(distance: number): { totalPrice: number, commission: number, riderEarnings: number } {
  const baseFare = 30 // ₹30 for first 2km
  
  if (distance <= 2) {
    // 0-2 km: ₹30 flat, 15% commission
    const totalPrice = baseFare
    const commission = Math.round(totalPrice * 0.15)
    const riderEarnings = totalPrice - commission
    return { totalPrice, commission, riderEarnings }
  }
  
  let totalPrice = baseFare // Start with base fare
  let commissionRate = 0.15
  
  // 2-8 km: ₹5.5/km, 15% commission
  if (distance <= 8) {
    totalPrice += (distance - 2) * 5.5
    commissionRate = 0.15
  }
  // 8-15 km: ₹6/km, 15% commission
  else if (distance <= 15) {
    totalPrice += (8 - 2) * 5.5 + (distance - 8) * 6
    commissionRate = 0.15
  }
  // 15-25 km: ₹6.5/km, 12% commission
  else if (distance <= 25) {
    totalPrice += (8 - 2) * 5.5 + (15 - 8) * 6 + (distance - 15) * 6.5
    commissionRate = 0.12
  }
  // 25-40 km: ₹7/km, 12% commission
  else if (distance <= 40) {
    totalPrice += (8 - 2) * 5.5 + (15 - 8) * 6 + (25 - 15) * 6.5 + (distance - 25) * 7
    commissionRate = 0.12
  }
  // 40-65 km: ₹6/km, 10% commission
  else if (distance <= 65) {
    totalPrice += (8 - 2) * 5.5 + (15 - 8) * 6 + (25 - 15) * 6.5 + (40 - 25) * 7 + (distance - 40) * 6
    commissionRate = 0.10
  }
  // Beyond 65 km: ₹6/km, 10% commission
  else {
    totalPrice += (8 - 2) * 5.5 + (15 - 8) * 6 + (25 - 15) * 6.5 + (40 - 25) * 7 + (65 - 40) * 6 + (distance - 65) * 6
    commissionRate = 0.10
  }
  
  // Round total price first
  const roundedTotalPrice = Math.round(totalPrice)
  
  // Calculate commission and ensure consistency
  const commission = Math.round(roundedTotalPrice * commissionRate)
  const riderEarnings = roundedTotalPrice - commission
  
  return { 
    totalPrice: roundedTotalPrice, 
    commission, 
    riderEarnings
  }
}

// Helper function to check if rider is on the same route
function isRiderOnRoute(riderLat: number, riderLng: number, pickupLat: number, pickupLng: number, dropLat: number, dropLng: number): boolean {
  // Calculate distance from rider to pickup and drop points
  const distanceToPickup = calculateDistance(riderLat, riderLng, pickupLat, pickupLng)
  const distanceToDrop = calculateDistance(riderLat, riderLng, dropLat, dropLng)
  const totalRouteDistance = calculateDistance(pickupLat, pickupLng, dropLat, dropLng)
  
  // Rider is considered "on route" if they're within 5km of pickup or drop point
  // and the total distance they'd travel is not more than 50% longer than direct route
  const maxDetourDistance = totalRouteDistance * 1.5
  const riderTotalDistance = distanceToPickup + totalRouteDistance + distanceToDrop
  
  return distanceToPickup <= 5 && riderTotalDistance <= maxDetourDistance
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, pickup_lat, pickup_lng, drop_lat, drop_lng, package_details, status } = body

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Calculate distance and pricing
    const distance = calculateDistance(pickup_lat, pickup_lng, drop_lat, drop_lng)
    const pricing = calculateOrderPrice(distance)

    // First, create the order with pricing information
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        user_id,
        pickup_lat,
        pickup_lng,
        drop_lat,
        drop_lng,
        distance_km: Math.round(distance * 100) / 100, // Round to 2 decimal places
        total_price: pricing.totalPrice,
        commission: pricing.commission,
        rider_earnings: pricing.riderEarnings,
        package_details: {
          ...package_details,
          distance: Math.round(distance * 100) / 100, // Keep in package_details for backward compatibility
          total_price: pricing.totalPrice,
          commission: pricing.commission,
          rider_earnings: pricing.riderEarnings
        },
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

    // Categorize riders: those on route vs others
    const ridersOnRoute = []
    const otherRiders = []

    riders.forEach(rider => {
      const isOnRoute = isRiderOnRoute(rider.lat!, rider.lng!, pickup_lat, pickup_lng, drop_lat, drop_lng)
      const distance = calculateDistance(pickup_lat, pickup_lng, rider.lat!, rider.lng!)
      
      if (isOnRoute) {
        ridersOnRoute.push({ ...rider, distance, isOnRoute: true })
      } else {
        otherRiders.push({ ...rider, distance, isOnRoute: false })
      }
    })

    // Sort each category by distance
    ridersOnRoute.sort((a, b) => a.distance - b.distance)
    otherRiders.sort((a, b) => a.distance - b.distance)

    // Combine: route riders first, then others
    const allRiders = [...ridersOnRoute, ...otherRiders]

    // Start the sequential offering process
    // First, offer to the first rider (2 minutes)
    const firstRider = allRiders[0]
    if (firstRider) {
      const offerExpiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
      
      // Create offer for first rider
      const { error: offerError } = await supabase
        .from('order_offers')
        .insert([{
          order_id: order.id,
          rider_id: firstRider.id,
          status: 'offered'
        }])

      if (offerError) {
        console.error('Error creating first offer:', offerError)
      }

      // Update order with offer expiration (2 min for current rider)
      await supabase
        .from('orders')
        .update({ 
          status: 'assigned',
          offer_expires_at: offerExpiresAt.toISOString()
        })
        .eq('id', order.id)
    }

    return NextResponse.json({ 
      order: { 
        ...order, 
        status: 'assigned',
        pricing: {
          distance: Math.round(distance * 100) / 100,
          totalPrice: pricing.totalPrice,
          riderEarnings: pricing.riderEarnings, // What user pays to rider
          commission: pricing.commission // Hidden from user
        }
      }, 
      currentRider: firstRider,
      totalRiders: allRiders.length,
      status: 'assigned',
      message: 'Order created successfully! We are finding riders for you.',
      redirectTo: `/orders/track/${order.id}`
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
