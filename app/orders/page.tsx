'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import LocationAutocomplete from '@/components/LocationAutocomplete'
import GoogleMapsScript from '@/components/GoogleMapsScript'
import OrderLoading from '@/components/OrderLoading'
import { calculateDistance, calculateOrderPrice } from '@/lib/pricing'

type PackageDetails = {
  receiverName: string
  receiverPhone: string
  category: string
  weight: string
  estimatedValue: string
}

export default function CreateOrderPage() {
  const { user } = useAuth()
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [dropLocation, setDropLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [packageDetails, setPackageDetails] = useState<PackageDetails>({
    receiverName: '',
    receiverPhone: '',
    category: '',
    weight: '',
    estimatedValue: ''
  })

  const [status, setStatus] = useState<'idle'|'checking'|'waiting'|'cancelled'|'success'>('idle')
  const [timer, setTimer] = useState(120) // 2 minutes per rider
  const [totalTimer, setTotalTimer] = useState(1800) // 30 minutes total
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all'|'pending'|'accepted'|'delivered'|'cancelled'>('all')
  const [currentStep, setCurrentStep] = useState<'location'|'package'|'confirm'>('location')
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [showModal, setShowModal] = useState(false)
  const [orderPricing, setOrderPricing] = useState<{
    distance: number
    totalPrice: number
    breakdown: any
  } | null>(null)

  // countdown for driver acceptance
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (status === 'waiting' && totalTimer > 0) {
      interval = setInterval(() => {
        setTotalTimer(prev => {
          const newTotal = prev - 1
          // Update the display timer (2 minutes per rider)
          const currentRiderTime = newTotal % 120 // 2 minutes = 120 seconds
          if (currentRiderTime === 0 && newTotal > 0) {
            setTimer(120) // Reset to 2 minutes for next rider
          } else {
            setTimer(currentRiderTime)
          }
          return newTotal
        })
      }, 1000)
    } else if (status === 'waiting' && totalTimer === 0) {
      setStatus('cancelled')
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, totalTimer])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  // fetch order history on component mount
  useEffect(() => {
    if (user?.id) {
      fetchOrderHistory()
    }
  }, [user?.id])

  // Calculate pricing when locations are available
  const calculatePricing = () => {
    if (pickupLocation && dropLocation) {
      const distance = calculateDistance(
        pickupLocation.lat, 
        pickupLocation.lng, 
        dropLocation.lat, 
        dropLocation.lng
      )
      const pricing = calculateOrderPrice(distance)
      
      setOrderPricing({
        distance: Math.round(distance * 100) / 100,
        totalPrice: pricing.totalPrice,
        breakdown: pricing.breakdown
      })
    } else {
      setOrderPricing(null)
    }
  }

  // Calculate pricing when locations change
  useEffect(() => {
    calculatePricing()
  }, [pickupLocation, dropLocation])

  // Auto-detect user location
  const detectUserLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser')
      return
    }

    setLocationLoading(true)
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // Use Google Geocoding API to get address
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          )
          const data = await response.json()
          
          if (data.results && data.results.length > 0) {
            const address = data.results[0].formatted_address
            const location = { lat: latitude, lng: longitude, address }
            
            setUserLocation(location)
            setPickupLocation(location)
            setPickup(address)
          }
        } catch (error) {
          console.error('Error getting address:', error)
          // Fallback to coordinates only
          const location = { lat: latitude, lng: longitude, address: `${latitude}, ${longitude}` }
          setUserLocation(location)
          setPickupLocation(location)
          setPickup(`${latitude}, ${longitude}`)
        }
        
        setLocationLoading(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        setLocationLoading(false)
        alert('Unable to get your location. Please enter manually.')
      }
    )
  }

  const handlePackageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let value = e.target.value
    
    // Format phone number for Indian numbers
    if (e.target.name === 'receiverPhone') {
      // Remove all non-digits
      value = value.replace(/\D/g, '')
      // Limit to 10 digits
      if (value.length > 10) {
        value = value.slice(0, 10)
      }
    }
    
    setPackageDetails(prev => ({ ...prev, [e.target.name]: value }))
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }))
    }
  }

  const validateLocation = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!pickup) {
      newErrors.pickup = 'Pickup location is required'
    }
    if (!drop) {
      newErrors.drop = 'Delivery location is required'
    }
    if (!pickupLocation) {
      newErrors.pickup = 'Please select a valid pickup location from the suggestions'
    }
    if (!dropLocation) {
      newErrors.drop = 'Please select a valid delivery location from the suggestions'
    }
    if (pickupLocation && (!pickupLocation.lat || !pickupLocation.lng)) {
      newErrors.pickup = 'Please select a valid pickup location from the suggestions'
    }
    if (dropLocation && (!dropLocation.lat || !dropLocation.lng)) {
      newErrors.drop = 'Please select a valid delivery location from the suggestions'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePackage = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!packageDetails.receiverName.trim()) {
      newErrors.receiverName = 'Receiver name is required'
    } else if (packageDetails.receiverName.trim().length < 2) {
      newErrors.receiverName = 'Name must be at least 2 characters'
    }
    
    if (!packageDetails.receiverPhone.trim()) {
      newErrors.receiverPhone = 'Receiver phone is required'
    } else {
      // Indian phone number validation (10 digits, can start with +91 or 0)
      const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/
      const cleanPhone = packageDetails.receiverPhone.replace(/\s/g, '')
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.receiverPhone = 'Please enter a valid 10-digit Indian phone number'
      }
    }
    
    if (!packageDetails.category) {
      newErrors.category = 'Please select a category'
    }
    
    if (!packageDetails.weight.trim()) {
      newErrors.weight = 'Weight is required'
    } else if (isNaN(Number(packageDetails.weight)) || Number(packageDetails.weight) <= 0) {
      newErrors.weight = 'Please enter a valid weight (must be greater than 0)'
    } else if (Number(packageDetails.weight) > 50) {
      newErrors.weight = 'Weight cannot exceed 50 kg'
    }
    
    if (!packageDetails.estimatedValue.trim()) {
      newErrors.estimatedValue = 'Estimated value is required'
    } else if (isNaN(Number(packageDetails.estimatedValue)) || Number(packageDetails.estimatedValue) <= 0) {
      newErrors.estimatedValue = 'Please enter a valid value (must be greater than 0)'
    } else if (Number(packageDetails.estimatedValue) > 100000) {
      newErrors.estimatedValue = 'Value cannot exceed ₹1,00,000'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (currentStep === 'location' && validateLocation()) {
      setCurrentStep('package')
    } else if (currentStep === 'package' && validatePackage()) {
      setCurrentStep('confirm')
    }
  }

  const prevStep = () => {
    if (currentStep === 'package') {
      setCurrentStep('location')
    } else if (currentStep === 'confirm') {
      setCurrentStep('package')
    }
  }

  const fetchOrderHistory = async () => {
    if (!user?.id) return
    
    setHistoryLoading(true)
    try {
      const response = await fetch(`/api/orders/history?user_id=${user.id}`)
      const data = await response.json()
      console.log('Fetched orders:', data.orders)
      setOrderHistory(data.orders || [])
    } catch (error) {
      console.error('Error fetching order history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-orange-100 text-orange-800'
      case 'accepted': return 'bg-blue-100 text-blue-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return '🔍'
      case 'accepted': return '✅'
      case 'delivered': return '📦'
      case 'cancelled': return '❌'
      default: return '📋'
    }
  }

  const getFilteredOrders = () => {
    // Skip the first order (recent order) and get the rest
    const previousOrders = orderHistory.slice(1)
    console.log('All orders:', orderHistory)
    console.log('Previous orders:', previousOrders)
    console.log('Active tab:', activeTab)
    
    if (activeTab === 'all') return previousOrders
    if (activeTab === 'pending') {
      const assignedOrders = previousOrders.filter(order => order.status === 'assigned')
      console.log('Assigned orders:', assignedOrders)
      return assignedOrders
    }
    const filtered = previousOrders.filter(order => order.status === activeTab)
    console.log(`Filtered ${activeTab} orders:`, filtered)
    return filtered
  }

  const resetForm = () => {
    setPickup('')
    setDrop('')
    setPickupLocation(null)
    setDropLocation(null)
    setPackageDetails({
      receiverName: '',
      receiverPhone: '',
      category: '',
      weight: '',
      estimatedValue: ''
    })
    setCurrentStep('location')
    setErrors({})
    setStatus('idle')
    setShowModal(false)
    setTimer(120) // 2 minutes per rider
    setTotalTimer(1800) // 30 minutes total
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      alert('Please login to create an order')
      return
    }

    // Validate all fields
    if (!validateLocation() || !validatePackage()) {
      return
    }

    // Additional validation for coordinates
    if (!pickupLocation || !dropLocation) {
      alert('Please select valid pickup and delivery locations from the suggestions')
      return
    }

    if (!pickupLocation.lat || !pickupLocation.lng || !dropLocation.lat || !dropLocation.lng) {
      alert('Please select valid pickup and delivery locations from the suggestions')
      return
    }

    setShowModal(true)
    setStatus('checking')

    // First, create the order record in the database
    console.log('Creating order with data:', {
      user_id: user?.id,
      user: user,
      package_details: packageDetails,
      status: 'pending'
    })
    
    // Create order via API route to bypass RLS issues
    let order: any = null
    let responseData: any = null
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          pickup_lat: pickupLocation?.lat,
          pickup_lng: pickupLocation?.lng,
          pickup_address: pickup,
          drop_lat: dropLocation?.lat,
          drop_lng: dropLocation?.lng,
          drop_address: drop,
          package_details: packageDetails,
          status: 'pending'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error creating order:', errorData)
        alert(`Failed to create order: ${errorData.error || 'Unknown error'}`)
        setStatus('idle')
        return
      }

      responseData = await response.json()
      order = responseData.order
      console.log('Order created successfully:', order)
    } catch (error) {
      console.error('Network error creating order:', error)
      alert('Network error. Please check your connection and try again.')
      setStatus('idle')
      return
    }

    if (!order || !order.id) {
      console.error('Order creation failed - no order ID returned')
      alert('Failed to create order. Please try again.')
      setStatus('idle')
      return
    }

    // The API now handles finding riders and creating offers automatically
    // Check the response to see if riders were found
    if (responseData.status === 'cancelled') {
      setStatus('cancelled')
      return
    }

    if (responseData.status === 'assigned') {
      // Immediately redirect to tracking page
      console.log('Order created successfully, redirecting to tracking page')
      window.location.href = `/orders/track/${order.id}`
      return
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Google Maps Script Loader */}
      <GoogleMapsScript onLoad={() => setIsGoogleMapsLoaded(true)} />
      
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Step 1: Location */}
          {currentStep === 'location' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Where are you sending from and to?</h2>
              
              <div className="space-y-4">
            {/* Pickup Location */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Pickup Location</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={detectUserLocation}
                        disabled={locationLoading}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                      >
                        {locationLoading ? '📍 Detecting...' : '📍 Use My Location'}
                      </button>
                      {userLocation && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickup('')
                            setPickupLocation(null)
                          }}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
            {isGoogleMapsLoaded ? (
              <LocationAutocomplete
                placeholder="Enter pickup location"
                value={pickup}
                onChange={setPickup}
                onLocationSelect={(location) => {
                  setPickupLocation(location)
                  setPickup(location.address)
                }}
                icon="pickup"
              />
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <input
                  type="text"
                  placeholder="Loading location services..."
                  disabled
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
                />
              </div>
            )}
                  {errors.pickup && <p className="text-red-500 text-xs mt-1">{errors.pickup}</p>}
                  {!pickupLocation && pickup && (
                    <p className="text-amber-600 text-xs mt-1">💡 Please select from the dropdown suggestions to get accurate coordinates</p>
                  )}
                </div>

            {/* Drop Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Location</label>
            {isGoogleMapsLoaded ? (
              <LocationAutocomplete
                placeholder="Enter delivery location"
                value={drop}
                onChange={setDrop}
                onLocationSelect={(location) => {
                  setDropLocation(location)
                  setDrop(location.address)
                }}
                icon="drop"
              />
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
                <input
                  type="text"
                  placeholder="Loading location services..."
                  disabled
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
                />
              </div>
            )}
                  {errors.drop && <p className="text-red-500 text-xs mt-1">{errors.drop}</p>}
                  {!dropLocation && drop && (
                    <p className="text-amber-600 text-xs mt-1">💡 Please select from the dropdown suggestions to get accurate coordinates</p>
                  )}
                </div>
        </div>

        {/* Pricing Preview */}
        {orderPricing && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-600">💰</span>
                <span className="text-sm text-gray-700">
                  <strong>{orderPricing.distance} km</strong> - 
                  <span className="text-green-600 font-semibold ml-1">₹{orderPricing.totalPrice}</span>
                </span>
              </div>
              <span className="text-xs text-gray-500">Estimated price</span>
            </div>
          </div>
        )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={nextStep}
                  className="w-full sm:w-auto bg-[#133bb7] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#0f2a8a] transition-colors"
                >
                  Next: Package Details
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Package Details */}
          {currentStep === 'package' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">What are you sending?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receiver Name *</label>
              <input
                type="text"
                name="receiverName"
                placeholder="Enter receiver name"
                value={packageDetails.receiverName}
                onChange={handlePackageChange}
                    className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm ${errors.receiverName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              />
                  {errors.receiverName && <p className="text-red-500 text-sm mt-1">{errors.receiverName}</p>}
            </div>
                
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receiver Phone *</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  📱
                </div>
                <input
                  type="tel"
                  name="receiverPhone"
                  placeholder="Enter 10-digit phone number"
                  value={packageDetails.receiverPhone}
                  onChange={handlePackageChange}
                  maxLength="10"
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm ${errors.receiverPhone ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                />
              </div>
                  {errors.receiverPhone && <p className="text-red-500 text-sm mt-1">{errors.receiverPhone}</p>}
            </div>
                
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                name="category"
                value={packageDetails.category}
                onChange={handlePackageChange}
                    className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent transition-all duration-200 text-gray-900 text-sm ${errors.category ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <option value="">Select category</option>
                    <option value="Documents">📄 Documents</option>
                    <option value="Electronics">📱 Electronics</option>
                    <option value="Clothing">👕 Clothing</option>
                    <option value="Food">🍕 Food</option>
                    <option value="Books">📚 Books</option>
                    <option value="Medicines">💊 Medicines</option>
                    <option value="Gifts">🎁 Gifts</option>
                    <option value="Other">📦 Other</option>
              </select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>
                
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label>
              <div className="relative">
                <input
                  type="number"
                  name="weight"
                  placeholder="Enter weight in kg"
                  value={packageDetails.weight}
                  onChange={handlePackageChange}
                  min="0.1"
                  max="50"
                  step="0.1"
                      className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm ${errors.weight ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                  kg
                </div>
              </div>
                  {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
            </div>
                
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Value *</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-lg">
                  ₹
                </div>
                <input
                  type="number"
                  name="estimatedValue"
                  placeholder="Enter value"
                  value={packageDetails.estimatedValue}
                  onChange={handlePackageChange}
                  min="1"
                  max="100000"
                  step="1"
                      className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm ${errors.estimatedValue ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                />
              </div>
                  {errors.estimatedValue && <p className="text-red-500 text-sm mt-1">{errors.estimatedValue}</p>}
            </div>
                
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-between mt-6">
                <button
                  onClick={prevStep}
                  className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className="w-full sm:w-auto bg-[#133bb7] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#0f2a8a] transition-colors"
                >
                  Next: Review Order
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 'confirm' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Review Your Order</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Locations</h3>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">{pickup}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-700">{drop}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Package Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">👤</span>
                      <span className="text-gray-800"><strong>Receiver:</strong> {packageDetails.receiverName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">📱</span>
                      <span className="text-gray-800"><strong>Phone:</strong> {packageDetails.receiverPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">📦</span>
                      <span className="text-gray-800"><strong>Category:</strong> {packageDetails.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">⚖️</span>
                      <span className="text-gray-800"><strong>Weight:</strong> {packageDetails.weight} kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">💰</span>
                      <span className="text-gray-800"><strong>Value:</strong> ₹{packageDetails.estimatedValue}</span>
                    </div>
            </div>
          </div>

          {/* Pricing Section */}
          {orderPricing && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <span>💳</span>
                <span>Pricing</span>
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance:</span>
                  <span className="text-gray-800 font-medium">{orderPricing.distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base fare (0-2km):</span>
                  <span className="text-gray-800">₹{orderPricing.breakdown.baseFare}</span>
                </div>
                {orderPricing.breakdown.distanceFare > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distance fare:</span>
                    <span className="text-gray-800">₹{orderPricing.breakdown.distanceFare}</span>
                  </div>
                )}
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800 font-semibold">Total Price:</span>
                    <span className="text-blue-600 font-bold text-lg">₹{orderPricing.totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-between mt-6">
                <button
                  onClick={prevStep}
                  className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
        <button
          onClick={handleSubmit}
                  className="w-full sm:w-auto bg-[#133bb7] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#0f2a8a] transition-colors"
        >
                  Create Order
        </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal for Order Processing */}
        {showModal && (
          <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200">
              {status === 'checking' && (
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Finding Drivers</h3>
                  <p className="text-gray-600 text-sm">Searching for available drivers in your area...</p>
          </div>
        )}

        {status === 'waiting' && (
               <div className="text-center">
                 <div className="w-16 h-16 border-4 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                 <h3 className="text-lg font-medium text-gray-800 mb-2">Waiting for Rider</h3>
                 <p className="text-gray-600 text-sm">
                   {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')} remaining for current rider
                 </p>
                 <p className="text-xs text-gray-500 mt-2">
                   Total time: {Math.floor(totalTimer / 60)}:{(totalTimer % 60).toString().padStart(2, '0')} remaining
                 </p>
               </div>
             )}
              
              {status === 'success' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Order Accepted!</h3>
                  <p className="text-gray-600 text-sm">Redirecting to tracking page...</p>
                </div>
              )}
              
              {status === 'cancelled' && (
            <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No Drivers Available</h3>
                  <p className="text-gray-600 text-sm mb-4">No drivers accepted your order. Please try again later.</p>
                  <button
                    onClick={resetForm}
                    className="bg-[#133bb7] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#0f2a8a] transition-colors"
                  >
                    Try Again
                  </button>
              </div>
              )}
            </div>
          </div>
        )}


        {/* Recent Order Section */}
        {historyLoading ? (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Recent Order</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading recent order...</p>
              </div>
            </div>
          </div>
        ) : orderHistory.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Recent Order</h2>
            <div>
              {(() => {
                const recentOrder = orderHistory[0]
                return (
                  <div 
                    className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all ${
                      (recentOrder.status === 'accepted' || recentOrder.status === 'delivered') ? 'cursor-pointer hover:border-[#133bb7]' : ''
                    }`}
                    onClick={() => {
                      if (recentOrder.status === 'accepted' || recentOrder.status === 'delivered') {
                        window.location.href = `/orders/track/${recentOrder.id}`
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(recentOrder.status)}`}></div>
                        <span className="font-medium text-gray-800 text-sm">Order #{recentOrder.id.slice(-8)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(recentOrder.status)} bg-opacity-10`}>
                          {getStatusIcon(recentOrder.status)} {recentOrder.status.charAt(0).toUpperCase() + recentOrder.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(recentOrder.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600">Pickup: {recentOrder.pickup_address || `${recentOrder.pickup_lat.toFixed(4)}, ${recentOrder.pickup_lng.toFixed(4)}`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-gray-600">Delivery: {recentOrder.drop_address || `${recentOrder.drop_lat.toFixed(4)}, ${recentOrder.drop_lng.toFixed(4)}`}</span>
                        </div>
                      {recentOrder.driver && (
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-gray-600">Driver: {recentOrder.driver.name} ({recentOrder.driver.phone})</span>
                        </div>
                      )}
                      {recentOrder.package_details && (
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                            <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 9H19L18 21H6L5 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-gray-600">{recentOrder.package_details.category} - {recentOrder.package_details.weight}kg</span>
                        </div>
                      )}
                    </div>
                    
                    {(recentOrder.status === 'accepted' || recentOrder.status === 'delivered') && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Click to track this order</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#133bb7]">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Order History Section */}
        {historyLoading ? (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Previous Orders</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading previous orders...</p>
              </div>
            </div>
          </div>
        ) : orderHistory.length > 1 && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Previous Orders</h2>
            <div>
              {/* Mobile-friendly tabs */}
              <div className="mb-4">
                <div className="flex overflow-x-auto gap-2 pb-2">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                      activeTab === 'all' 
                        ? 'bg-[#133bb7] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All ({orderHistory.length > 1 ? orderHistory.length - 1 : 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                      activeTab === 'pending' 
                        ? 'bg-[#133bb7] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Pending ({orderHistory.slice(1).filter(o => o.status === 'assigned').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('accepted')}
                    className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                      activeTab === 'accepted' 
                        ? 'bg-[#133bb7] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Accepted ({orderHistory.slice(1).filter(o => o.status === 'accepted').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('delivered')}
                    className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                      activeTab === 'delivered' 
                        ? 'bg-[#133bb7] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Delivered ({orderHistory.slice(1).filter(o => o.status === 'delivered').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('cancelled')}
                    className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                      activeTab === 'cancelled' 
                        ? 'bg-[#133bb7] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Cancelled ({orderHistory.slice(1).filter(o => o.status === 'cancelled').length})
                  </button>
                </div>
              </div>

              {historyLoading ? (
                <div className="text-center py-6">
                  <div className="w-6 h-6 border-2 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">Loading order history...</p>
                </div>
              ) : getFilteredOrders().length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                      <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 9H19L18 21H6L5 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-800 mb-2">No Orders Found</h3>
                  <p className="text-gray-600 text-sm">
                    {activeTab === 'all' 
                      ? "You haven't placed any orders yet." 
                      : activeTab === 'pending'
                      ? "No orders being processed. All your orders have been completed or cancelled."
                      : activeTab === 'accepted'
                      ? "No accepted orders. Your orders are either pending or completed."
                      : activeTab === 'delivered'
                      ? "No delivered orders yet. Your orders are still in progress."
                      : activeTab === 'cancelled'
                      ? "No cancelled orders. Great! All your orders have been successful."
                      : `No ${activeTab} orders found.`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredOrders().map((order) => (
                    <div 
                      key={order.id} 
                      className={`bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all ${
                        (order.status === 'assigned' || order.status === 'accepted' || order.status === 'delivered') ? 'cursor-pointer hover:border-[#133bb7]' : ''
                      }`}
                      onClick={() => {
                        if (order.status === 'assigned' || order.status === 'accepted' || order.status === 'delivered') {
                          window.location.href = `/orders/track/${order.id}`
                        }
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(order.status)}`}></div>
                          <span className="font-medium text-gray-800 text-sm">Order #{order.id.slice(-8)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} bg-opacity-10`}>
                            {getStatusIcon(order.status)} {order.status === 'assigned' ? 'Finding riders' :
                             order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-gray-600">Pickup: {order.pickup_address || `${order.pickup_lat.toFixed(4)}, ${order.pickup_lng.toFixed(4)}`}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-gray-600">Delivery: {order.drop_address || `${order.drop_lat.toFixed(4)}, ${order.drop_lng.toFixed(4)}`}</span>
                          </div>
                        {order.driver && (
                          <div className="flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-gray-600">Driver: {order.driver.name} ({order.driver.phone})</span>
                          </div>
                        )}
                        {order.package_details && (
                          <div className="flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                              <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 9H19L18 21H6L5 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-gray-600">{order.package_details.category} - {order.package_details.weight}kg</span>
                          </div>
                        )}
                      </div>
                      
                        {(order.status === 'accepted' || order.status === 'delivered') && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Click to track this order</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#133bb7]">
                              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
