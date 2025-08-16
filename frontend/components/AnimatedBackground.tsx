'use client'

import { useEffect, useRef, useState } from 'react'

interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  targetX?: number
  targetY?: number
  magnetTarget?: number | null
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const ballsRef = useRef<Ball[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize balls
    const colors = [
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Red
    ]

    const initBalls = () => {
      ballsRef.current = []
      for (let i = 0; i < 8; i++) {
        ballsRef.current.push({
          id: i,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 60 + Math.random() * 80,
          color: colors[Math.floor(Math.random() * colors.length)],
          magnetTarget: null
        })
      }
    }

    initBalls()

    // Animation loop with optimized rendering
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const balls = ballsRef.current

      // Update ball positions and magnetic interactions
      balls.forEach((ball, index) => {
        // Magnetic attraction logic
        let closestBall: Ball | null = null
        let closestDistance = Infinity

        balls.forEach((otherBall, otherIndex) => {
          if (index !== otherIndex) {
            const dx = otherBall.x - ball.x
            const dy = otherBall.y - ball.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance < closestDistance && distance < 300) {
              closestDistance = distance
              closestBall = otherBall
            }
          }
        })

        // Apply magnetic force if close enough
        if (closestBall && closestDistance < 200) {
          const dx = closestBall.x - ball.x
          const dy = closestBall.y - ball.y
          const force = 0.0002
          
          ball.vx += dx * force
          ball.vy += dy * force
        }

        // Add some randomness for fluid motion
        ball.vx += (Math.random() - 0.5) * 0.001
        ball.vy += (Math.random() - 0.5) * 0.001

        // Apply velocity damping
        ball.vx *= 0.995
        ball.vy *= 0.995

        // Update position
        ball.x += ball.vx
        ball.y += ball.vy

        // Bounce off edges with smooth physics
        if (ball.x < ball.radius || ball.x > canvas.width - ball.radius) {
          ball.vx *= -0.8
          ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x))
        }
        if (ball.y < ball.radius || ball.y > canvas.height - ball.radius) {
          ball.vy *= -0.8
          ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y))
        }
      })

      // Render balls with morphing effects
      balls.forEach((ball, index) => {
        // Create morphing gradient
        const gradient = ctx.createRadialGradient(
          ball.x, ball.y, 0,
          ball.x, ball.y, ball.radius
        )
        
        // Dynamic opacity based on movement
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
        const opacity = Math.min(0.8, 0.3 + speed * 100)
        
        gradient.addColorStop(0, `${ball.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(0.7, `${ball.color}20`)
        gradient.addColorStop(1, `${ball.color}00`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        
        // Morphing shape based on velocity and nearby balls
        const morphFactor = speed * 50
        const radiusX = ball.radius + morphFactor
        const radiusY = ball.radius - morphFactor * 0.5
        
        ctx.ellipse(ball.x, ball.y, radiusX, radiusY, Math.atan2(ball.vy, ball.vx), 0, Math.PI * 2)
        ctx.fill()

        // Add connection lines between nearby balls (hydromagnetic effect)
        balls.forEach((otherBall, otherIndex) => {
          if (index !== otherIndex) {
            const dx = otherBall.x - ball.x
            const dy = otherBall.y - ball.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance < 180) {
              const connectionOpacity = (180 - distance) / 180 * 0.3
              const connectionGradient = ctx.createLinearGradient(
                ball.x, ball.y, otherBall.x, otherBall.y
              )
              connectionGradient.addColorStop(0, `${ball.color}${Math.floor(connectionOpacity * 255).toString(16).padStart(2, '0')}`)
              connectionGradient.addColorStop(1, `${otherBall.color}${Math.floor(connectionOpacity * 255).toString(16).padStart(2, '0')}`)
              
              ctx.strokeStyle = connectionGradient
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.moveTo(ball.x, ball.y)
              ctx.lineTo(otherBall.x, otherBall.y)
              ctx.stroke()
            }
          }
        })
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [mounted])

  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Animated Canvas Background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -2,
          pointerEvents: 'none',
          willChange: 'transform',
          background: 'linear-gradient(135deg, #0B1426 0%, #1a1f3a 50%, #2d1b69 100%)'
        }}
      />
      
      {/* Frosted Glass Backdrop Blur Layer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
          background: 'rgba(11, 20, 38, 0.3)',
          backdropFilter: 'blur(60px)',
          WebkitBackdropFilter: 'blur(60px)',
          willChange: 'backdrop-filter'
        }}
      />

      {/* Additional Frosted Glass Texture Layer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
          background: `
            radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)
          `,
          opacity: 0.8,
          willChange: 'opacity'
        }}
      />
    </>
  )
}