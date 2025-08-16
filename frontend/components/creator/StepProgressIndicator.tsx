import React from 'react';

interface StepProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepProgressIndicator: React.FC<StepProgressIndicatorProps> = ({ 
  currentStep, 
  totalSteps 
}) => {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '20px',
      padding: '32px',
      marginBottom: '40px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                background: step <= currentStep 
                  ? 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: step <= currentStep ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                {step}
              </div>
              {step < totalSteps && (
                <div style={{
                  width: '64px',
                  height: '4px',
                  margin: '0 16px',
                  background: step < currentStep 
                    ? 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)'
                    : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px'
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(StepProgressIndicator);