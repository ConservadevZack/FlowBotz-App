import React, { useCallback } from 'react';
import { Product } from './types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(product);
  }, [product, onSelect]);

  const handleMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1.02)';
    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
  }, []);

  const handleMouseOut = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  }, []);

  const minPrice = Math.min(...product.variants.map(v => v.price));

  return (
    <div
      onClick={handleClick}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{
        height: '120px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '48px' }}>📦</span>
      </div>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        color: '#fff', 
        marginBottom: '8px' 
      }}>
        {product.name}
      </h3>
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.6)', 
        marginBottom: '12px' 
      }}>
        {product.category}
      </p>
      <p style={{ 
        color: '#8B5CF6', 
        fontWeight: 'bold' 
      }}>
        From ${minPrice}
      </p>
    </div>
  );
};

export default React.memo(ProductCard);