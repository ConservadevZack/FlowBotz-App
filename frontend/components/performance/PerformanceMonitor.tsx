"use client"

import React, { useEffect, useState, useCallback } from 'react'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERFORMANCE MONITOR
 * Real-time performance monitoring and optimization insights
 * Core Web Vitals tracking and bundle analysis
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  
  // Custom metrics
  loadTime: number
  domReady: number
  memoryUsage: number
  bundleSize: number
  
  // Navigation timing
  navigationStart: number
  domContentLoaded: number
  loadComplete: number
  
  // Connection info
  connectionType: string
  effectiveType: string
  downlink: number
  rtt: number
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  const collectMetrics = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')
    
    // Core Web Vitals collection
    let fcp = null
    let lcp = null
    let fid = null
    let cls = null
    
    // First Contentful Paint
    const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint')
    if (fcpEntry) fcp = fcpEntry.startTime
    
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          if (lastEntry) lcp = lastEntry.startTime
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
        
        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              fid = entry.processingStart - entry.startTime
            }
          })
        })
        fidObserver.observe({ type: 'first-input', buffered: true })
        
        // Cumulative Layout Shift
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          cls = clsValue
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })
      } catch (e) {
        console.warn('Performance Observer not fully supported:', e)
      }
    }
    
    // Memory usage (if available)
    let memoryUsage = 0
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = memory.usedJSHeapSize / (1024 * 1024) // Convert to MB
    }
    
    // Connection info
    let connectionInfo = {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0
    }
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connectionInfo = {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      }
    }
    
    const newMetrics: PerformanceMetrics = {
      fcp,
      lcp,
      fid,
      cls,
      ttfb: navigation.responseStart - navigation.requestStart,
      loadTime: navigation.loadEventEnd - navigation.startTime,
      domReady: navigation.domContentLoadedEventEnd - navigation.startTime,
      memoryUsage,
      bundleSize: 0, // Would need to be calculated separately
      navigationStart: navigation.startTime,
      domContentLoaded: navigation.domContentLoadedEventEnd,
      loadComplete: navigation.loadEventEnd,
      ...connectionInfo
    }
    
    setMetrics(newMetrics)
  }, [])
  
  useEffect(() => {
    // Collect metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 1000) // Wait a bit for all metrics to be available
    } else {
      window.addEventListener('load', () => {
        setTimeout(collectMetrics, 1000)
      })
    }
    
    // Keyboard shortcut to show/hide monitor (Ctrl+Shift+P)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [collectMetrics, isVisible])
  
  const getScoreColor = (value: number | null, thresholds: { good: number; poor: number }): string => {
    if (value === null) return '#6b7280'
    if (value <= thresholds.good) return '#10b981'
    if (value <= thresholds.poor) return '#f59e0b'
    return '#ef4444'
  }
  
  const getScoreLabel = (value: number | null, thresholds: { good: number; poor: number }): string => {
    if (value === null) return 'N/A'
    if (value <= thresholds.good) return 'Good'
    if (value <= thresholds.poor) return 'Needs Improvement'
    return 'Poor'
  }
  
  if (!isVisible || !metrics) return null
  
  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <h3 className="monitor-title">⚡ Performance Monitor</h3>
        <button
          className="close-btn"
          onClick={() => setIsVisible(false)}
        >
          ✕
        </button>
      </div>
      
      <div className="metrics-grid">
        {/* Core Web Vitals */}
        <div className="metric-section">
          <h4 className="section-title">Core Web Vitals</h4>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">First Contentful Paint (FCP)</span>
              <span className="metric-description">Time until first content appears</span>
            </div>
            <div className="metric-value">
              <span 
                className="value"
                style={{ color: getScoreColor(metrics.fcp, { good: 1800, poor: 3000 }) }}
              >
                {metrics.fcp ? `${(metrics.fcp / 1000).toFixed(2)}s` : 'N/A'}
              </span>
              <span 
                className="score"
                style={{ color: getScoreColor(metrics.fcp, { good: 1800, poor: 3000 }) }}
              >
                {getScoreLabel(metrics.fcp, { good: 1800, poor: 3000 })}
              </span>
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">Largest Contentful Paint (LCP)</span>
              <span className="metric-description">Time until largest content element</span>
            </div>
            <div className="metric-value">
              <span 
                className="value"
                style={{ color: getScoreColor(metrics.lcp, { good: 2500, poor: 4000 }) }}
              >
                {metrics.lcp ? `${(metrics.lcp / 1000).toFixed(2)}s` : 'N/A'}
              </span>
              <span 
                className="score"
                style={{ color: getScoreColor(metrics.lcp, { good: 2500, poor: 4000 }) }}
              >
                {getScoreLabel(metrics.lcp, { good: 2500, poor: 4000 })}
              </span>
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">First Input Delay (FID)</span>
              <span className="metric-description">Time until page becomes interactive</span>
            </div>
            <div className="metric-value">
              <span 
                className="value"
                style={{ color: getScoreColor(metrics.fid, { good: 100, poor: 300 }) }}
              >
                {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A'}
              </span>
              <span 
                className="score"
                style={{ color: getScoreColor(metrics.fid, { good: 100, poor: 300 }) }}
              >
                {getScoreLabel(metrics.fid, { good: 100, poor: 300 })}
              </span>
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">Cumulative Layout Shift (CLS)</span>
              <span className="metric-description">Visual stability of the page</span>
            </div>
            <div className="metric-value">
              <span 
                className="value"
                style={{ color: getScoreColor(metrics.cls, { good: 0.1, poor: 0.25 }) }}
              >
                {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
              </span>
              <span 
                className="score"
                style={{ color: getScoreColor(metrics.cls, { good: 0.1, poor: 0.25 }) }}
              >
                {getScoreLabel(metrics.cls, { good: 0.1, poor: 0.25 })}
              </span>
            </div>
          </div>
        </div>
        
        {/* Loading Metrics */}
        <div className="metric-section">
          <h4 className="section-title">Loading Performance</h4>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">Time to First Byte (TTFB)</span>
              <span className="metric-description">Server response time</span>
            </div>
            <div className="metric-value">
              <span className="value">
                {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">DOM Ready</span>
              <span className="metric-description">Time until DOM is ready</span>
            </div>
            <div className="metric-value">
              <span className="value">
                {`${(metrics.domReady / 1000).toFixed(2)}s`}
              </span>
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">Page Load</span>
              <span className="metric-description">Complete page load time</span>
            </div>
            <div className="metric-value">
              <span className="value">
                {`${(metrics.loadTime / 1000).toFixed(2)}s`}
              </span>
            </div>
          </div>
          
          {metrics.memoryUsage > 0 && (
            <div className="metric-item">
              <div className="metric-info">
                <span className="metric-name">Memory Usage</span>
                <span className="metric-description">JavaScript heap size</span>
              </div>
              <div className="metric-value">
                <span className="value">
                  {`${metrics.memoryUsage.toFixed(1)}MB`}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Network Info */}
        <div className="metric-section">
          <h4 className="section-title">Network Information</h4>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">Connection Type</span>
              <span className="metric-description">Network connection type</span>
            </div>
            <div className="metric-value">
              <span className="value">{metrics.connectionType}</span>
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-info">
              <span className="metric-name">Effective Type</span>
              <span className="metric-description">Perceived connection speed</span>
            </div>
            <div className="metric-value">
              <span className="value">{metrics.effectiveType}</span>
            </div>
          </div>
          
          {metrics.downlink > 0 && (
            <div className="metric-item">
              <div className="metric-info">
                <span className="metric-name">Download Speed</span>
                <span className="metric-description">Estimated bandwidth</span>
              </div>
              <div className="metric-value">
                <span className="value">{`${metrics.downlink} Mbps`}</span>
              </div>
            </div>
          )}
          
          {metrics.rtt > 0 && (
            <div className="metric-item">
              <div className="metric-info">
                <span className="metric-name">Round Trip Time</span>
                <span className="metric-description">Network latency</span>
              </div>
              <div className="metric-value">
                <span className="value">{`${metrics.rtt}ms`}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="monitor-footer">
        <span className="shortcut-hint">Press Ctrl+Shift+P to toggle</span>
        <button 
          className="refresh-btn"
          onClick={collectMetrics}
        >
          🔄 Refresh
        </button>
      </div>
      
      <style jsx>{`
        .performance-monitor {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 600px;
          max-height: 80vh;
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          overflow-y: auto;
          z-index: 10000;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        
        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .monitor-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #6366f1;
        }
        
        .close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          padding: 20px;
        }
        
        .metric-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .metric-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .metric-item:last-child {
          border-bottom: none;
        }
        
        .metric-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        
        .metric-name {
          font-weight: 500;
          color: white;
          font-size: 11px;
        }
        
        .metric-description {
          color: rgba(255, 255, 255, 0.6);
          font-size: 10px;
        }
        
        .metric-value {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        
        .value {
          font-weight: 600;
          font-family: monospace;
          font-size: 12px;
        }
        
        .score {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 500;
          opacity: 0.8;
        }
        
        .monitor-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
        }
        
        .shortcut-hint {
          color: rgba(255, 255, 255, 0.5);
          font-size: 10px;
        }
        
        .refresh-btn {
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #a5b4fc;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
          transition: all 0.2s ease;
        }
        
        .refresh-btn:hover {
          background: rgba(99, 102, 241, 0.3);
        }
        
        /* Mobile adjustments */
        @media (max-width: 768px) {
          .performance-monitor {
            width: calc(100vw - 40px);
            max-width: 500px;
            left: 50%;
            transform: translateX(-50%);
            top: 10px;
            right: auto;
          }
        }
        
        @media (max-width: 480px) {
          .performance-monitor {
            width: calc(100vw - 20px);
            top: 10px;
            left: 10px;
            right: 10px;
            transform: none;
          }
          
          .monitor-header {
            padding: 12px 16px;
          }
          
          .metrics-grid {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default PerformanceMonitor