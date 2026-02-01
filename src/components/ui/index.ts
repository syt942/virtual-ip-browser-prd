/**
 * UI Components - Magic UI Integration
 * 
 * This module exports all Magic UI components used in the Virtual IP Browser.
 * Each component respects the user's animation preferences and system
 * prefers-reduced-motion settings.
 * 
 * @see https://magicui.design for component documentation
 */

// Core Magic UI Components
export { BorderBeam } from './border-beam'
export { Confetti, useConfetti, type ConfettiRef } from './confetti'
export { NeonGradientCard } from './neon-gradient-card'
export { Particles } from './particles'
export { AnimatedGradientText, type AnimatedGradientTextProps } from './animated-gradient-text'

// Interactive Components
export { ShimmerButton, type ShimmerButtonProps } from './shimmer-button'
export { PulsatingButton } from './pulsating-button'
export { NumberTicker } from './number-ticker'

// Utility Components
export { ErrorBoundary } from './ErrorBoundary'
