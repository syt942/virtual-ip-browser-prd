/**
 * NeonGradientCard - Magic UI Component
 * A card with dynamic neon gradient border and glow effect
 * 
 * @see https://magicui.design/docs/components/neon-gradient-card
 */

import {
  ComponentPropsWithoutRef,
  ReactNode,
  CSSProperties,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react"

import { cn } from "@/utils/cn"

interface NeonColorsProps {
  firstColor?: string
  secondColor?: string
}

interface NeonGradientCardProps extends ComponentPropsWithoutRef<"div"> {
  /** The className of the card */
  className?: string
  /** The children of the card */
  children?: ReactNode
  /** The size of the border in pixels */
  borderSize?: number
  /** The size of the radius in pixels */
  borderRadius?: number
  /** The colors of the neon gradient */
  neonColors?: NeonColorsProps
  /** Whether to animate the gradient (respects prefers-reduced-motion) */
  animated?: boolean
}

export const NeonGradientCard: React.FC<NeonGradientCardProps> = ({
  className,
  children,
  borderSize = 2,
  borderRadius = 20,
  neonColors = {
    firstColor: "#ff00aa",
    secondColor: "#00FFF1",
  },
  animated = true,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Respect prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') {return false}
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const shouldAnimate = animated && !prefersReducedMotion

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current
        setDimensions({ width: offsetWidth, height: offsetHeight })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      const { offsetWidth, offsetHeight } = containerRef.current
      setDimensions({ width: offsetWidth, height: offsetHeight })
    }
  }, [children])

  return (
    <div
      ref={containerRef}
      style={
        {
          "--border-size": `${borderSize}px`,
          "--border-radius": `${borderRadius}px`,
          "--neon-first-color": neonColors.firstColor,
          "--neon-second-color": neonColors.secondColor,
          "--card-width": `${dimensions.width}px`,
          "--card-height": `${dimensions.height}px`,
          "--card-content-radius": `${borderRadius - borderSize}px`,
          "--pseudo-element-background-image": `linear-gradient(0deg, ${neonColors.firstColor}, ${neonColors.secondColor})`,
          "--pseudo-element-width": `${dimensions.width + borderSize * 2}px`,
          "--pseudo-element-height": `${dimensions.height + borderSize * 2}px`,
          "--after-blur": `${Math.min(dimensions.width / 3, 50)}px`,
        } as CSSProperties
      }
      className={cn(
        "relative z-10 size-full rounded-[var(--border-radius)]",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "relative size-full min-h-[inherit] rounded-[var(--card-content-radius)] bg-card p-4",
          "before:absolute before:-top-[var(--border-size)] before:-left-[var(--border-size)] before:-z-10 before:block",
          "before:h-[var(--pseudo-element-height)] before:w-[var(--pseudo-element-width)] before:rounded-[var(--border-radius)] before:content-['']",
          "before:bg-[linear-gradient(0deg,var(--neon-first-color),var(--neon-second-color))] before:bg-[length:100%_200%]",
          shouldAnimate && "before:animate-background-position-spin",
          "after:absolute after:-top-[var(--border-size)] after:-left-[var(--border-size)] after:-z-10 after:block",
          "after:h-[var(--pseudo-element-height)] after:w-[var(--pseudo-element-width)] after:rounded-[var(--border-radius)] after:blur-[var(--after-blur)] after:content-['']",
          "after:bg-[linear-gradient(0deg,var(--neon-first-color),var(--neon-second-color))] after:bg-[length:100%_200%] after:opacity-60",
          shouldAnimate && "after:animate-background-position-spin",
          "break-words"
        )}
      >
        {children}
      </div>
    </div>
  )
}
