/**
 * Settings Panel Session Section Tests
 * EP-010: Session Management UI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { useSessionStore, type SavedSession } from '@/stores/sessionStore'

const mockSessionApi = {
  save: vi.fn(),
  load: vi.fn(),
  list: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
}

const mockTabApi = {
  list: vi.fn(),
}

vi.stubGlobal('window', {
  api: {
    session: mockSessionApi,
    tab: mockTabApi,
  },
})

const createSession = (overrides: Partial<SavedSession> = {}): SavedSession => ({
  id: 'session-1',
  name: 'Default Session',
  tabs: [{ url: 'https://example.com', title: 'Example' }],
  windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
})

describe('SettingsPanel sessions section', () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      currentSession: null,
      isLoading: false,
      error: null,
    })
    mockSessionApi.list.mockResolvedValue({ success: true, sessions: [] })
    mockTabApi.list.mockResolvedValue({ success: true, tabs: [] })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders sessions section header', async () => {
    render(<SettingsPanel />)

    expect(screen.getByText('Sessions')).toBeInTheDocument()
    expect(screen.getByTestId('settings-session-section')).toBeInTheDocument()
  })

  it('shows empty state when no sessions', async () => {
    render(<SettingsPanel />)

    await waitFor(() => {
      expect(screen.getByText(/No saved sessions/i)).toBeInTheDocument()
    })
  })

  it('renders session list items', async () => {
    const sessions = [
      createSession({ id: 'session-a', name: 'Work Session' }),
      createSession({ id: 'session-b', name: 'Personal Session' }),
    ]
    useSessionStore.setState({ sessions })

    render(<SettingsPanel />)

    expect(screen.getByText('Work Session')).toBeInTheDocument()
    expect(screen.getByText('Personal Session')).toBeInTheDocument()
  })

  it('calls saveSession when saving current session', async () => {
    const user = userEvent.setup()
    const savedSession = createSession({ name: 'Saved Session' })
    mockSessionApi.save.mockResolvedValue({ success: true, session: savedSession })

    render(<SettingsPanel />)

    await user.click(screen.getByTestId('save-session-button'))
    await user.type(screen.getByTestId('session-name-input'), 'Saved Session')
    await user.click(screen.getByTestId('confirm-save-session'))

    await waitFor(() => {
      expect(mockSessionApi.save).toHaveBeenCalledWith({
        name: 'Saved Session',
        tabs: [],
        windowBounds: { x: 100, y: 100, width: 1200, height: 800 },
      })
    })
  })

  it('surfaces errors from session actions', async () => {
    const user = userEvent.setup()
    mockSessionApi.save.mockRejectedValue(new Error('Unable to save session'))

    render(<SettingsPanel />)

    await user.click(screen.getByTestId('save-session-button'))
    await user.type(screen.getByTestId('session-name-input'), 'Saved Session')
    await user.click(screen.getByTestId('confirm-save-session'))

    await waitFor(() => {
      expect(screen.getByText('Unable to save session')).toBeInTheDocument()
    })
  })

  it('loads session when load button clicked', async () => {
    const user = userEvent.setup()
    const session = createSession({ id: 'session-load', name: 'Load Session' })
    useSessionStore.setState({ sessions: [session] })
    mockSessionApi.load.mockResolvedValue({ success: true, session })

    render(<SettingsPanel />)

    await user.click(screen.getByTestId('load-session-session-load'))

    await waitFor(() => {
      expect(mockSessionApi.load).toHaveBeenCalledWith('session-load')
    })
  })

  it('deletes session when delete button clicked', async () => {
    const user = userEvent.setup()
    const session = createSession({ id: 'session-delete', name: 'Delete Session' })
    useSessionStore.setState({ sessions: [session] })
    mockSessionApi.delete.mockResolvedValue({ success: true })

    render(<SettingsPanel />)

    await user.click(screen.getByTestId('delete-session-session-delete'))

    await waitFor(() => {
      expect(mockSessionApi.delete).toHaveBeenCalledWith('session-delete')
    })
  })
})
