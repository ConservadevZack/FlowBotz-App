import React, { useCallback } from 'react';

interface DesignPromptStepProps {
  prompt: string;
  isGenerating: boolean;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => Promise<void>;
}

const DesignPromptStep: React.FC<DesignPromptStepProps> = ({
  prompt,
  isGenerating,
  onPromptChange,
  onGenerate
}) => {
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPromptChange(e.target.value);
  }, [onPromptChange]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: 'bold', 
        marginBottom: '16px', 
        color: '#fff' 
      }}>
        What would you like to create?
      </h2>
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.7)', 
        marginBottom: '32px', 
        fontSize: '16px' 
      }}>
        Describe your design idea in detail. The more specific you are, the better the AI can bring your vision to life.
      </p>
      
      <div style={{ marginBottom: '32px' }}>
        <textarea
          value={prompt}
          onChange={handlePromptChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Example: A vibrant sunset over mountains with geometric patterns, in a retro synthwave style with purple and orange colors..."
          style={{
            width: '100%',
            height: '150px',
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            color: '#fff',
            fontSize: '16px',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>
      
      <button
        onClick={onGenerate}
        disabled={!prompt.trim() || isGenerating}
        style={{
          width: '100%',
          padding: '20px',
          background: isGenerating 
            ? 'rgba(139, 92, 246, 0.3)'
            : 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
          border: 'none',
          borderRadius: '16px',
          color: '#fff',
          fontSize: '18px',
          fontWeight: '700',
          cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
          opacity: isGenerating || !prompt.trim() ? 0.5 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        {isGenerating ? 'Generating Design...' : 'Generate Design'}
      </button>
    </div>
  );
};

export default React.memo(DesignPromptStep);