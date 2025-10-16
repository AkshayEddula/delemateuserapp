'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

type User = {
  id: string
  name: string
  phone: string
  role: string
  created_at: string
}

type Order = {
  id: string
  status: string
  pickup_lat: number
  pickup_lng: number
  drop_lat: number
  drop_lng: number
  total_price: number
  created_at: string
  package_details: any
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'settings'>('profile')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  })

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
      fetchOrderHistory()
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (error) {
        console.error('Error fetching user data:', error)
        return
      }

      setUserData(data)
      setFormData({
        name: data.name || '',
        phone: data.phone || ''
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchOrderHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching orders:', error)
        return
      }

      setOrders(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone
        })
        .eq('id', user?.id)

      if (error) {
        console.error('Error updating profile:', error)
        alert('Failed to update profile')
        return
      }

      setUserData(prev => prev ? { ...prev, name: formData.name, phone: formData.phone } : null)
      setEditMode(false)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to update profile')
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' }
      case 'assigned':
        return { text: 'Finding Rider', color: 'bg-blue-100 text-blue-800', icon: '🔍' }
      case 'accepted':
        return { text: 'Rider Assigned', color: 'bg-green-100 text-green-800', icon: '✅' }
      case 'delivered':
        return { text: 'Delivered', color: 'bg-green-100 text-green-800', icon: '📦' }
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '❌' }
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800', icon: '📋' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please Login</h2>
          <Link href="/login" className="bg-[#133bb7] text-white px-6 py-3 rounded-lg hover:bg-[#0f2a8a] transition-colors">
            Login to View Profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#133bb7] to-[#3b5bc7] text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">My Profile</h1>
              <p className="text-blue-100">Manage your account and order history</p>
            </div>
            <Link 
              href="/orders"
              className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              ← Back to Orders
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'profile' 
                  ? 'bg-white text-[#133bb7] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'orders' 
                  ? 'bg-white text-[#133bb7] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Order History
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-white text-[#133bb7] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="bg-[#133bb7] text-white px-4 py-2 rounded-lg hover:bg-[#0f2a8a] transition-colors text-sm font-medium"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      className="bg-[#133bb7] text-white px-4 py-2 rounded-lg hover:bg-[#0f2a8a] transition-colors font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false)
                        setFormData({
                          name: userData?.name || '',
                          phone: userData?.phone || ''
                        })
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#133bb7] to-[#3b5bc7] rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {userData?.name?.charAt(0)?.toUpperCase() || userData?.phone?.slice(-2) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {userData?.name || 'No name set'}
                      </h3>
                      <p className="text-gray-600">{userData?.phone}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Type</label>
                      <p className="text-gray-900 capitalize">{userData?.role || 'User'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Member Since</label>
                      <p className="text-gray-900">
                        {userData?.created_at ? formatDate(userData.created_at) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 9H19L18 21H6L5 9Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {orders.filter(order => order.status === 'delivered').length}
                    </p>
                    <p className="text-sm text-gray-600">Delivered</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {orders.filter(order => order.status === 'accepted' || order.status === 'assigned').length}
                    </p>
                    <p className="text-sm text-gray-600">In Progress</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order History</h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-[#133bb7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 9H19L18 21H6L5 9Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Orders Yet</h3>
                  <p className="text-gray-600 mb-4">You haven't created any orders yet.</p>
                  <Link 
                    href="/orders"
                    className="bg-[#133bb7] text-white px-6 py-3 rounded-lg hover:bg-[#0f2a8a] transition-colors font-medium"
                  >
                    Create Your First Order
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status)
                    return (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">Order #{order.id.slice(-8)}</h3>
                            <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.icon} {statusInfo.text}
                            </span>
                            {order.status === 'delivered' && (
                              <Link
                                href={`/orders/track/${order.id}`}
                                className="text-[#133bb7] hover:text-[#0f2a8a] text-sm font-medium"
                              >
                                View Details
                              </Link>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Pickup</p>
                            <p className="text-gray-900">
                              {order.pickup_lat.toFixed(4)}, {order.pickup_lng.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Delivery</p>
                            <p className="text-gray-900">
                              {order.drop_lat.toFixed(4)}, {order.drop_lng.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Amount</p>
                            <p className="text-gray-900 font-semibold">₹{order.total_price}</p>
                          </div>
                        </div>

                        {order.package_details && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-500 mb-1">Package Details</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {order.package_details.category || 'Package'}
                              </span>
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {order.package_details.weight}kg
                              </span>
                              {order.package_details.estimatedValue && (
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  ₹{order.package_details.estimatedValue}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-medium text-gray-900">Notifications</h3>
                    <p className="text-sm text-gray-600">Receive updates about your orders</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#133bb7]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#133bb7]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-medium text-gray-900">Location Services</h3>
                    <p className="text-sm text-gray-600">Allow location access for better service</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#133bb7]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#133bb7]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Logout</h3>
                    <p className="text-sm text-gray-600">Sign out of your account</p>
                  </div>
                  <button
                    onClick={logout}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Support</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Help Center</h3>
                      <p className="text-sm text-gray-600">Get help with your orders</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Contact Support</h3>
                      <p className="text-sm text-gray-600">Reach out to our support team</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Privacy Policy</h3>
                      <p className="text-sm text-gray-600">Learn about our privacy practices</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
