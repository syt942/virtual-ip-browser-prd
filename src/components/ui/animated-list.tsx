/**
 * AnimatedList - Magic UI Component
 * Animates list items sequentially with spring animations
 * 
 * @see https://magicui.design/docs/components/animated-list
 */

import React, {
  ComponentPropsWithoutRef,
  useEffect,
  useMemo,
  useState,
} from "react"
import { AnimatePresence, motion, MotionProps } from "framer-motion"

import { cn } from "@/utils/cn"

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  }

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  /** Delay between each item animation in milliseconds */
  delay?: number
  /** Whether to animate items (respects prefers-reduced-motion) */
  animated?: boolean
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 1000, animated = true, ...props }: AnimatedListProps) => {
    const [index, setIndex] = useState(0)
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    )

    // Respect prefers-reduced-motion
    const prefersReducedMotion = useMemo(() => {
      if (typeof window === 'undefined') return false
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }, [])

    const shouldAnimate = animated && !prefersReducedMotion

    useEffect(() => {
      if (!shouldAnimate) {
        // Show all items immediately if animations are disabled
        setIndex(childrenArray.length - 1)
        return
      }

      if (index < childrenArray.length - 1) {
        const timeout = setTimeout(() => {
          setIndex((prevIndex) => prevIndex + 1)
        }, delay)

        return () => clearTimeout(timeout)
      }
    }, [index, delay, childrenArray.length, shouldAnimate])

    const itemsToShow = useMemo(() => {
      const result = childrenArray.slice(0, index + 1).reverse()
      return result
    }, [index, childrenArray])

    if (!shouldAnimate) {
      // Render without animations
      return (
        <div
          className={cn("flex flex-col items-center gap-4", className)}
          {...props}
        >
          {childrenArray.map((item, i) => (
            <div key={i} className="mx-auto w-full">
              {item}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div
        className={cn("flex flex-col items-center gap-4", className)}
        {...props}
      >
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

AnimatedList.displayName = "AnimatedList"
