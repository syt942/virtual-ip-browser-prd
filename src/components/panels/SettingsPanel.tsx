/**
 * Settings Panel
 * Application settings including animation controls
 */

import { useEffect, useMemo, useState } from 'react'
import { useAnimationStore } from '@stores/animationStore'
import { useSessionStore, type TabState } from '@stores/sessionStore'
import {
  Sparkles,
  Zap,
  Circle,
  List,
  Square,
  GitBranch,
  Type,
  RotateCcw,
  Save,
  FolderOpen,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

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

interface SessionSummary {
  id: string
  name: string
  tabCount: number
  updatedAt: Date
}

const DEFAULT_WINDOW_BOUNDS = { x: 100, y: 100, width: 1200, height: 800 }

function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  return formatter.format(-diffDays, 'day')
}

function normalizeSessionError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unable to complete the session action.'
}

function buildSessionSummary(session: { id: string; name: string; tabs: TabState[]; updatedAt: Date }): SessionSummary {
  return {
    id: session.id,
    name: session.name,
    tabCount: session.tabs.length,
    updatedAt: session.updatedAt,
  }
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

  const {
    sessions,
    currentSession,
    isLoading,
    error,
    saveSession,
    loadSession,
    deleteSession,
    fetchAllSessions,
    clearError,
  } = useSessionStore()

  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const reducedMotion = prefersReducedMotion()

  const sessionSummaries = useMemo(
    () => sessions.map((session) => buildSessionSummary(session)),
    [sessions]
  )

  useEffect(() => {
    fetchAllSessions()
  }, [fetchAllSessions])

  useEffect(() => {
    if (!sessionFeedback) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setSessionFeedback(null)
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [sessionFeedback])

  const handleSaveSession = async () => {
    if (!sessionName.trim()) {
      setSaveError('Session name is required')
      return
    }

    setSaveError(null)
    setSessionError(null)

    try {
      const tabResponse = await window.api.tab.list()
      const tabs =
        tabResponse && typeof tabResponse === 'object' && 'success' in tabResponse && tabResponse.success
          ? (tabResponse as { success: boolean; tabs?: TabState[] }).tabs ?? []
          : []

      await saveSession(sessionName.trim(), tabs, DEFAULT_WINDOW_BOUNDS)
      setSessionFeedback('Session saved')
      setShowSavePrompt(false)
      setSessionName('')
    } catch (error) {
      setSessionError(normalizeSessionError(error))
    }
  }

  const handleLoadSession = async (sessionId: string) => {
    setSessionError(null)

    try {
      await loadSession(sessionId)
      setSessionFeedback('Session loaded')
    } catch (error) {
      setSessionError(normalizeSessionError(error))
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    setSessionError(null)

    try {
      await deleteSession(sessionId)
      setSessionFeedback('Session deleted')
    } catch (error) {
      setSessionError(normalizeSessionError(error))
    }
  }

  const handleRetrySessions = () => {
    clearError()
    setSessionError(null)
    fetchAllSessions()
  }

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

        {/* Sessions */}
        <div className="p-4 border-b border-border/50" data-testid="settings-session-section">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Sessions
              </h3>
              <span
                className="px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground"
                data-testid="session-count-badge"
              >
                {sessionSummaries.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSavePrompt(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              data-testid="save-session-button"
              disabled={isLoading}
            >
              <Save size={14} />
              Save Current Session
            </button>
          </div>

          {sessionFeedback && (
            <div
              className="mb-3 text-xs text-green-600 dark:text-green-400"
              role="status"
              aria-live="polite"
            >
              {sessionFeedback}
            </div>
          )}

          {sessionError && (
            <div className="mb-3 text-xs text-destructive" role="alert">
              {sessionError}
            </div>
          )}

          {error && (
            <div className="mb-3 p-2 rounded-lg border border-destructive/20 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
              <AlertCircle size={14} />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={handleRetrySessions}
                className="p-1 rounded hover:bg-destructive/10"
                data-testid="retry-fetch-sessions"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-6" data-testid="sessions-loading-spinner" aria-busy="true">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && sessionSummaries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">
              No saved sessions. Save your current session to get started.
            </p>
          )}

          {!isLoading && sessionSummaries.length > 0 && (
            <div className="space-y-2" data-testid="session-list" role="list">
              {sessionSummaries.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    currentSession?.id === session.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                  data-testid={`session-item-${session.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.tabCount} tabs ·
                      <span className="ml-1" data-testid="session-updated-at">
                        {formatRelativeDate(session.updatedAt)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                      onClick={() => handleLoadSession(session.id)}
                      data-testid={`load-session-${session.id}`}
                      aria-label={`Load session ${session.name}`}
                    >
                      <FolderOpen size={14} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground"
                      onClick={() => handleDeleteSession(session.id)}
                      data-testid={`delete-session-${session.id}`}
                      aria-label={`Delete session ${session.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showSavePrompt && (
            <div className="mt-4 rounded-lg border border-border p-3 bg-secondary/20" data-testid="save-session-dialog">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="session-name">
                Session name
              </label>
              <input
                id="session-name"
                data-testid="session-name-input"
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                placeholder="Enter session name"
              />
              {saveError && <p className="text-xs text-destructive mt-1">{saveError}</p>}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground"
                  onClick={handleSaveSession}
                  data-testid="confirm-save-session"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded bg-secondary"
                  onClick={() => setShowSavePrompt(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
