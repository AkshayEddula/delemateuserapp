'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import GoogleMapsScript from '@/components/GoogleMapsScript'

type Order = {
  id: string
  status: string
  pickup_lat?: number
  pickup_lng?: number
  drop_lat?: number
  drop_lng?: number
  pickup?: {
    lat: number
    lng: number
  }
  drop?: {
    lat: number
    lng: number
  }
  package_details: any
  driver_id: string
  created_at: string
  driver?: {
    name: string
    phone: string
  }
  pricing?: {
    distance: number
    totalPrice: number
    commission: number
    riderEarnings: number
    breakdown: {
      baseFare: number
      distanceFare: number
      commissionRate: number
    }
  }
}

type DriverLocation = {
  lat: number
  lng: number
  created_at: string
}

type OTPs = {
  pickup_otp: string
  delivery_otp: string
  pickup_verified: boolean
  delivery_verified: boolean
}

export default function OrderTrackingPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const { user } = useAuth()
  
  const [order, setOrder] = useState<Order | null>(null)
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
  const [otps, setOtps] = useState<OTPs | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [driverMarker, setDriverMarker] = useState<google.maps.Marker | null>(null)
  const [pickupMarker, setPickupMarker] = useState<google.maps.Marker | null>(null)
  const [dropMarker, setDropMarker] = useState<google.maps.Marker | null>(null)
  const [timer, setTimer] = useState(0)
  const [totalTimer, setTotalTimer] = useState(0)
  const [currentRiderNumber, setCurrentRiderNumber] = useState(1)
  const [timerData, setTimerData] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      console.log('Fetching order details for ID:', orderId)
      fetchOrderDetails()
    }
  }, [orderId])

  // Fetch timer data from server
  const fetchTimerData = async () => {
    if (!orderId) return
    
    try {
      const response = await fetch(`/api/orders/timer?order_id=${orderId}`)
      const data = await response.json()
      
      if (response.ok) {
        setTimerData(data)
        
        // Check if order status changed (e.g., cancelled)
        if (data.status && data.status !== 'assigned') {
          console.log('Order status changed to:', data.status)
          // Refresh order details to get updated status
          await fetchOrderDetails()
          return
        }
        
        if (data.hasTimer) {
          setTimer(data.currentRider.timeRemaining)
          setTotalTimer(data.totalTimeRemaining)
          setCurrentRiderNumber(data.currentRider.number)
          
          // If timer needs progression, trigger it
          if (data.needsProgression) {
            await progressToNextRider()
          }
        }
      }
    } catch (error) {
      console.error('Error fetching timer data:', error)
    }
  }

  // Progress to next rider when current one expires
  const progressToNextRider = async () => {
    try {
      const response = await fetch('/api/orders/progress-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      
      const data = await response.json()
      if (response.ok) {
        console.log('Progressed to next rider:', data.message)
        // Refresh order details and timer
        await fetchOrderDetails()
        await fetchTimerData()
      }
    } catch (error) {
      console.error('Error progressing to next rider:', error)
    }
  }

  // Timer polling for waiting status
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (order && order.status === 'assigned') {
      // Fetch timer data immediately
      fetchTimerData()
      
      // Then poll every 3 seconds for faster updates when riders decline
      interval = setInterval(() => {
        fetchTimerData()
      }, 3000)
    } else if (order && order.status === 'cancelled') {
      // Clear any existing timers when order is cancelled
      console.log('Order cancelled, stopping timer polling')
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [order, orderId])

  useEffect(() => {
    if (order && order.status === 'accepted') {
      console.log('Order is accepted, fetching OTPs and starting location tracking')
      // Automatically generate OTPs if they don't exist
      generateOTPs()
      startLocationTracking()
    } else if (order) {
      console.log('Order status:', order.status, '- not fetching OTPs yet')
    }
  }, [order])

  useEffect(() => {
    if (isGoogleMapsLoaded && order) {
      // Add a longer delay to ensure Google Maps is fully loaded
      setTimeout(() => {
        initializeMap()
      }, 1000)
    }
  }, [isGoogleMapsLoaded, order])

  const fetchOrderDetails = async () => {
    try {
      console.log('Attempting to fetch order with ID:', orderId)
      console.log('Current user:', user?.id)
      
      // Use API route to bypass RLS issues
      const response = await fetch(`/api/orders/details?order_id=${orderId}`)
      const data = await response.json()
      
      if (response.ok) {
        console.log('Order found via API:', data)
        setOrder(data.order)
      } else {
        console.error('API error:', data.error)
        setOrder(null)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchOTPs = async () => {
    try {
      console.log('Fetching OTPs for order:', orderId)
      const response = await fetch(`/api/orders/otp?order_id=${orderId}`)
      const data = await response.json()
      
      console.log('OTP API response:', { status: response.status, data })
      
      if (response.ok) {
        setOtps(data)
        console.log('OTPs loaded successfully:', data)
      } else if (response.status === 404) {
        console.log('OTPs not found - trying to generate them')
        // Try to generate OTPs if they don't exist
        await generateOTPs()
      } else {
        console.error('OTP API error:', data.error)
        // Try to generate OTPs as fallback
        await generateOTPs()
      }
    } catch (error) {
      console.error('Error fetching OTPs:', error)
      // Try to generate OTPs as fallback
      await generateOTPs()
    }
  }

  const generateOTPs = async () => {
    try {
      console.log('Generating OTPs for order:', orderId)
      const response = await fetch('/api/orders/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      })
      
      const data = await response.json()
      console.log('OTP generation response:', { status: response.status, data })
      
      if (response.ok) {
        setOtps(data)
        console.log('OTPs generated successfully:', data)
      } else {
        console.error('Failed to generate OTPs:', data.error)
      }
    } catch (error) {
      console.error('Error generating OTPs:', error)
    }
  }

  const startLocationTracking = () => {
    // Set up real-time subscription for driver location
    const channel = supabase
      .channel(`driver_location_${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'driver_locations',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        const newLocation = payload.new as DriverLocation
        setDriverLocation(newLocation)
        updateDriverMarker(newLocation)
      })
      .subscribe()

    // Also fetch current location
    fetchDriverLocation()

    return () => supabase.removeChannel(channel)
  }

  const fetchDriverLocation = async () => {
    try {
      const response = await fetch(`/api/driver/location?order_id=${orderId}`)
      const data = await response.json()
      
      if (response.ok && data.locations && data.locations.length > 0) {
        const latestLocation = data.locations[0]
        setDriverLocation(latestLocation)
        updateDriverMarker(latestLocation)
      } else if (!response.ok) {
        console.error('Driver location API error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching driver location:', error)
    }
  }

  const initializeMap = () => {
    if (!order || !window.google) {
      console.log('Map initialization skipped - order or google not available:', { order: !!order, google: !!window.google })
      return
    }

    const mapElement = document.getElementById('map')
    if (!mapElement) {
      console.log('Map element not found')
      return
    }

    console.log('Initializing map with order:', order)

    // Validate coordinates - handle both nested and flat structure
    const pickupLat = parseFloat(order.pickup?.lat || order.pickup_lat)
    const pickupLng = parseFloat(order.pickup?.lng || order.pickup_lng)
    const dropLat = parseFloat(order.drop?.lat || order.drop_lat)
    const dropLng = parseFloat(order.drop?.lng || order.drop_lng)

    console.log('Order data structure:', order)
    console.log('Coordinates:', { pickupLat, pickupLng, dropLat, dropLng })

    // Check if coordinates are valid numbers
    if (isNaN(pickupLat) || isNaN(pickupLng) || isNaN(dropLat) || isNaN(dropLng)) {
      console.error('Invalid coordinates:', { pickupLat, pickupLng, dropLat, dropLng })
      console.error('Raw order data:', {
        pickup: order.pickup,
        drop: order.drop,
        pickup_lat: order.pickup_lat,
        pickup_lng: order.pickup_lng,
        drop_lat: order.drop_lat,
        drop_lng: order.drop_lng
      })
      return
    }

    // Use Mumbai as fallback center if coordinates are invalid
    const centerLat = isNaN(pickupLat) ? 19.0760 : pickupLat
    const centerLng = isNaN(pickupLng) ? 72.8777 : pickupLng

    try {
      const mapInstance = new google.maps.Map(mapElement, {
        zoom: 13,
        center: { lat: centerLat, lng: centerLng },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })

      setMap(mapInstance)

      // Add pickup marker
      const pickup = new google.maps.Marker({
        position: { lat: pickupLat, lng: pickupLng },
        map: mapInstance,
        title: 'Pickup Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#10B981" stroke="white" stroke-width="2"/>
              <path d="M12 6V12L16 14" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32)
        }
      })
      setPickupMarker(pickup)

      // Add drop marker
      const drop = new google.maps.Marker({
        position: { lat: dropLat, lng: dropLng },
        map: mapInstance,
        title: 'Delivery Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#EF4444" stroke="white" stroke-width="2"/>
              <path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32)
        }
      })
      setDropMarker(drop)

      // Add a simple line between pickup and drop as fallback
      const fallbackLine = new google.maps.Polyline({
        path: [
          { lat: pickupLat, lng: pickupLng },
          { lat: dropLat, lng: dropLng }
        ],
        geodesic: true,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.6,
        strokeWeight: 3
      })
      fallbackLine.setMap(mapInstance)

      // Add route between pickup and drop
      setTimeout(() => {
        if (window.google && window.google.maps && window.google.maps.DirectionsService) {
          console.log('Initializing directions service...')
          const directionsService = new google.maps.DirectionsService()
          const directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true, // We'll use our custom markers
            polylineOptions: {
              strokeColor: '#3B82F6',
              strokeWeight: 4,
              strokeOpacity: 0.8
            }
          })

          directionsRenderer.setMap(mapInstance)

          const request = {
            origin: { lat: pickupLat, lng: pickupLng },
            destination: { lat: dropLat, lng: dropLng },
            travelMode: google.maps.TravelMode.DRIVING
          }

          console.log('Requesting directions:', request)

          directionsService.route(request, (result, status) => {
            console.log('Directions response:', { status, result })
            if (status === 'OK') {
              directionsRenderer.setDirections(result)
              console.log('Route displayed successfully')
              // Remove the fallback line since we have proper directions
              fallbackLine.setMap(null)
            } else {
              console.error('Directions request failed:', status)
              console.log('Keeping fallback line as route display')
            }
          })
        } else {
          console.error('Google Maps DirectionsService not available')
        }
      }, 500) // Give more time for Google Maps to fully load
    } catch (error) {
      console.error('Map initialization error:', error)
    }
  }

  const updateDriverMarker = (location: DriverLocation) => {
    if (!map) return

    // Remove existing driver marker
    if (driverMarker) {
      driverMarker.setMap(null)
    }

    // Add new driver marker
    const marker = new google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: map,
      title: 'Driver Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <path d="M12 2L14.5 8.5L21 9L16 13.5L17.5 20L12 17L6.5 20L8 13.5L3 9L9.5 8.5L12 2Z" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32)
      }
    })

    setDriverMarker(marker)

    // Center map on driver location
    map.panTo({ lat: location.lat, lng: location.lng })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Finding Riders', color: 'bg-yellow-100 text-yellow-800', icon: '🔍' }
      case 'assigned':
        return { text: 'Waiting for Rider to Accept', color: 'bg-blue-100 text-blue-800', icon: '⏳' }
      case 'accepted':
        return { text: 'Rider On The Way', color: 'bg-green-100 text-green-800', icon: '🚗' }
      case 'delivered':
        return { text: 'Delivered', color: 'bg-green-100 text-green-800', icon: '✅' }
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '❌' }
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800', icon: '📦' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Order Not Found</h2>
          <p className="text-gray-600">The order you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <GoogleMapsScript onLoad={() => setIsGoogleMapsLoaded(true)} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Order Tracking</h1>
              <p className="text-gray-600 text-sm mt-1">Order #{order.id.slice(-8)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.text}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-800">Live Tracking</h2>
              {driverLocation && (
                <div className="text-xs text-gray-500">
                  Last updated: {new Date(driverLocation.created_at).toLocaleTimeString()}
                </div>
              )}
            </div>
            {isGoogleMapsLoaded ? (
              <div id="map" className="w-full h-[350px] md:h-[400px] rounded-lg bg-gray-100"></div>
            ) : (
              <div className="w-full h-[350px] md:h-[400px] rounded-lg bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">Loading map...</p>
                </div>
              </div>
            )}
            {/* Show error message if coordinates are invalid */}
            {order && (isNaN(parseFloat(order.pickup?.lat || order.pickup_lat)) || isNaN(parseFloat(order.pickup?.lng || order.pickup_lng)) || isNaN(parseFloat(order.drop?.lat || order.drop_lat)) || isNaN(parseFloat(order.drop?.lng || order.drop_lng))) && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-xs">
                  ⚠️ Invalid location coordinates. Please check your order details.
                </p>
              </div>
            )}
          </div>

          {/* Order Details - Takes 1 column */}
          <div className="space-y-4">
            {/* Cancelled Order Section */}
            {order.status === 'cancelled' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Order Cancelled
                </h3>
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h4 className="text-base font-medium text-gray-800 mb-2">No Riders Available</h4>
                  <p className="text-gray-600 text-sm mb-3">
                    Unfortunately, no riders were available to accept your order within the 30-minute window.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-800">
                      <strong>What you can do:</strong> Try creating a new order or check back later when more riders might be available.
                    </p>
                  </div>
                  <div className="mt-3">
                    <button 
                      onClick={() => window.location.href = '/orders'}
                      className="bg-[#133bb7] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#0f2a8a] transition-colors text-sm"
                    >
                      Create New Order
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting for Rider Section */}
            {order.status === 'assigned' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Waiting for Rider
                </h3>
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-medium text-gray-800 mb-2">Finding a Rider</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    We're looking for riders in your area. This may take up to 30 minutes.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-blue-800 mb-1">
                      <strong>Rider {currentRiderNumber}:</strong> {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')} remaining
                    </p>
                    <p className="text-xs text-blue-800">
                      <strong>Total time:</strong> {Math.floor(totalTimer / 60)}:{(totalTimer % 60).toString().padStart(2, '0')} remaining
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <p className="text-xs text-gray-600">
                      <strong>Please wait:</strong> We'll notify you as soon as a rider accepts your order.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Information */}
            {order.pricing && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1V23M17 5H9.5C8.11929 5 7 6.11929 7 7.5S8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5S15.8807 15 14.5 15H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Order Pricing
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Distance</span>
                    <span className="font-medium">{order.pricing.distance} km</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Base Fare</span>
                    <span className="font-medium">₹{order.pricing.breakdown.baseFare}</span>
                  </div>
                  {order.pricing.breakdown.distanceFare > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Distance Fare</span>
                      <span className="font-medium">₹{order.pricing.breakdown.distanceFare}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center text-base font-medium">
                      <span>Total Amount</span>
                      <span className="text-[#133bb7]">₹{order.pricing.totalPrice}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This is the amount you'll pay to the rider (COD)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* OTPs Section */}
            {order.status === 'accepted' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Verification Codes
                </h3>
                {otps ? (
                  <>
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-green-800 mb-1">
                              {otps.pickup_otp}
                            </div>
                            <div className="text-xs text-green-600 font-medium">Pickup Code</div>
                          </div>
                          <div className="text-right">
                            {otps.pickup_verified ? (
                              <span className="text-green-600 text-xs font-medium">✅ Verified</span>
                            ) : (
                              <span className="text-gray-500 text-xs">Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-blue-800 mb-1">
                              {otps.delivery_otp}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">Delivery Code</div>
                          </div>
                          <div className="text-right">
                            {otps.delivery_verified ? (
                              <span className="text-blue-600 text-xs font-medium">✅ Verified</span>
                            ) : (
                              <span className="text-gray-500 text-xs">Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        Share these codes with your driver for pickup and delivery verification.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-gray-600 text-sm">Generating verification codes...</p>
                  </div>
                )}
              </div>
            )}

            {/* Driver Info */}
            {order.driver && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Driver Information
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#133bb7] to-[#3b5bc7] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {order.driver.name?.charAt(0) || order.driver.phone?.charAt(0) || 'D'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">
                      {order.driver.name || 'Driver'}
                    </p>
                    <p className="text-gray-600 text-xs">{order.driver.phone}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 font-medium">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Package Details */}
            {order.package_details && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 9H19L18 21H6L5 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Package Details
                </h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600 font-medium text-sm">Receiver</span>
                      <span className="font-medium text-gray-800 text-sm">{order.package_details.receiverName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium text-sm">Phone</span>
                      <span className="font-medium text-gray-800 text-sm">{order.package_details.receiverPhone}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 font-medium mb-1">Category</div>
                      <div className="font-medium text-blue-800 text-sm">{order.package_details.category}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-green-600 font-medium mb-1">Weight</div>
                      <div className="font-medium text-green-800 text-sm">{order.package_details.weight} kg</div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-xs text-yellow-600 font-medium mb-1">Estimated Value</div>
                    <div className="font-medium text-yellow-800 text-sm">₹{order.package_details.estimatedValue}</div>
                  </div>
                  
                  {order.package_details.description && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 font-medium mb-1">Description</div>
                      <p className="text-gray-800 text-sm">{order.package_details.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
