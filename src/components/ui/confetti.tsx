/**
 * Confetti - Magic UI Component
 * Creates celebratory confetti animations for success events
 * 
 * @see https://magicui.design/docs/components/confetti
 */

import type { ReactNode } from "react"
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"

import { cn } from "@/utils/cn"

// Confetti configuration types
interface ConfettiOptions {
  particleCount?: number
  angle?: number
  spread?: number
  startVelocity?: number
  decay?: number
  gravity?: number
  drift?: number
  ticks?: number
  origin?: { x: number; y: number }
  colors?: string[]
  shapes?: ('square' | 'circle')[]
  scalar?: number
  zIndex?: number
  disableForReducedMotion?: boolean
}

interface ConfettiGlobalOptions {
  resize?: boolean
  useWorker?: boolean
}

type Api = {
  fire: (options?: ConfettiOptions) => void
}

type Props = React.ComponentPropsWithRef<"canvas"> & {
  options?: ConfettiOptions
  globalOptions?: ConfettiGlobalOptions
  manualstart?: boolean
  children?: ReactNode
  /** Whether confetti is enabled (respects user preferences) */
  enabled?: boolean
}

export type ConfettiRef = Api | null

const ConfettiContext = createContext<Api>({} as Api)

// Simple confetti implementation without external dependency
// This is a lightweight alternative for Electron compatibility
const createConfettiParticle = (
  ctx: CanvasRenderingContext2D,
  options: ConfettiOptions,
  canvasWidth: number,
  canvasHeight: number
) => {
  const colors = options.colors || ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
  const origin = options.origin || { x: 0.5, y: 0.5 }
  const particleCount = options.particleCount || 50
  const spread = options.spread || 360
  const startVelocity = options.startVelocity || 30
  const gravity = options.gravity || 1
  const ticks = options.ticks || 200
  const decay = options.decay || 0.94

  const particles: Array<{
    x: number
    y: number
    vx: number
    vy: number
    color: string
    size: number
    life: number
    shape: 'square' | 'circle'
  }> = []

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180) + (options.angle || 90) * (Math.PI / 180)
    const velocity = startVelocity * (0.5 + Math.random() * 0.5)
    
    particles.push({
      x: origin.x * canvasWidth,
      y: origin.y * canvasHeight,
      vx: Math.cos(angle) * velocity,
      vy: -Math.sin(angle) * velocity,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      life: ticks,
      shape: Math.random() > 0.5 ? 'square' : 'circle'
    })
  }

  let frame = 0
  const animate = () => {
    if (frame >= ticks) {return}

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    particles.forEach(particle => {
      if (particle.life <= 0) {return}

      particle.x += particle.vx
      particle.vy += gravity * 0.5
      particle.y += particle.vy
      particle.vx *= decay
      particle.vy *= decay
      particle.life--

      const alpha = particle.life / ticks

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color

      if (particle.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        )
      }

      ctx.restore()
    })

    frame++
    requestAnimationFrame(animate)
  }

  animate()
}

const ConfettiComponent = forwardRef<ConfettiRef, Props>((props, ref) => {
  const {
    options,
    globalOptions = { resize: true },
    manualstart = false,
    children,
    className,
    enabled = true,
    ...rest
  } = props

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Respect prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') {return false}
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const shouldAnimate = enabled && !prefersReducedMotion

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current?.parentElement) {
        const rect = canvasRef.current.parentElement.getBoundingClientRect()
        setDimensions({ width: rect.width || window.innerWidth, height: rect.height || window.innerHeight })
      } else {
        setDimensions({ width: window.innerWidth, height: window.innerHeight })
      }
    }

    updateDimensions()

    if (globalOptions.resize) {
      window.addEventListener('resize', updateDimensions)
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [globalOptions.resize])

  const fire = useCallback(
    (opts: ConfettiOptions = {}) => {
      if (!shouldAnimate || !canvasRef.current) {return}

      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) {return}

      createConfettiParticle(
        ctx,
        { ...options, ...opts },
        dimensions.width,
        dimensions.height
      )
    },
    [options, shouldAnimate, dimensions]
  )

  useImperativeHandle(ref, () => ({ fire }), [fire])

  useEffect(() => {
    if (!manualstart && shouldAnimate) {
      fire()
    }
  }, [manualstart, fire, shouldAnimate])

  const api = useMemo(() => ({ fire }), [fire])

  return (
    <ConfettiContext.Provider value={api}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className={cn("pointer-events-none absolute inset-0 z-50", className)}
        {...rest}
      />
      {children}
    </ConfettiContext.Provider>
  )
})

ConfettiComponent.displayName = "Confetti"

// Hook to use confetti from anywhere
export function useConfetti() {
  return useContext(ConfettiContext)
}

export { ConfettiComponent as Confetti }
