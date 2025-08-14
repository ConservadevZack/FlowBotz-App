import Link from "next/link";
import { Sparkles, Wand2, Rocket, Star, ArrowRight, Play, Palette, Zap, Image as ImageIcon } from "lucide-react";
import FloatingNavbar from '@/components/FloatingNavbar';

export default function HomePage() {
  return (
    <div className="min-h-screen relative">
      {/* Animated Particles */}
      <div className="cosmic-particles">
        {/* Generate 20 particles with fixed positions and colors to avoid hydration mismatch */}
        {Array.from({ length: 20 }, (_, i) => {
          const sizes = ['small', 'medium', 'large'];
          const colors = ['purple', 'blue', 'pink', 'green', 'gold', 'white'];
          const size = sizes[i % sizes.length];
          const color = colors[i % colors.length];
          // Use deterministic position based on index to avoid hydration mismatch
          const leftPosition = (i * 4.7) % 100; // Creates pseudo-random but deterministic positions
          
          return (
            <div
              key={i}
              className={`cosmic-particle cosmic-particle-${size} cosmic-particle-${color}`}
              style={{
                left: `${leftPosition}%`,
              }}
            />
          );
        })}
      </div>
      
      <FloatingNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-20 px-4 sm:px-6 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center">
            {/* Hero Content */}
            <div className="cosmic-card-hero max-w-5xl mx-auto">
              <div className="space-y-8 sm:space-y-12">
                {/* Floating Badge */}
                <div className="stellar-glass-purple rounded-full px-4 sm:px-8 py-3 sm:py-4 inline-flex items-center gap-2 sm:gap-4 cosmic-animate-pulse">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span className="text-body-small sm:text-body text-white font-semibold">
                    AI-Powered Design Creation
                  </span>
                </div>

                {/* Main Headline */}
                <div className="space-y-4 sm:space-y-6">
                  <h1 className="text-display-large leading-tight">
                    Create Stunning Designs with AI
                  </h1>
                  <h2 className="text-display-small text-white/90 leading-tight">
                    Transform your ideas into <span className="stellar-text-gradient">beautiful products</span> in seconds
                  </h2>
                </div>

                {/* Description */}
                <p className="text-body-large max-w-3xl mx-auto text-white/80 px-4">
                  Generate amazing designs with AI, see them on real products instantly, and order with one click. 
                  From concept to creation in minutes, not hours.
                </p>

                {/* CTA Buttons - Mobile optimized */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-6 sm:pt-8 px-4">
                  <Link href="/create" className="cosmic-button cosmic-button-primary cosmic-button-xl cosmic-animate-shimmer min-h-[56px] w-full sm:w-auto">
                    <Wand2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    Start Creating Free
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Link>
                  <Link href="/demo" className="cosmic-button cosmic-button-glass cosmic-button-xl min-h-[56px] w-full sm:w-auto">
                    <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                    Watch Demo
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto mt-16 sm:mt-20 px-4">
              <div className="cosmic-card-feature text-center group cosmic-card-interactive min-h-[120px] flex items-center justify-center">
                <div className="space-y-3">
                  <div className="text-4xl sm:text-5xl font-bold cosmic-text-gradient">50K+</div>
                  <p className="text-body text-white/80">Designs Created</p>
                </div>
              </div>
              <div className="cosmic-card-feature text-center group cosmic-card-interactive min-h-[120px] flex items-center justify-center">
                <div className="space-y-3">
                  <div className="text-4xl sm:text-5xl font-bold stellar-text-gradient">200+</div>
                  <p className="text-body text-white/80">Product Types</p>
                </div>
              </div>
              <div className="cosmic-card-feature text-center group cosmic-card-interactive min-h-[120px] flex items-center justify-center">
                <div className="space-y-3">
                  <div className="text-4xl sm:text-5xl font-bold nebula-text-gradient">24/7</div>
                  <p className="text-body text-white/80">AI Available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 sm:mb-20">
            <div className="cosmic-card-hero max-w-4xl mx-auto">
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-display-medium">How FlowBotz Works</h2>
                <p className="text-body-large text-white/80 px-4">
                  Three simple steps to turn your imagination into reality
                </p>
              </div>
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            {/* Step 1 */}
            <div className="cosmic-card-feature cosmic-card-interactive group">
              <div className="text-center space-y-8">
                <div className="stellar-glass-purple w-20 h-20 rounded-full flex items-center justify-center mx-auto cosmic-animate-glow">
                  <Palette className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-h4">1. Describe Your Vision</h3>
                  <p className="text-body text-white/80">
                    Simply tell our AI what you want to create. Use natural language to describe your perfect design.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-body-small text-white/90 font-medium">
                    Text Prompts
                  </span>
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-body-small text-white/90 font-medium">
                    Style Selection
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="cosmic-card-feature cosmic-card-interactive group">
              <div className="text-center space-y-8">
                <div className="stellar-glass-blue w-20 h-20 rounded-full flex items-center justify-center mx-auto cosmic-animate-glow">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-h4">2. AI Creates Magic</h3>
                  <p className="text-body text-white/80">
                    Watch as our advanced AI transforms your words into stunning, professional-quality designs.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-body-small text-white/90 font-medium">
                    Instant Generation
                  </span>
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-body-small text-white/90 font-medium">
                    High Quality
                  </span>
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-body-small text-white/90 font-medium">
                    Multiple Variations
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="cosmic-card-feature cosmic-card-interactive group">
              <div className="text-center space-y-8">
                <div className="stellar-glass-pink w-20 h-20 rounded-full flex items-center justify-center mx-auto cosmic-animate-glow">
                  <Rocket className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-h4">3. Order & Receive</h3>
                  <p className="text-body text-white/80">
                    Preview your design on real products, customize as needed, and order with confidence.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-body-small text-white/90 font-medium">
                    Product Mockups
                  </span>
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-body-small text-white/90 font-medium">
                    One-Click Order
                  </span>
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-body-small text-white/90 font-medium">
                    Fast Shipping
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto text-center">
          <div className="cosmic-card-hero">
            <div className="space-y-8 sm:space-y-12">
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-display-medium px-4">
                  Ready to Create Something <span className="cosmic-text-gradient">Amazing?</span>
                </h2>
                <p className="text-body-large text-white/80 max-w-3xl mx-auto px-4">
                  Join thousands of creators who've transformed their ideas into beautiful products. 
                  Start your creative journey today.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center px-4">
                <Link href="/create" className="cosmic-button cosmic-button-primary cosmic-button-xl cosmic-animate-shimmer min-h-[56px] w-full sm:w-auto">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                  Start Creating Free
                </Link>
                <Link href="/pricing" className="cosmic-button cosmic-button-accent cosmic-button-xl min-h-[56px] w-full sm:w-auto">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6" />
                  View Pricing
                </Link>
              </div>

              <div className="cosmic-glass rounded-2xl inline-flex items-center gap-6 p-6">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-5 h-5 text-yellow-400 fill-current cosmic-animate-pulse" 
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <span className="text-body text-white font-semibold">
                  Loved by 50,000+ creators
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 sm:py-20 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-12 sm:mb-16">
            {/* Brand */}
            <div className="space-y-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="stellar-glass-purple w-12 h-12 rounded-2xl flex items-center justify-center cosmic-animate-glow">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-h5 cosmic-text-gradient">FlowBotz</span>
              </Link>
              <p className="text-body text-white/70">
                Transform your creative ideas into stunning products with the power of AI.
              </p>
            </div>

            {/* Product */}
            <div className="space-y-6">
              <h4 className="text-h6">Product</h4>
              <div className="space-y-4">
                <Link href="/create" className="text-body text-white/70 hover:text-white transition-colors block">
                  AI Creator
                </Link>
                <Link href="/gallery" className="text-body text-white/70 hover:text-white transition-colors block">
                  Gallery
                </Link>
                <Link href="/pricing" className="text-body text-white/70 hover:text-white transition-colors block">
                  Pricing
                </Link>
              </div>
            </div>

            {/* Company */}
            <div className="space-y-6">
              <h4 className="text-h6">Company</h4>
              <div className="space-y-4">
                <Link href="/about" className="text-body text-white/70 hover:text-white transition-colors block">
                  About
                </Link>
                <Link href="/contact" className="text-body text-white/70 hover:text-white transition-colors block">
                  Contact
                </Link>
                <Link href="/careers" className="text-body text-white/70 hover:text-white transition-colors block">
                  Careers
                </Link>
              </div>
            </div>

            {/* Support */}
            <div className="space-y-6">
              <h4 className="text-h6">Support</h4>
              <div className="space-y-4">
                <Link href="/help" className="text-body text-white/70 hover:text-white transition-colors block">
                  Help Center
                </Link>
                <Link href="/privacy" className="text-body text-white/70 hover:text-white transition-colors block">
                  Privacy
                </Link>
                <Link href="/terms" className="text-body text-white/70 hover:text-white transition-colors block">
                  Terms
                </Link>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="cosmic-glass rounded-2xl text-center p-8">
            <p className="text-body text-white/70">
              © 2025 FlowBotz. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}