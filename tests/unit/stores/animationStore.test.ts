/**
 * Animation Store Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAnimationStore } from '@stores/animationStore'

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('animationStore', () => {
  beforeEach(() => {
    // Reset store to default state
    useAnimationStore.setState({
      enabled: true,
      particlesEnabled: true,
      confettiEnabled: true,
      borderBeamEnabled: true,
      animatedListEnabled: true,
      neonGradientEnabled: true,
      animatedBeamEnabled: true,
      gradientTextEnabled: true,
      particleQuantity: 50,
      speedMultiplier: 1,
    })
    mockMatchMedia(false)
  })

  describe('default state', () => {
    it('should have animations enabled by default', () => {
      const state = useAnimationStore.getState()
      expect(state.enabled).toBe(true)
    })

    it('should have all individual animations enabled by default', () => {
      const state = useAnimationStore.getState()
      expect(state.particlesEnabled).toBe(true)
      expect(state.confettiEnabled).toBe(true)
      expect(state.borderBeamEnabled).toBe(true)
      expect(state.animatedListEnabled).toBe(true)
      expect(state.neonGradientEnabled).toBe(true)
      expect(state.animatedBeamEnabled).toBe(true)
      expect(state.gradientTextEnabled).toBe(true)
    })

    it('should have default particle quantity of 50', () => {
      const state = useAnimationStore.getState()
      expect(state.particleQuantity).toBe(50)
    })

    it('should have default speed multiplier of 1', () => {
      const state = useAnimationStore.getState()
      expect(state.speedMultiplier).toBe(1)
    })
  })

  describe('setSetting', () => {
    it('should update a single setting', () => {
      const { setSetting } = useAnimationStore.getState()
      setSetting('particlesEnabled', false)
      expect(useAnimationStore.getState().particlesEnabled).toBe(false)
    })

    it('should update particle quantity', () => {
      const { setSetting } = useAnimationStore.getState()
      setSetting('particleQuantity', 100)
      expect(useAnimationStore.getState().particleQuantity).toBe(100)
    })

    it('should update speed multiplier', () => {
      const { setSetting } = useAnimationStore.getState()
      setSetting('speedMultiplier', 1.5)
      expect(useAnimationStore.getState().speedMultiplier).toBe(1.5)
    })
  })

  describe('toggleAnimations', () => {
    it('should toggle animations off', () => {
      const { toggleAnimations } = useAnimationStore.getState()
      toggleAnimations()
      expect(useAnimationStore.getState().enabled).toBe(false)
    })

    it('should toggle animations back on', () => {
      const { toggleAnimations } = useAnimationStore.getState()
      toggleAnimations() // off
      toggleAnimations() // on
      expect(useAnimationStore.getState().enabled).toBe(true)
    })
  })

  describe('resetToDefaults', () => {
    it('should reset all settings to defaults', () => {
      const { setSetting, resetToDefaults } = useAnimationStore.getState()
      
      // Change some settings
      setSetting('enabled', false)
      setSetting('particleQuantity', 150)
      setSetting('speedMultiplier', 2)
      
      // Reset
      resetToDefaults()
      
      const state = useAnimationStore.getState()
      expect(state.enabled).toBe(true)
      expect(state.particleQuantity).toBe(50)
      expect(state.speedMultiplier).toBe(1)
    })
  })

  describe('prefersReducedMotion', () => {
    it('should return false when system does not prefer reduced motion', () => {
      mockMatchMedia(false)
      const { prefersReducedMotion } = useAnimationStore.getState()
      expect(prefersReducedMotion()).toBe(false)
    })

    it('should return true when system prefers reduced motion', () => {
      mockMatchMedia(true)
      const { prefersReducedMotion } = useAnimationStore.getState()
      expect(prefersReducedMotion()).toBe(true)
    })
  })

  describe('isEffectivelyEnabled', () => {
    it('should return true when enabled and no reduced motion preference', () => {
      mockMatchMedia(false)
      const { isEffectivelyEnabled } = useAnimationStore.getState()
      expect(isEffectivelyEnabled()).toBe(true)
    })

    it('should return false when disabled', () => {
      mockMatchMedia(false)
      const { setSetting, isEffectivelyEnabled } = useAnimationStore.getState()
      setSetting('enabled', false)
      expect(isEffectivelyEnabled()).toBe(false)
    })

    it('should return false when reduced motion is preferred', () => {
      mockMatchMedia(true)
      const { isEffectivelyEnabled } = useAnimationStore.getState()
      expect(isEffectivelyEnabled()).toBe(false)
    })
  })
})
