'use client'

import { useEffect, useRef } from 'react'

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)

    // Particle system for subtle floating dots
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number

      constructor() {
        this.x = Math.random() * (canvas?.width ?? 800)
        this.y = Math.random() * (canvas?.height ?? 600)
        this.size = Math.random() * 2 + 0.5
        this.speedX = (Math.random() - 0.5) * 0.3
        this.speedY = (Math.random() - 0.5) * 0.3
        this.opacity = Math.random() * 0.3 + 0.1
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        // Wrap around edges
        if (this.x > (canvas?.width ?? 800)) this.x = 0
        if (this.x < 0) this.x = canvas?.width ?? 800
        if (this.y > (canvas?.height ?? 600)) this.y = 0
        if (this.y < 0) this.y = canvas?.height ?? 600
      }

      draw() {
        if (!ctx) return
        // Use currentColor for better theme adaptation
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const rgb = isDark ? '200, 200, 200' : '100, 100, 100'
        ctx.fillStyle = `rgba(${rgb}, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Create particles
    const particles: Particle[] = []
    const particleCount = 50
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    // Animation loop
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })

      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', setCanvasSize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="absolute inset-0 -z-10">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.6 }}
      />
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/8 rounded-full filter blur-3xl animate-blob dark:bg-primary/5" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/8 rounded-full filter blur-3xl animate-blob animation-delay-2000 dark:bg-purple-400/5" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500/8 rounded-full filter blur-3xl animate-blob animation-delay-4000 dark:bg-blue-400/5" />
      </div>
    </div>
  )
}
