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
    const { order_id, rider_id, action } = body

    if (!order_id || !rider_id || !action) {
      return NextResponse.json({ error: 'Order ID, rider ID, and action are required' }, { status: 400 })
    }

    // Update the order offer status
    const { error: offerError } = await supabase
      .from('order_offers')
      .update({ status: action })
      .eq('order_id', order_id)
      .eq('rider_id', rider_id)

    if (offerError) {
      console.error('Error updating offer:', offerError)
      return NextResponse.json({ error: offerError.message }, { status: 500 })
    }

    if (action === 'accepted') {
      // Rider accepted the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted',
          driver_id: rider_id
        })
        .eq('id', order_id)
        .select()
        .single()

      if (orderError) {
        console.error('Error updating order:', orderError)
        return NextResponse.json({ error: orderError.message }, { status: 500 })
      }

      // Mark all other offers as expired
      await supabase
        .from('order_offers')
        .update({ status: 'expired' })
        .eq('order_id', order_id)
        .neq('rider_id', rider_id)

      // Generate OTPs for the accepted order
      try {
        console.log('Generating OTPs for order:', order_id)
        
        // Generate OTPs manually
        const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString()
        const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()

        // Ensure delivery OTP is different from pickup OTP
        const finalDeliveryOtp = deliveryOtp === pickupOtp 
          ? Math.floor(1000 + Math.random() * 9000).toString()
          : deliveryOtp

        const { data: otpData, error: otpError } = await supabase
          .from('order_otps')
          .insert([{
            order_id: order_id,
            pickup_otp: pickupOtp,
            delivery_otp: finalDeliveryOtp
          }])

        if (otpError) {
          console.error('Error generating OTPs:', otpError)
        } else {
          console.log('OTPs generated successfully:', { pickupOtp, deliveryOtp: finalDeliveryOtp })
        }
      } catch (otpError) {
        console.error('Error generating OTPs:', otpError)
      }

      return NextResponse.json({ order, status: 'accepted' })
    } else if (action === 'declined') {
      // Check if there are other riders who haven't responded yet
      const { data: remainingOffers, error: offersError } = await supabase
        .from('order_offers')
        .select('rider_id, status')
        .eq('order_id', order_id)
        .eq('status', 'offered')

      if (offersError) {
        console.error('Error checking remaining offers:', offersError)
        return NextResponse.json({ error: offersError.message }, { status: 500 })
      }

      if (remainingOffers && remainingOffers.length > 0) {
        // There are still riders who haven't responded
        return NextResponse.json({ status: 'waiting_for_others' })
      } else {
        // No more riders available, try to find new ones
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('pickup_lat, pickup_lng')
          .eq('id', order_id)
          .single()

        if (orderError) {
          console.error('Error fetching order:', orderError)
          return NextResponse.json({ error: orderError.message }, { status: 500 })
        }

        // Find riders who have already been offered this order (declined, expired, or accepted)
        const { data: offeredRiders } = await supabase
          .from('order_offers')
          .select('rider_id')
          .eq('order_id', order_id)

        const offeredRiderIds = offeredRiders?.map(r => r.rider_id) || []

        // If no riders available after excluding already offered ones, cancel the order
        if (offeredRiderIds.length === 0) {
          await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', order_id)
          return NextResponse.json({ status: 'cancelled' })
        }

        const { data: availableRiders, error: ridersError } = await supabase
          .from('users')
          .select('id, lat, lng, name, phone')
          .eq('role', 'rider')
          .eq('is_online', true)
          .not('lat', 'is', null)
          .not('lng', 'is', null)
          .not('id', 'in', `(${offeredRiderIds.join(',')})`)

        if (ridersError || !availableRiders || availableRiders.length === 0) {
          // No more riders available, cancel the order
          await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', order_id)

          return NextResponse.json({ status: 'cancelled' })
        }

        // Calculate distances and find nearest available riders
        const ridersWithDistance = availableRiders.map(rider => ({
          ...rider,
          distance: calculateDistance(order.pickup_lat, order.pickup_lng, rider.lat!, rider.lng!)
        })).sort((a, b) => a.distance - b.distance)

        const nearestRiders = ridersWithDistance.slice(0, 3)

        // Create new offers - check if we're in first 30s or remaining time
        const { data: orderDetails } = await supabase
          .from('orders')
          .select('created_at, offer_expires_at')
          .eq('id', order_id)
          .single()

        const orderCreatedAt = new Date(orderDetails?.created_at || Date.now())
        const timeElapsed = Date.now() - orderCreatedAt.getTime()
        const remainingTime = Math.max(0, 120000 - timeElapsed) // 120 seconds total
        
        const offerExpiresAt = new Date(Date.now() + remainingTime)
        
        const { error: newOffersError } = await supabase
          .from('order_offers')
          .insert(nearestRiders.map(rider => ({
            order_id: order_id,
            rider_id: rider.id,
            status: 'offered'
          })))

        if (newOffersError) {
          console.error('Error creating new offers:', newOffersError)
        }

        // Update order with new expiration
        await supabase
          .from('orders')
          .update({ 
            offer_expires_at: offerExpiresAt.toISOString()
          })
          .eq('id', order_id)

        return NextResponse.json({ 
          status: 'new_offers_created',
          riders: nearestRiders
        })
      }
    }

    return NextResponse.json({ status: 'updated' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
