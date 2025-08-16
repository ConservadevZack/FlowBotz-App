import React, { useMemo } from 'react';
import { Product, ProductVariant } from './types';

interface OrderSummaryProps {
  product: Product;
  selectedVariant: string;
  shippingCost?: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  product,
  selectedVariant,
  shippingCost = 4.99
}) => {
  const variant = useMemo(() => 
    product.variants.find(v => v.id === selectedVariant),
    [product.variants, selectedVariant]
  );

  const total = useMemo(() => 
    ((variant?.price || 0) + shippingCost).toFixed(2),
    [variant?.price, shippingCost]
  );

  if (!variant) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <h4 style={{ 
        fontSize: '16px', 
        fontWeight: '600', 
        color: '#fff', 
        marginBottom: '12px' 
      }}>
        Order Summary
      </h4>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '16px', 
        borderRadius: '12px' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '8px' 
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {product.name}
          </span>
          <span style={{ color: '#fff' }}>
            ${variant.price}
          </span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '8px' 
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Shipping
          </span>
          <span style={{ color: '#fff' }}>
            ${shippingCost}
          </span>
        </div>
        <div style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
          paddingTop: '8px' 
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '18px', 
            fontWeight: 'bold' 
          }}>
            <span style={{ color: '#fff' }}>Total</span>
            <span style={{ color: '#8B5CF6' }}>${total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(OrderSummary);