/**
 * Settings Panel
 * Application settings including animation controls
 */

import { useAnimationStore } from '@stores/animationStore'
import { Sparkles, Zap, Circle, List, Square, GitBranch, Type, RotateCcw } from 'lucide-react'

interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}

function ToggleSwitch({ enabled, onChange, label, description, icon, disabled }: ToggleSwitchProps) {
  return (
    <div className={`flex items-center justify-between py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-secondary'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label: string
  description?: string
  disabled?: boolean
}

function Slider({ value, onChange, min, max, step = 1, label, description, disabled }: SliderProps) {
  return (
    <div className={`py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:cursor-not-allowed"
        data-testid={`slider-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  )
}

export function SettingsPanel() {
  const {
    enabled,
    particlesEnabled,
    confettiEnabled,
    borderBeamEnabled,
    animatedListEnabled,
    neonGradientEnabled,
    animatedBeamEnabled,
    gradientTextEnabled,
    particleQuantity,
    speedMultiplier,
    setSetting,
    toggleAnimations,
    resetToDefaults,
    prefersReducedMotion,
  } = useAnimationStore()

  const reducedMotion = prefersReducedMotion()

  return (
    <div className="h-full flex flex-col" data-testid="settings-panel">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="text-lg font-semibold" data-testid="settings-panel-title">Settings</h2>
        <p className="text-sm text-muted-foreground">Customize your experience</p>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Animation Settings Section */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Animations
            </h3>
            <button
              onClick={resetToDefaults}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              title="Reset to defaults"
              data-testid="reset-animations"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {reducedMotion && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Your system has "Reduce Motion" enabled. Animations will be minimized regardless of these settings.
              </p>
            </div>
          )}

          {/* Master Toggle */}
          <div className="pb-3 mb-3 border-b border-border/30">
            <ToggleSwitch
              enabled={enabled}
              onChange={toggleAnimations}
              label="Enable Animations"
              description="Master switch for all visual effects"
              icon={<Sparkles size={16} />}
              disabled={reducedMotion}
            />
          </div>

          {/* Individual Animation Toggles */}
          <div className="space-y-1">
            <ToggleSwitch
              enabled={particlesEnabled}
              onChange={(v) => setSetting('particlesEnabled', v)}
              label="Particle Effects"
              description="Background particle animations"
              icon={<Circle size={16} />}
              disabled={!enabled || reducedMotion}
            />

            <ToggleSwitch
              enabled={confettiEnabled}
              onChange={(v) => setSetting('confettiEnabled', v)}
              label="Confetti"
              description="Celebration effects on success"
              icon={<Zap size={16} />}
              disabled={!enabled || reducedMotion}
            />

            <ToggleSwitch
              enabled={borderBeamEnabled}
              onChange={(v) => setSetting('borderBeamEnabled', v)}
              label="Border Beam"
              description="Animated borders on active items"
              icon={<Square size={16} />}
              disabled={!enabled || reducedMotion}
            />

            <ToggleSwitch
              enabled={animatedListEnabled}
              onChange={(v) => setSetting('animatedListEnabled', v)}
              label="Animated Lists"
              description="Smooth list item animations"
              icon={<List size={16} />}
              disabled={!enabled || reducedMotion}
            />

            <ToggleSwitch
              enabled={neonGradientEnabled}
              onChange={(v) => setSetting('neonGradientEnabled', v)}
              label="Neon Gradients"
              description="Glowing card effects"
              icon={<Square size={16} />}
              disabled={!enabled || reducedMotion}
            />

            <ToggleSwitch
              enabled={animatedBeamEnabled}
              onChange={(v) => setSetting('animatedBeamEnabled', v)}
              label="Connection Beams"
              description="Animated connection lines"
              icon={<GitBranch size={16} />}
              disabled={!enabled || reducedMotion}
            />

            <ToggleSwitch
              enabled={gradientTextEnabled}
              onChange={(v) => setSetting('gradientTextEnabled', v)}
              label="Gradient Text"
              description="Animated text gradients"
              icon={<Type size={16} />}
              disabled={!enabled || reducedMotion}
            />
          </div>
        </div>

        {/* Performance Settings */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Performance
          </h3>

          <Slider
            value={particleQuantity}
            onChange={(v) => setSetting('particleQuantity', v)}
            min={10}
            max={150}
            step={10}
            label="Particle Quantity"
            description="Higher values may impact performance"
            disabled={!enabled || !particlesEnabled || reducedMotion}
          />

          <Slider
            value={speedMultiplier}
            onChange={(v) => setSetting('speedMultiplier', v)}
            min={0.5}
            max={2}
            step={0.1}
            label="Animation Speed"
            description="Adjust overall animation speed"
            disabled={!enabled || reducedMotion}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-secondary/30">
        <p className="text-xs text-center text-muted-foreground">
          Animation settings are saved automatically
        </p>
      </div>
    </div>
  )
}
