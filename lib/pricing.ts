// Helper function to calculate distance between two points (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
export function calculateOrderPrice(distance: number): { 
  totalPrice: number, 
  commission: number, 
  riderEarnings: number,
  breakdown: {
    baseFare: number,
    distanceFare: number,
    totalDistance: number
  }
} {
  const baseFare = 30 // ₹30 for first 2km
  const totalDistance = Math.round(distance * 100) / 100
  
  if (distance <= 2) {
    // 0-2 km: ₹30 flat, 15% commission
    const totalPrice = baseFare
    const commission = Math.round(totalPrice * 0.15)
    const riderEarnings = totalPrice - commission
    return { 
      totalPrice, 
      commission, 
      riderEarnings,
      breakdown: {
        baseFare: baseFare,
        distanceFare: 0,
        totalDistance
      }
    }
  }
  
  let totalPrice = baseFare // Start with base fare
  let commissionRate = 0.15
  let distanceFare = 0
  
  // 2-8 km: ₹5.5/km, 15% commission
  if (distance <= 8) {
    distanceFare = (distance - 2) * 5.5
    totalPrice += distanceFare
    commissionRate = 0.15
  }
  // 8-15 km: ₹6/km, 15% commission
  else if (distance <= 15) {
    distanceFare = (8 - 2) * 5.5 + (distance - 8) * 6
    totalPrice += distanceFare
    commissionRate = 0.15
  }
  // 15-25 km: ₹6.5/km, 12% commission
  else if (distance <= 25) {
    distanceFare = (8 - 2) * 5.5 + (15 - 8) * 6 + (distance - 15) * 6.5
    totalPrice += distanceFare
    commissionRate = 0.12
  }
  // 25-40 km: ₹7/km, 12% commission
  else if (distance <= 40) {
    distanceFare = (8 - 2) * 5.5 + (15 - 8) * 6 + (25 - 15) * 6.5 + (distance - 25) * 7
    totalPrice += distanceFare
    commissionRate = 0.12
  }
  // 40-65 km: ₹6/km, 10% commission
  else if (distance <= 65) {
    distanceFare = (8 - 2) * 5.5 + (15 - 8) * 6 + (25 - 15) * 6.5 + (40 - 25) * 7 + (distance - 40) * 6
    totalPrice += distanceFare
    commissionRate = 0.10
  }
  // Beyond 65 km: ₹6/km, 10% commission
  else {
    distanceFare = (8 - 2) * 5.5 + (15 - 8) * 6 + (25 - 15) * 6.5 + (40 - 25) * 7 + (65 - 40) * 6 + (distance - 65) * 6
    totalPrice += distanceFare
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
    riderEarnings,
    breakdown: {
      baseFare: baseFare,
      distanceFare: Math.round(distanceFare),
      totalDistance
    }
  }
}
