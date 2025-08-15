import Link from "next/link";
import { Sparkles, Wand2, Rocket, Star, ArrowRight, Play, Palette, Zap, Image as ImageIcon } from "lucide-react";
import FloatingNavbar from '@/components/FloatingNavbar';

export default function HomePage() {
  return (
    <div className="min-h-screen relative">
      {/* Skip to content for accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
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
      <main id="main-content">
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-24 px-4 sm:px-6 min-h-screen flex items-center" role="banner" aria-labelledby="hero-heading" aria-describedby="hero-description">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center">
            {/* Hero Content */}
            <div className="cosmic-card-premium max-w-5xl mx-auto cosmic-animate-page-enter p-8 sm:p-12 lg:p-16">
              <div className="space-y-8 sm:space-y-12">
                {/* Floating Badge */}
                <div className="stellar-glass-purple rounded-full px-6 sm:px-8 py-3 sm:py-4 inline-flex items-center gap-3 sm:gap-4 cosmic-animate-bounce-in cosmic-interactive cosmic-tooltip border border-purple-400/30">
                  <div className="cosmic-tooltip-content">AI-Powered Design Generation</div>
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span className="text-sm sm:text-base text-white font-semibold">
                    AI-Powered Design Creation
                  </span>
                </div>

                {/* Main Headline */}
                <div className="space-y-6 sm:space-y-8">
                  <h1 id="hero-heading" className="text-display-large leading-tight font-extrabold tracking-tight">
                    Create Stunning Designs with AI
                  </h1>
                  <h2 id="hero-description" className="text-display-small text-white/95 leading-tight font-medium">
                    Transform your ideas into <span className="stellar-text-gradient font-semibold">beautiful products</span> in seconds
                  </h2>
                </div>

                {/* Description */}
                <p className="text-body-large max-w-3xl mx-auto text-white/85 px-4 leading-relaxed font-medium">
                  Generate amazing designs with AI, see them on real products instantly, and order with one click. 
                  From concept to creation in minutes, not hours.
                </p>

                {/* CTA Buttons - Mobile optimized */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8 sm:pt-10 px-4 max-w-2xl mx-auto">
                  <Link href="/creator" className="cosmic-button-premium cosmic-button-xl cosmic-animate-shimmer min-h-[64px] flex-1 sm:flex-none sm:px-8 cosmic-tooltip font-bold text-lg shadow-2xl transform hover:scale-105 transition-all duration-300">
                    <div className="cosmic-tooltip-content">Create your first AI design</div>
                    <Wand2 className="w-6 h-6 cosmic-animate-icon-bounce" />
                    Start Creating Free
                    <ArrowRight className="w-6 h-6" />
                  </Link>
                  <Link href="/demo" className="cosmic-button cosmic-button-glass cosmic-button-xl min-h-[64px] flex-1 sm:flex-none sm:px-8 cosmic-tooltip font-bold text-lg border-2 border-white/20 hover:border-white/40">
                    <div className="cosmic-tooltip-content">See FlowBotz in action</div>
                    <Play className="w-6 h-6" />
                    Watch Demo
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <section aria-labelledby="stats-heading" className="mt-20 sm:mt-24 px-4">
              <h2 id="stats-heading" className="sr-only">Platform Statistics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto cosmic-stagger">
                <div className="cosmic-card-premium text-center group cosmic-card-interactive min-h-[160px] flex items-center justify-center cosmic-animate-scale-in cosmic-focus-ring cosmic-tooltip p-8" tabIndex={0} role="img" aria-labelledby="stat1-value stat1-label">
                  <div className="cosmic-tooltip-content">Designs created by our community</div>
                  <div className="space-y-4">
                    <div id="stat1-value" className="text-4xl sm:text-5xl font-extrabold cosmic-text-gradient cosmic-animate-text-reveal tracking-tight">50K+</div>
                    <p id="stat1-label" className="text-base text-white/85 font-semibold">Designs Created</p>
                  </div>
                </div>
                <div className="cosmic-card-premium text-center group cosmic-card-interactive min-h-[160px] flex items-center justify-center cosmic-animate-scale-in cosmic-focus-ring cosmic-tooltip p-8" tabIndex={0} role="img" aria-labelledby="stat2-value stat2-label">
                  <div className="cosmic-tooltip-content">Different product categories available</div>
                  <div className="space-y-4">
                    <div id="stat2-value" className="text-4xl sm:text-5xl font-extrabold stellar-text-gradient cosmic-animate-text-reveal tracking-tight">200+</div>
                    <p id="stat2-label" className="text-base text-white/85 font-semibold">Product Types</p>
                  </div>
                </div>
                <div className="cosmic-card-premium text-center group cosmic-card-interactive min-h-[160px] flex items-center justify-center cosmic-animate-scale-in cosmic-focus-ring cosmic-tooltip p-8" tabIndex={0} role="img" aria-labelledby="stat3-value stat3-label">
                  <div className="cosmic-tooltip-content">AI is always ready to help</div>
                  <div className="space-y-4">
                    <div id="stat3-value" className="text-4xl sm:text-5xl font-extrabold nebula-text-gradient cosmic-animate-text-reveal tracking-tight">24/7</div>
                    <p id="stat3-label" className="text-base text-white/85 font-semibold">AI Available</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20 sm:mb-24">
            <div className="cosmic-card-premium max-w-4xl mx-auto cosmic-animate-slide-in-left p-8">
              <div className="space-y-6 sm:space-y-8">
                <h2 id="how-it-works-heading" className="text-display-medium font-bold">How FlowBotz Works</h2>
                <p className="text-body-large text-white/85 px-4 font-medium leading-relaxed">
                  Three simple steps to turn your imagination into reality
                </p>
              </div>
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 cosmic-stagger max-w-6xl mx-auto">
            {/* Step 1 */}
            <article className="cosmic-card-premium cosmic-card-interactive group cosmic-animate-fade-in cosmic-focus-ring cosmic-tooltip p-8 min-h-[420px] flex flex-col" tabIndex={0} role="article" aria-labelledby="step1-heading" aria-describedby="step1-description">
              <div className="cosmic-tooltip-content">Tell AI what you want to create</div>
              <div className="text-center space-y-8 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="stellar-glass-purple w-20 h-20 rounded-2xl flex items-center justify-center mx-auto cosmic-animate-glow shadow-2xl">
                    <Palette className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-4">
                    <h3 id="step1-heading" className="text-xl font-bold">1. Describe Your Vision</h3>
                    <p id="step1-description" className="text-base text-white/85 leading-relaxed font-medium">
                      Simply tell our AI what you want to create. Use natural language to describe your perfect design.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-sm text-white/90 font-semibold border border-white/20">
                    Text Prompts
                  </span>
                  <span className="cosmic-glass px-4 py-2 rounded-xl text-sm text-white/90 font-semibold border border-white/20">
                    Style Selection
                  </span>
                </div>
              </div>
            </article>

            {/* Step 2 */}
            <article className="cosmic-card-premium cosmic-card-interactive group cosmic-animate-fade-in cosmic-focus-ring cosmic-tooltip p-8 min-h-[420px] flex flex-col" tabIndex={0} role="article" aria-labelledby="step2-heading" aria-describedby="step2-description">
              <div className="cosmic-tooltip-content">Watch AI transform your ideas</div>
              <div className="text-center space-y-8 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="stellar-glass-blue w-20 h-20 rounded-2xl flex items-center justify-center mx-auto cosmic-animate-glow shadow-2xl">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-4">
                    <h3 id="step2-heading" className="text-xl font-bold">2. AI Creates Magic</h3>
                    <p id="step2-description" className="text-base text-white/85 leading-relaxed font-medium">
                      Watch as our advanced AI transforms your words into stunning, professional-quality designs.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="cosmic-glass px-3 py-2 rounded-xl text-sm text-white/90 font-semibold border border-white/20">
                    Instant Generation
                  </span>
                  <span className="cosmic-glass px-3 py-2 rounded-xl text-sm text-white/90 font-semibold border border-white/20">
                    High Quality
                  </span>
                  <span className="cosmic-glass px-3 py-2 rounded-xl text-sm text-white/90 font-semibold border border-white/20">
                    Multiple Variations
                  </span>
                </div>
              </div>
            </article>

            {/* Step 3 */}
            <article className="cosmic-card-premium cosmic-card-interactive group cosmic-animate-fade-in cosmic-focus-ring cosmic-tooltip p-8 min-h-[420px] flex flex-col" tabIndex={0} role="article" aria-labelledby="step3-heading" aria-describedby="step3-description">
              <div className="cosmic-tooltip-content">Get your designs on real products</div>
              <div className="text-center space-y-8 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="stellar-glass-pink w-20 h-20 rounded-2xl flex items-center justify-center mx-auto cosmic-animate-glow shadow-2xl">
                    <Rocket className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-4">
                    <h3 id="step3-heading" className="text-xl font-bold">3. Order & Receive</h3>
                    <p id="step3-description" className="text-base text-white/85 leading-relaxed font-medium">
                      Preview your design on real products, customize as needed, and order with confidence.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="cosmic-glass px-3 py-2 rounded-xl text-sm text-white/90 font-semibold border border-white/20">
                    Product Mockups
                  </span>
                  <span className="cosmic-glass px-3 py-2 rounded-xl text-sm text-white/90 font-semibold border border-white/20">
                    One-Click Order
                  </span>
                  <span className="cosmic-glass px-3 py-2 rounded-xl text-sm text-white/90 font-semibold border border-white/20">
                    Fast Shipping
                  </span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative" aria-labelledby="cta-heading">
        <div className="max-w-6xl mx-auto text-center">
          <div className="cosmic-card-premium cosmic-animate-scale-in p-12">
            <div className="space-y-10 sm:space-y-12">
              <div className="space-y-6 sm:space-y-8">
                <h2 id="cta-heading" className="text-display-medium px-4 font-bold">
                  Ready to Create Something <span className="cosmic-text-gradient">Amazing?</span>
                </h2>
                <p className="text-body-large text-white/85 max-w-3xl mx-auto px-4 font-medium leading-relaxed">
                  Join thousands of creators who've transformed their ideas into beautiful products. 
                  Start your creative journey today.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 justify-center px-4">
                <Link href="/create" className="cosmic-button-premium cosmic-button-xl cosmic-animate-shimmer min-h-[64px] w-full sm:w-auto cosmic-tooltip font-bold text-xl shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <div className="cosmic-tooltip-content">Begin your creative journey</div>
                  <Sparkles className="w-6 h-6 cosmic-animate-icon-bounce" />
                  Start Creating Free
                </Link>
                <Link href="/pricing" className="cosmic-button cosmic-button-accent cosmic-button-xl min-h-[64px] w-full sm:w-auto cosmic-tooltip font-bold text-xl border-2 border-white/30 hover:border-white/50">
                  <div className="cosmic-tooltip-content">Explore our plans and pricing</div>
                  <Star className="w-6 h-6" />
                  View Pricing
                </Link>
              </div>

              <div className="cosmic-glass rounded-2xl inline-flex items-center gap-6 p-8 cosmic-animate-bounce-in cosmic-interactive border border-white/20 backdrop-blur-xl">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-6 h-6 text-yellow-400 fill-current cosmic-animate-pulse" 
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <span className="text-body-large text-white font-bold">
                  Loved by 50,000+ creators
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-20 sm:py-24 px-4 sm:px-6 relative border-t border-white/10" role="contentinfo" aria-label="Site footer">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12 mb-16 sm:mb-20">
            {/* Brand */}
            <div className="space-y-6">
              <Link href="/" className="flex items-center gap-3 group" aria-label="FlowBotz homepage">
                <div className="stellar-glass-purple w-14 h-14 rounded-2xl flex items-center justify-center cosmic-animate-glow group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <span className="text-h4 cosmic-text-gradient font-bold">FlowBotz</span>
              </Link>
              <p className="text-body text-white/75 leading-relaxed font-medium">
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
          <div className="cosmic-glass rounded-2xl text-center p-8 border border-white/20">
            <p className="text-body text-white/75 font-medium">
              © 2025 FlowBotz. All rights reserved. Built with ❤️ for creators worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}