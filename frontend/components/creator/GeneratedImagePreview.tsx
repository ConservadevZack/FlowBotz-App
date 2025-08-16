import React from 'react';

interface GeneratedImagePreviewProps {
  imageUrl: string;
  alt?: string;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  showTitle?: boolean;
}

const GeneratedImagePreview: React.FC<GeneratedImagePreviewProps> = ({
  imageUrl,
  alt = "Generated design",
  title = "Your Generated Design",
  size = 'medium',
  showTitle = true
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: '150px', height: '150px' };
      case 'large':
        return { width: '100%', height: 'auto' };
      default:
        return { width: '200px', height: '200px' };
    }
  };

  return (
    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
      <div style={{
        display: 'inline-block',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: size === 'large' ? '16px' : '24px',
        borderRadius: '16px'
      }}>
        <img 
          src={imageUrl} 
          alt={alt}
          style={{
            ...getSizeStyles(),
            objectFit: size === 'large' ? 'contain' : 'cover',
            borderRadius: '12px',
            cursor: 'pointer',
            border: size === 'large' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
          }}
        />
        {showTitle && size !== 'large' && (
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '14px', 
            marginTop: '12px' 
          }}>
            {title}
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(GeneratedImagePreview);