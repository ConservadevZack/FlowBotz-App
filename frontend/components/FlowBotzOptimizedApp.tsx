"use client"

import React from 'react'

/**
 * Simple FlowBotz app component for POD workflow
 * Removed complex features and kept only essential functionality
 */

interface FlowBotzOptimizedAppProps {
  className?: string
}

const FlowBotzOptimizedApp: React.FC<FlowBotzOptimizedAppProps> = ({
  className = ''
}) => {
  return (
    <div className={`flowbotz-optimized-app ${className}`}>
      <div className="app-content">
        <div className="simple-message">
          <h2>FlowBotz Simplified</h2>
          <p>This component has been simplified. Use the main navigation to access the POD Creator.</p>
          <div className="actions">
            <a href="/creator" className="action-button">
              Go to Creator
            </a>
            <a href="/dashboard" className="action-button secondary">
              Dashboard
            </a>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .flowbotz-optimized-app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          background: #0f172a;
          color: white;
        }
        
        .app-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        
        .simple-message {
          text-align: center;
          max-width: 500px;
        }
        
        .simple-message h2 {
          font-size: 2rem;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .simple-message p {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        
        .actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .action-button {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }
        
        .action-button.secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .action-button.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 25px rgba(255, 255, 255, 0.1);
        }
        
        @media (max-width: 768px) {
          .simple-message h2 {
            font-size: 1.5rem;
          }
          
          .simple-message p {
            font-size: 1rem;
          }
          
          .actions {
            flex-direction: column;
            align-items: center;
          }
          
          .action-button {
            width: 200px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}

export default FlowBotzOptimizedApp