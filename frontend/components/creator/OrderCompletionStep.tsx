import React, { useCallback } from 'react';
import { Product } from './types';
import OrderSummary from './OrderSummary';
import GeneratedImagePreview from './GeneratedImagePreview';

interface OrderCompletionStepProps {
  product: Product;
  selectedVariant: string;
  generatedImage: string | null;
  onVariantChange: (variantId: string) => void;
  onPlaceOrder: () => void;
}

const OrderCompletionStep: React.FC<OrderCompletionStepProps> = ({
  product,
  selectedVariant,
  generatedImage,
  onVariantChange,
  onPlaceOrder
}) => {
  const handleVariantChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onVariantChange(e.target.value);
  }, [onVariantChange]);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '16px', 
          color: '#fff' 
        }}>
          Complete Your Order
        </h2>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: '16px' 
        }}>
          Review your design and place your order.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        alignItems: 'start'
      }}>
        <div>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#fff', 
            marginBottom: '24px' 
          }}>
            Product Details
          </h3>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#fff', 
              marginBottom: '8px' 
            }}>
              Size/Variant
            </label>
            <select
              value={selectedVariant}
              onChange={handleVariantChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none'
              }}
            >
              {product.variants.map((variant) => (
                <option 
                  key={variant.id} 
                  value={variant.id} 
                  style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
                >
                  {variant.name} - ${variant.price}
                </option>
              ))}
            </select>
          </div>

          <OrderSummary 
            product={product} 
            selectedVariant={selectedVariant} 
          />

          <button
            onClick={onPlaceOrder}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Place Order
          </button>
        </div>

        <div>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#fff', 
            marginBottom: '24px' 
          }}>
            Final Preview
          </h3>
          {generatedImage && (
            <GeneratedImagePreview 
              imageUrl={generatedImage} 
              alt="Final product"
              size="large"
              showTitle={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(OrderCompletionStep);