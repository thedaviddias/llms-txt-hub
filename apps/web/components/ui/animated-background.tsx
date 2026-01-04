'use client'

import { useEffect, useRef } from 'react'

/**
 * Animated background component with geometric grid pattern and floating particles
 * Features: CSS grid overlay, subtle particle animation, gradient orbs
 */
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /** Set canvas dimensions to match window size */
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)

    /** Particle class for subtle floating dots animation */
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
        this.size = Math.random() * 1.5 + 0.5
        this.speedX = (Math.random() - 0.5) * 0.2
        this.speedY = (Math.random() - 0.5) * 0.2
        this.opacity = Math.random() * 0.2 + 0.05
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
        const isDark = document.documentElement.classList.contains('dark')
        const rgb = isDark ? '255, 255, 255' : '0, 0, 0'
        ctx.fillStyle = `rgba(${rgb}, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Create particles - fewer for cleaner look
    const particles: Particle[] = []
    const particleCount = 30
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    let animationId: number
    /**
     * Animation loop for particle system
     * @returns void - Updates particles and schedules next frame
     */
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
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Geometric grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Floating particles canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Gradient orbs - more subtle and refined */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] bg-foreground/[0.03] rounded-full filter blur-[100px] animate-blob" />
        <div className="absolute -top-24 right-1/4 w-[400px] h-[400px] bg-foreground/[0.02] rounded-full filter blur-[80px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-24 left-1/3 w-[450px] h-[450px] bg-foreground/[0.025] rounded-full filter blur-[90px] animate-blob animation-delay-4000" />
      </div>

      {/* Gradient fade to background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background pointer-events-none" />
    </div>
  )
}
