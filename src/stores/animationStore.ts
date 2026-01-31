/**
 * Animation Settings Store
 * Manages user preferences for Magic UI animations
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AnimationSettings {
  /** Master switch for all animations */
  enabled: boolean
  /** Enable particle background effects */
  particlesEnabled: boolean
  /** Enable confetti celebrations */
  confettiEnabled: boolean
  /** Enable border beam animations */
  borderBeamEnabled: boolean
  /** Enable animated lists */
  animatedListEnabled: boolean
  /** Enable neon gradient effects */
  neonGradientEnabled: boolean
  /** Enable animated beams */
  animatedBeamEnabled: boolean
  /** Enable gradient text animations */
  gradientTextEnabled: boolean
  /** Particle quantity (affects performance) */
  particleQuantity: number
  /** Animation speed multiplier (0.5 = slower, 2 = faster) */
  speedMultiplier: number
}

interface AnimationStore extends AnimationSettings {
  /** Update a single animation setting */
  setSetting: <K extends keyof AnimationSettings>(key: K, value: AnimationSettings[K]) => void
  /** Toggle the master animation switch */
  toggleAnimations: () => void
  /** Reset all settings to defaults */
  resetToDefaults: () => void
  /** Check if system prefers reduced motion */
  prefersReducedMotion: () => boolean
  /** Get effective enabled state (considers system preferences) */
  isEffectivelyEnabled: () => boolean
}

const defaultSettings: AnimationSettings = {
  enabled: true,
  particlesEnabled: true,
  confettiEnabled: true,
  borderBeamEnabled: true,
  animatedListEnabled: true,
  neonGradientEnabled: true,
  animatedBeamEnabled: true,
  gradientTextEnabled: true,
  particleQuantity: 50, // Lower default for better performance
  speedMultiplier: 1,
}

export const useAnimationStore = create<AnimationStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setSetting: (key, value) => set({ [key]: value }),

      toggleAnimations: () => set((state) => ({ enabled: !state.enabled })),

      resetToDefaults: () => set(defaultSettings),

      prefersReducedMotion: () => {
        if (typeof window === 'undefined') {return false}
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      },

      isEffectivelyEnabled: () => {
        const state = get()
        return state.enabled && !state.prefersReducedMotion()
      },
    }),
    {
      name: 'animation-settings',
      version: 1,
    }
  )
)

// Selector hooks for individual animation types
export const useParticlesEnabled = () => {
  const { enabled, particlesEnabled, prefersReducedMotion } = useAnimationStore()
  return enabled && particlesEnabled && !prefersReducedMotion()
}

export const useConfettiEnabled = () => {
  const { enabled, confettiEnabled, prefersReducedMotion } = useAnimationStore()
  return enabled && confettiEnabled && !prefersReducedMotion()
}

export const useBorderBeamEnabled = () => {
  const { enabled, borderBeamEnabled, prefersReducedMotion } = useAnimationStore()
  return enabled && borderBeamEnabled && !prefersReducedMotion()
}

export const useAnimatedListEnabled = () => {
  const { enabled, animatedListEnabled, prefersReducedMotion } = useAnimationStore()
  return enabled && animatedListEnabled && !prefersReducedMotion()
}

export const useNeonGradientEnabled = () => {
  const { enabled, neonGradientEnabled, prefersReducedMotion } = useAnimationStore()
  return enabled && neonGradientEnabled && !prefersReducedMotion()
}

export const useAnimatedBeamEnabled = () => {
  const { enabled, animatedBeamEnabled, prefersReducedMotion } = useAnimationStore()
  return enabled && animatedBeamEnabled && !prefersReducedMotion()
}

export const useGradientTextEnabled = () => {
  const { enabled, gradientTextEnabled, prefersReducedMotion } = useAnimationStore()
  return enabled && gradientTextEnabled && !prefersReducedMotion()
}
