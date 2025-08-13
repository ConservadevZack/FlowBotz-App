'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Zap, Shield, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { AnimatedBackground } from '@/components/ui/animated-background'

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized performance with 60fps animations and GPU acceleration'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade security with end-to-end encryption and compliance'
  },
  {
    icon: Layers,
    title: 'Advanced Workflows',
    description: 'Complex automation made simple with visual workflow builder'
  },
  {
    icon: Sparkles,
    title: 'AI-Powered',
    description: 'Intelligent automation that learns and adapts to your needs'
  }
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      
      {/* Hero Section */}
      <section className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="mb-6 text-6xl font-bold leading-tight text-white md:text-7xl lg:text-8xl">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
                FlowBotz
              </span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl text-white/80 md:text-2xl">
              The future of automation is here. Create stunning workflows with our 
              premium glassmorphism platform powered by advanced AI.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-16 flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button 
              size="lg" 
              className="glass-button group text-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="glass-button border-white/30 text-lg hover:bg-white/10"
            >
              Watch Demo
            </Button>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              >
                <GlassCard className="group h-full p-6 text-center transition-all duration-300 hover:scale-105">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/70">
                    {feature.description}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <GlassCard className="p-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-white">10K+</div>
                <div className="text-white/70">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">1M+</div>
                <div className="text-white/70">Workflows Created</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">99.9%</div>
                <div className="text-white/70">Uptime</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  )
}