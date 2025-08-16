import React, { useMemo } from 'react';
import { Product } from './types';
import ProductCard from './ProductCard';
import GeneratedImagePreview from './GeneratedImagePreview';

interface ProductSelectionStepProps {
  products: Product[];
  generatedImage: string | null;
  onProductSelect: (product: Product) => void;
}

const ProductSelectionStep: React.FC<ProductSelectionStepProps> = ({
  products,
  generatedImage,
  onProductSelect
}) => {
  const productCards = useMemo(() => 
    products.map((product) => (
      <ProductCard
        key={product.id}
        product={product}
        onSelect={onProductSelect}
      />
    )), [products, onProductSelect]
  );

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '16px', 
          color: '#fff' 
        }}>
          Choose Your Product
        </h2>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: '16px' 
        }}>
          Select the product you'd like to apply your design to.
        </p>
      </div>

      {generatedImage && (
        <GeneratedImagePreview imageUrl={generatedImage} />
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px'
      }}>
        {productCards}
      </div>
    </div>
  );
};

export default React.memo(ProductSelectionStep);