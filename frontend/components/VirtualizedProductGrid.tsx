"use client"

import React, { useMemo, memo } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'

interface Product {
  id: string
  name: string
  description: string
  type: string
  brand: string
  model: string
  image: string
  provider: string
  provider_name: string
  variants: Array<{
    id: string
    name: string
    size: string
    color: string
    color_code: string
    price: number
    in_stock: boolean
    image: string
    image_type?: string
  }>
  options: Array<{
    name: string
    values: string[]
  }>
}

interface ProductItemProps {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  data: {
    products: Product[]
    onProductSelect: (product: Product) => void
    selectedProductId?: string
    itemsPerRow: number
  }
}

// Memoized product item for performance
const ProductItem = memo<ProductItemProps>(({ columnIndex, rowIndex, style, data }) => {
  const { products, onProductSelect, selectedProductId, itemsPerRow } = data
  const index = rowIndex * itemsPerRow + columnIndex
  const product = products[index]

  if (!product) return <div style={style} />

  const isSelected = selectedProductId === product.id
  const minPrice = Math.min(...product.variants.map(v => v.price))

  return (
    <div style={{ ...style, padding: '4px' }}>
      <div
        onClick={() => onProductSelect(product)}
        className={`relative p-2 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] group ${
          isSelected
            ? 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/20' 
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        }`}
      >
        {/* Product Image */}
        <div className="aspect-square mb-2 rounded border border-white/20 overflow-hidden bg-white/5">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              <div className="text-xl">👕</div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-white truncate">
            {product.name.replace(/\|.*$/, '').trim()}
          </h4>
          <p className="text-xs text-white/60 capitalize">
            {product.type.replace('-', ' ')}
          </p>
          <p className="text-xs font-semibold text-green-400">
            ${minPrice.toFixed(2)}
          </p>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-transparent transition-all duration-200 rounded-xl pointer-events-none" />
      </div>
    </div>
  )
})

ProductItem.displayName = 'ProductItem'

interface VirtualizedProductGridProps {
  products: Product[]
  onProductSelect: (product: Product) => void
  selectedProductId?: string
}

const VirtualizedProductGrid: React.FC<VirtualizedProductGridProps> = ({
  products,
  onProductSelect,
  selectedProductId
}) => {
  // Calculate grid dimensions for cosmic-card compact layout
  const itemsPerRow = 2
  const itemWidth = 140
  const itemHeight = 180
  const containerWidth = itemsPerRow * itemWidth
  const rowCount = Math.ceil(products.length / itemsPerRow)

  // Memoize grid data to prevent unnecessary re-renders
  const gridData = useMemo(() => ({
    products,
    onProductSelect,
    selectedProductId,
    itemsPerRow
  }), [products, onProductSelect, selectedProductId])

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-2xl mb-1">📦</div>
          <p className="text-xs text-white/60">No products found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Grid
        columnCount={itemsPerRow}
        columnWidth={itemWidth}
        height={Math.min(320, rowCount * itemHeight)} // Max height of 320px
        rowCount={rowCount}
        rowHeight={itemHeight}
        width={containerWidth}
        itemData={gridData}
        style={{ margin: '0 auto' }}
      >
        {ProductItem}
      </Grid>
    </div>
  )
}

export default memo(VirtualizedProductGrid)