"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingCart, 
  Heart, 
  ZoomIn, 
  Filter, 
  Grid, 
  List,
  Star,
  Truck,
  ChevronDown,
  Package,
  DollarSign
} from 'lucide-react'

interface PODVariant {
  id: string
  name: string
  size: string
  color: string
  color_code: string
  price: number
  in_stock: boolean
  image: string
}

interface PODProduct {
  id: string
  name: string
  description: string
  type: string
  brand: string
  model: string
  image: string
  variants: PODVariant[]
  options: Array<{
    name: string
    values: string[]
  }>
  provider?: string
  provider_name?: string
}

interface PODCatalogProps {
  generatedDesign?: string
  onProductSelect?: (product: PODProduct, variant: PODVariant) => void
  onOrderStart?: (product: PODProduct, variant: PODVariant) => void
}

export default function PODCatalog({ 
  generatedDesign, 
  onProductSelect, 
  onOrderStart 
}: PODCatalogProps) {
  // State management
  const [products, setProducts] = useState<PODProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('apparel')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('name')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<PODProduct | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<PODVariant | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Categories available
  const categories = [
    { id: 'apparel', name: 'Apparel', icon: '👕' },
    { id: 'accessories', name: 'Accessories', icon: '🎒' },
    { id: 'home', name: 'Home & Living', icon: '🏠' }
  ]

  // Load products from API
  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, selectedProvider])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('supabase.auth.token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const endpoint = selectedProvider === 'all' 
        ? `/api/pod/products/unified?category=${selectedCategory}`
        : `/api/pod/products?category=${selectedCategory}&provider=${selectedProvider}`

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (selectedProvider === 'all' && data.products) {
        setProducts(data.products)
      } else {
        setProducts(data)
      }
      
      setError('')
    } catch (err) {
      console.error('Failed to fetch products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      if (selectedProvider !== 'all' && product.provider !== selectedProvider) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          const aPrice = Math.min(...a.variants.map(v => v.price))
          const bPrice = Math.min(...b.variants.map(v => v.price))
          return aPrice - bPrice
        case 'name':
          return a.name.localeCompare(b.name)
        case 'brand':
          return a.brand.localeCompare(b.brand)
        default:
          return 0
      }
    })

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId)
      } else {
        newFavorites.add(productId)
      }
      return newFavorites
    })
  }

  const handleProductClick = (product: PODProduct) => {
    setSelectedProduct(product)
    setSelectedVariant(product.variants[0] || null)
    onProductSelect?.(product, product.variants[0])
  }

  const handleVariantSelect = (variant: PODVariant) => {
    setSelectedVariant(variant)
    if (selectedProduct) {
      onProductSelect?.(selectedProduct, variant)
    }
  }

  const handleOrderStart = () => {
    if (selectedProduct && selectedVariant) {
      onOrderStart?.(selectedProduct, selectedVariant)
    }
  }

  const getPriceRange = (variants: PODVariant[]) => {
    const prices = variants.map(v => v.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/60">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center text-red-400">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">Failed to load products</p>
          <p className="text-sm text-red-400/60">{error}</p>
          <button 
            onClick={fetchProducts}
            className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Print-on-Demand Catalog</h2>
          <p className="text-white/60">Choose products to apply your AI-generated designs</p>
        </div>
        
        {/* View Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white/5 rounded-xl">
        {/* Categories */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Category:</span>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>

        {/* Provider Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Provider:</span>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white border border-white/10 text-sm"
          >
            <option value="all">All Providers</option>
            <option value="printful">Printful</option>
            <option value="printify">Printify</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white border border-white/10 text-sm"
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="brand">Brand</option>
          </select>
        </div>

        {/* Results Count */}
        <div className="ml-auto text-sm text-white/60">
          {filteredProducts.length} products found
        </div>
      </div>

      {/* Products Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      }>
        <AnimatePresence>
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.02 }}
              className={`
                bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer
                ${selectedProduct?.id === product.id ? 'border-blue-400 bg-blue-500/10' : ''}
                ${viewMode === 'list' ? 'flex items-center gap-4' : ''}
              `}
              onClick={() => handleProductClick(product)}
            >
              {/* Product Image */}
              <div className={`
                relative overflow-hidden rounded-lg bg-white/5
                ${viewMode === 'grid' ? 'aspect-square mb-4' : 'w-24 h-24 flex-shrink-0'}
              `}>
                <img
                  src={product.image || '/placeholder-product.png'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Provider Badge */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 text-xs text-white rounded">
                  {product.provider_name || product.brand}
                </div>

                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(product.id)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/80 rounded hover:bg-black/90 transition-colors"
                >
                  <Heart 
                    className={`h-4 w-4 ${
                      favorites.has(product.id) 
                        ? 'text-red-400 fill-current' 
                        : 'text-white/60'
                    }`} 
                  />
                </button>

                {/* Quick View */}
                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Product Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1 line-clamp-2">
                  {product.name}
                </h3>
                
                <p className="text-sm text-white/60 mb-2 line-clamp-2">
                  {product.description}
                </p>

                {/* Price and Variants */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-green-400">
                      {getPriceRange(product.variants)}
                    </div>
                    <div className="text-xs text-white/50">
                      {product.variants.length} variants
                    </div>
                  </div>

                  {viewMode === 'grid' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProductClick(product)
                      }}
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                    >
                      Select
                    </button>
                  )}
                </div>

                {/* Available Sizes/Colors */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {product.options.find(opt => opt.name === 'Size')?.values.slice(0, 5).map(size => (
                    <span 
                      key={size} 
                      className="px-2 py-0.5 bg-white/10 text-xs text-white/70 rounded"
                    >
                      {size}
                    </span>
                  ))}
                  {(product.options.find(opt => opt.name === 'Size')?.values.length || 0) > 5 && (
                    <span className="px-2 py-0.5 bg-white/10 text-xs text-white/70 rounded">
                      +{(product.options.find(opt => opt.name === 'Size')?.values.length || 0) - 5}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-6">
                {/* Product Image */}
                <div className="w-1/2">
                  <img
                    src={selectedVariant?.image || selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                </div>

                {/* Product Details */}
                <div className="w-1/2">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {selectedProduct.name}
                  </h3>
                  
                  <p className="text-white/60 mb-4">
                    {selectedProduct.description}
                  </p>

                  {/* Variant Selection */}
                  {selectedProduct.options.map(option => (
                    <div key={option.name} className="mb-4">
                      <label className="block text-sm text-white/80 mb-2">
                        {option.name}:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map(value => (
                          <button
                            key={value}
                            onClick={() => {
                              const variant = selectedProduct.variants.find(v => 
                                option.name === 'Size' ? v.size === value : v.color === value
                              )
                              if (variant) handleVariantSelect(variant)
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              (option.name === 'Size' && selectedVariant?.size === value) ||
                              (option.name === 'Color' && selectedVariant?.color === value)
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-400'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Price */}
                  {selectedVariant && (
                    <div className="mb-6">
                      <div className="text-2xl font-bold text-green-400">
                        ${selectedVariant.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-white/60">
                        {selectedVariant.in_stock ? 'In Stock' : 'Out of Stock'}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleOrderStart}
                      disabled={!selectedVariant?.in_stock}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Start Order
                    </button>
                    
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="px-4 py-2 bg-white/10 text-white/80 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/60 mb-2">No products found</h3>
          <p className="text-white/40">Try adjusting your filters or category selection</p>
        </div>
      )}
    </div>
  )
}