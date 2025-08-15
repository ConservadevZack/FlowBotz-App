"use client"

import { useState } from 'react'

interface ImageDialogProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  title?: string
}

export default function ImageDialog({ isOpen, onClose, imageUrl, title }: ImageDialogProps) {
  const [isLoading, setIsLoading] = useState(true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative max-w-6xl max-h-[90vh] mx-4 p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm border border-white/20"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image container */}
        <div className="cosmic-card-hero p-4">
          {title && (
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold cosmic-text-gradient">{title}</h3>
            </div>
          )}
          
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-lg">
                <div className="w-8 h-8 border border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
            
            <img
              src={imageUrl}
              alt={title || "Design preview"}
              className="max-w-full max-h-[70vh] object-contain rounded-lg mx-auto block"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6 justify-center">
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.href = imageUrl
                link.download = `flowbotz-design-${Date.now()}.png`
                link.click()
              }}
              className="cosmic-button cosmic-button-ghost"
            >
              💾 Download
            </button>
            <button
              onClick={onClose}
              className="cosmic-button cosmic-button-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}