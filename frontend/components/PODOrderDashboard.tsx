"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Star,
  DollarSign
} from 'lucide-react'

interface PODOrder {
  id: string
  order_number: string
  status: 'pending' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
  product_details: {
    product_id: string
    variant_id: string
    quantity: number
    design_url: string
    provider: string
    pod_order_id?: string
    fulfillment_status?: string
  }
  total_amount: number
  shipping_address: {
    name: string
    address1: string
    city: string
    state: string
    zip: string
    country: string
  }
  created_at: string
  updated_at: string
  tracking_number?: string
  estimated_delivery?: string
}

interface OrderStats {
  total_orders: number
  pending_orders: number
  in_production: number
  shipped_orders: number
  total_revenue: number
  avg_order_value: number
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    icon: Clock
  },
  in_production: {
    label: 'In Production',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    icon: Package
  },
  shipped: {
    label: 'Shipped',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    icon: Truck
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: AlertTriangle
  }
}

export default function PODOrderDashboard() {
  const [orders, setOrders] = useState<PODOrder[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<PODOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchOrders()
    fetchStats()
  }, [])

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setOrders(data.orders || [])
      setError('')
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token')
      if (!token) return

      const response = await fetch('/api/orders/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const refreshOrders = async () => {
    setRefreshing(true)
    await fetchOrders()
    await fetchStats()
    setRefreshing(false)
  }

  const getOrderStatus = async (orderId: string) => {
    try {
      const token = localStorage.getItem('supabase.auth.token')
      if (!token) return

      const response = await fetch(`/api/pod/order/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Order status:', data)
        // Update the specific order in the list
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, ...data }
            : order
        ))
      }
    } catch (err) {
      console.error('Failed to get order status:', err)
    }
  }

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          order.order_number.toLowerCase().includes(searchLower) ||
          order.shipping_address.name.toLowerCase().includes(searchLower) ||
          order.product_details.provider.toLowerCase().includes(searchLower)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'amount':
          return b.total_amount - a.total_amount
        case 'status':
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  }

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/60">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Order Management</h2>
          <p className="text-white/60">Track and manage your print-on-demand orders</p>
        </div>
        
        <button
          onClick={refreshOrders}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-white/60">Total Orders</p>
                <p className="text-xl font-bold text-white">{stats.total_orders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-sm text-white/60">Pending</p>
                <p className="text-xl font-bold text-white">{stats.pending_orders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-white/60">In Production</p>
                <p className="text-xl font-bold text-white">{stats.in_production}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-sm text-white/60">Shipped</p>
                <p className="text-xl font-bold text-white">{stats.shipped_orders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-white/60">Total Revenue</p>
                <p className="text-xl font-bold text-white">${stats.total_revenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-sm text-white/60">Avg Order</p>
                <p className="text-xl font-bold text-white">${stats.avg_order_value.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white/5 rounded-xl">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-64">
          <Search className="h-4 w-4 text-white/60" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/60" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_production">In Production</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="status">Status</option>
          </select>
        </div>

        {/* Results Count */}
        <div className="text-sm text-white/60">
          {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status)
            const StatusIcon = statusConfig.icon
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                      <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        Order #{order.order_number}
                      </h3>
                      <p className="text-sm text-white/60">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
                      {statusConfig.label}
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-white">${order.total_amount.toFixed(2)}</p>
                      <p className="text-xs text-white/60">{order.product_details.provider}</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-white/60 mb-1">Customer</p>
                    <p className="text-white">{order.shipping_address.name}</p>
                    <p className="text-sm text-white/60">
                      {order.shipping_address.city}, {order.shipping_address.state}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/60 mb-1">Product</p>
                    <p className="text-white">Product ID: {order.product_details.product_id}</p>
                    <p className="text-sm text-white/60">
                      Qty: {order.product_details.quantity} | Variant: {order.product_details.variant_id}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/60 mb-1">Tracking</p>
                    {order.tracking_number ? (
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">{order.tracking_number}</span>
                        <button className="text-blue-400 hover:text-blue-300">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-white/60">Not available</p>
                    )}
                    {order.estimated_delivery && (
                      <p className="text-sm text-white/60">
                        Est. delivery: {order.estimated_delivery}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                  
                  <button
                    onClick={() => getOrderStatus(order.id)}
                    className="px-4 py-2 bg-white/10 text-white/80 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Update Status
                  </button>
                  
                  {order.product_details.design_url && (
                    <button
                      onClick={() => window.open(order.product_details.design_url, '_blank')}
                      className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Download className="h-4 w-4" />
                      Design
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/60 mb-2">No orders found</h3>
          <p className="text-white/40">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Your orders will appear here once you place them'
            }
          </p>
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Order #{selectedOrder.order_number}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-white/60 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Status */}
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${getStatusConfig(selectedOrder.status).bgColor}`}>
                    {React.createElement(getStatusConfig(selectedOrder.status).icon, {
                      className: `h-6 w-6 ${getStatusConfig(selectedOrder.status).color}`
                    })}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {getStatusConfig(selectedOrder.status).label}
                    </p>
                    <p className="text-sm text-white/60">
                      Last updated: {formatDate(selectedOrder.updated_at)}
                    </p>
                  </div>
                </div>

                {/* Product Details */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3">Product Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">Product ID:</span>
                      <span className="text-white ml-2">{selectedOrder.product_details.product_id}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Variant ID:</span>
                      <span className="text-white ml-2">{selectedOrder.product_details.variant_id}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Quantity:</span>
                      <span className="text-white ml-2">{selectedOrder.product_details.quantity}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Provider:</span>
                      <span className="text-white ml-2">{selectedOrder.product_details.provider}</span>
                    </div>
                    {selectedOrder.product_details.pod_order_id && (
                      <div className="col-span-2">
                        <span className="text-white/60">POD Order ID:</span>
                        <span className="text-white ml-2 font-mono text-xs">
                          {selectedOrder.product_details.pod_order_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3">Shipping Address</h4>
                  <div className="text-sm space-y-1">
                    <p className="text-white">{selectedOrder.shipping_address.name}</p>
                    <p className="text-white/80">{selectedOrder.shipping_address.address1}</p>
                    <p className="text-white/80">
                      {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.zip}
                    </p>
                    <p className="text-white/80">{selectedOrder.shipping_address.country}</p>
                  </div>
                </div>

                {/* Design Preview */}
                {selectedOrder.product_details.design_url && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">Design</h4>
                    <img
                      src={selectedOrder.product_details.design_url}
                      alt="Order Design"
                      className="w-32 h-32 object-cover rounded-lg bg-white/10"
                    />
                  </div>
                )}

                {/* Order Total */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">Total Amount:</span>
                    <span className="text-xl font-bold text-green-400">
                      ${selectedOrder.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}