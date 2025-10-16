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
function calculateOrderPrice(distance: number): { totalPrice: number, commission: number, riderEarnings: number, breakdown: any } {
  const baseFare = 30 // ₹30 for first 2km
  
  if (distance <= 2) {
    // 0-2 km: ₹30 flat, 15% commission
    const totalPrice = baseFare
    const commission = totalPrice * 0.15
    const riderEarnings = totalPrice - commission
    return { 
      totalPrice, 
      commission, 
      riderEarnings,
      breakdown: {
        baseFare: 30,
        distanceFare: 0,
        totalDistance: distance,
        commissionRate: 15
      }
    }
  }
  
  let totalPrice = baseFare // Start with base fare
  let commissionRate = 0.15
  let breakdown = {
    baseFare: 30,
    distanceFare: 0,
    totalDistance: distance,
    commissionRate: 15,
    tiers: []
  }
  
  // 2-8 km: ₹5.5/km, 15% commission
  if (distance <= 8) {
    const distanceFare = (distance - 2) * 5.5
    totalPrice += distanceFare
    breakdown.distanceFare = distanceFare
    breakdown.tiers.push({
      range: '2-8 km',
      rate: '₹5.5/km',
      distance: distance - 2,
      fare: distanceFare
    })
  }
  // 8-15 km: ₹6/km, 15% commission
  else if (distance <= 15) {
    const tier1Fare = (8 - 2) * 5.5
    const tier2Fare = (distance - 8) * 6
    totalPrice += tier1Fare + tier2Fare
    breakdown.distanceFare = tier1Fare + tier2Fare
    breakdown.tiers.push(
      { range: '2-8 km', rate: '₹5.5/km', distance: 6, fare: tier1Fare },
      { range: '8-15 km', rate: '₹6/km', distance: distance - 8, fare: tier2Fare }
    )
  }
  // 15-25 km: ₹6.5/km, 12% commission
  else if (distance <= 25) {
    const tier1Fare = (8 - 2) * 5.5
    const tier2Fare = (15 - 8) * 6
    const tier3Fare = (distance - 15) * 6.5
    totalPrice += tier1Fare + tier2Fare + tier3Fare
    breakdown.distanceFare = tier1Fare + tier2Fare + tier3Fare
    commissionRate = 0.12
    breakdown.commissionRate = 12
    breakdown.tiers.push(
      { range: '2-8 km', rate: '₹5.5/km', distance: 6, fare: tier1Fare },
      { range: '8-15 km', rate: '₹6/km', distance: 7, fare: tier2Fare },
      { range: '15-25 km', rate: '₹6.5/km', distance: distance - 15, fare: tier3Fare }
    )
  }
  // 25-40 km: ₹7/km, 12% commission
  else if (distance <= 40) {
    const tier1Fare = (8 - 2) * 5.5
    const tier2Fare = (15 - 8) * 6
    const tier3Fare = (25 - 15) * 6.5
    const tier4Fare = (distance - 25) * 7
    totalPrice += tier1Fare + tier2Fare + tier3Fare + tier4Fare
    breakdown.distanceFare = tier1Fare + tier2Fare + tier3Fare + tier4Fare
    commissionRate = 0.12
    breakdown.commissionRate = 12
    breakdown.tiers.push(
      { range: '2-8 km', rate: '₹5.5/km', distance: 6, fare: tier1Fare },
      { range: '8-15 km', rate: '₹6/km', distance: 7, fare: tier2Fare },
      { range: '15-25 km', rate: '₹6.5/km', distance: 10, fare: tier3Fare },
      { range: '25-40 km', rate: '₹7/km', distance: distance - 25, fare: tier4Fare }
    )
  }
  // 40-65 km: ₹6/km, 10% commission
  else if (distance <= 65) {
    const tier1Fare = (8 - 2) * 5.5
    const tier2Fare = (15 - 8) * 6
    const tier3Fare = (25 - 15) * 6.5
    const tier4Fare = (40 - 25) * 7
    const tier5Fare = (distance - 40) * 6
    totalPrice += tier1Fare + tier2Fare + tier3Fare + tier4Fare + tier5Fare
    breakdown.distanceFare = tier1Fare + tier2Fare + tier3Fare + tier4Fare + tier5Fare
    commissionRate = 0.10
    breakdown.commissionRate = 10
    breakdown.tiers.push(
      { range: '2-8 km', rate: '₹5.5/km', distance: 6, fare: tier1Fare },
      { range: '8-15 km', rate: '₹6/km', distance: 7, fare: tier2Fare },
      { range: '15-25 km', rate: '₹6.5/km', distance: 10, fare: tier3Fare },
      { range: '25-40 km', rate: '₹7/km', distance: 15, fare: tier4Fare },
      { range: '40-65 km', rate: '₹6/km', distance: distance - 40, fare: tier5Fare }
    )
  }
  // Beyond 65 km: ₹6/km, 10% commission
  else {
    const tier1Fare = (8 - 2) * 5.5
    const tier2Fare = (15 - 8) * 6
    const tier3Fare = (25 - 15) * 6.5
    const tier4Fare = (40 - 25) * 7
    const tier5Fare = (65 - 40) * 6
    const tier6Fare = (distance - 65) * 6
    totalPrice += tier1Fare + tier2Fare + tier3Fare + tier4Fare + tier5Fare + tier6Fare
    breakdown.distanceFare = tier1Fare + tier2Fare + tier3Fare + tier4Fare + tier5Fare + tier6Fare
    commissionRate = 0.10
    breakdown.commissionRate = 10
    breakdown.tiers.push(
      { range: '2-8 km', rate: '₹5.5/km', distance: 6, fare: tier1Fare },
      { range: '8-15 km', rate: '₹6/km', distance: 7, fare: tier2Fare },
      { range: '15-25 km', rate: '₹6.5/km', distance: 10, fare: tier3Fare },
      { range: '25-40 km', rate: '₹7/km', distance: 15, fare: tier4Fare },
      { range: '40-65 km', rate: '₹6/km', distance: 25, fare: tier5Fare },
      { range: '65+ km', rate: '₹6/km', distance: distance - 65, fare: tier6Fare }
    )
  }
  
  const commission = totalPrice * commissionRate
  const riderEarnings = totalPrice - commission
  
  return { 
    totalPrice: Math.round(totalPrice), 
    commission: Math.round(commission), 
    riderEarnings: Math.round(riderEarnings),
    breakdown
  }
}

// Calculate pricing for a route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pickup_lat, pickup_lng, drop_lat, drop_lng } = body

    if (!pickup_lat || !pickup_lng || !drop_lat || !drop_lng) {
      return NextResponse.json({ error: 'Pickup and drop coordinates are required' }, { status: 400 })
    }

    // Calculate distance
    const distance = calculateDistance(pickup_lat, pickup_lng, drop_lat, drop_lng)
    
    // Calculate pricing
    const pricing = calculateOrderPrice(distance)

    return NextResponse.json({
      distance: Math.round(distance * 100) / 100,
      pricing: {
        totalPrice: pricing.totalPrice,
        commission: pricing.commission,
        riderEarnings: pricing.riderEarnings,
        breakdown: pricing.breakdown
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
