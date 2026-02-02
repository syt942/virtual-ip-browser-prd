/**
 * Session Store Unit Tests
 * EP-010: Session Management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSessionStore, type SavedSession, type WindowBounds } from '../../../src/stores/sessionStore';

const mockSessionApi = {
  save: vi.fn(),
  load: vi.fn(),
  list: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
};

vi.stubGlobal('window', {
  api: {
    session: mockSessionApi,
  },
});

const baseWindowBounds: WindowBounds = {
  x: 0,
  y: 0,
  width: 1200,
  height: 800,
};

const createMockSession = (overrides: Partial<SavedSession> = {}): SavedSession => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Session',
  tabs: [],
  windowBounds: baseWindowBounds,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      currentSession: null,
      isLoading: false,
      error: null,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty sessions', () => {
      const state = useSessionStore.getState();
      expect(state.sessions).toEqual([]);
      expect(state.currentSession).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('saveSession', () => {
    it('should call window.api.session.save with correct payload', async () => {
      const sessionResponse = createMockSession();
      mockSessionApi.save.mockResolvedValue({ success: true, session: sessionResponse });

      await act(async () => {
        await useSessionStore.getState().saveSession('My Session', [], baseWindowBounds);
      });

      expect(mockSessionApi.save).toHaveBeenCalledWith({
        name: 'My Session',
        tabs: [],
        windowBounds: baseWindowBounds,
      });
    });

    it('should add saved session and set currentSession', async () => {
      const sessionResponse = {
        ...createMockSession(),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      mockSessionApi.save.mockResolvedValue({ success: true, session: sessionResponse });

      await act(async () => {
        await useSessionStore.getState().saveSession('My Session', [], baseWindowBounds);
      });

      const state = useSessionStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.currentSession?.id).toBe(sessionResponse.id);
      expect(state.sessions[0].createdAt).toBeInstanceOf(Date);
    });

    it('should set error when API fails', async () => {
      mockSessionApi.save.mockResolvedValue({ success: false, error: 'Save failed' });

      await act(async () => {
        await useSessionStore.getState().saveSession('My Session', [], baseWindowBounds);
      });

      expect(useSessionStore.getState().error).toContain('Save failed');
    });
  });

  describe('loadSession', () => {
    it('should call window.api.session.load with session ID', async () => {
      const sessionResponse = createMockSession();
      mockSessionApi.load.mockResolvedValue({ success: true, session: sessionResponse });

      await act(async () => {
        await useSessionStore.getState().loadSession(sessionResponse.id);
      });

      expect(mockSessionApi.load).toHaveBeenCalledWith(sessionResponse.id);
    });

    it('should set currentSession to loaded session', async () => {
      const sessionResponse = {
        ...createMockSession(),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      mockSessionApi.load.mockResolvedValue({ success: true, session: sessionResponse });

      await act(async () => {
        await useSessionStore.getState().loadSession(sessionResponse.id);
      });

      const state = useSessionStore.getState();
      expect(state.currentSession?.id).toBe(sessionResponse.id);
      expect(state.currentSession?.createdAt).toBeInstanceOf(Date);
    });

    it('should surface error when session not found', async () => {
      mockSessionApi.load.mockResolvedValue({ success: false, error: 'Session not found' });

      await act(async () => {
        await useSessionStore.getState().loadSession('missing-id');
      });

      expect(useSessionStore.getState().error).toContain('Session not found');
    });
  });

  describe('fetchAllSessions', () => {
    it('should populate sessions list from API', async () => {
      const sessions = [createMockSession(), createMockSession({ id: 'other-id' })];
      mockSessionApi.list.mockResolvedValue({ success: true, sessions });

      await act(async () => {
        await useSessionStore.getState().fetchAllSessions();
      });

      const state = useSessionStore.getState();
      expect(state.sessions).toHaveLength(2);
      expect(state.sessions[0].id).toBe(sessions[0].id);
    });

    it('should set error when fetch fails', async () => {
      mockSessionApi.list.mockResolvedValue({ success: false, error: 'Fetch failed' });

      await act(async () => {
        await useSessionStore.getState().fetchAllSessions();
      });

      expect(useSessionStore.getState().error).toContain('Fetch failed');
    });
  });

  describe('deleteSession', () => {
    it('should remove session and clear currentSession when deleted', async () => {
      const session = createMockSession();
      useSessionStore.setState({ sessions: [session], currentSession: session });
      mockSessionApi.delete.mockResolvedValue({ success: true });

      await act(async () => {
        await useSessionStore.getState().deleteSession(session.id);
      });

      const state = useSessionStore.getState();
      expect(state.sessions).toHaveLength(0);
      expect(state.currentSession).toBeNull();
    });

    it('should keep currentSession if a different session is deleted', async () => {
      const session = createMockSession();
      const otherSession = createMockSession({ id: 'other-id' });
      useSessionStore.setState({ sessions: [session, otherSession], currentSession: session });
      mockSessionApi.delete.mockResolvedValue({ success: true });

      await act(async () => {
        await useSessionStore.getState().deleteSession(otherSession.id);
      });

      expect(useSessionStore.getState().currentSession?.id).toBe(session.id);
    });
  });

  describe('updateSession', () => {
    it('should update session in list and currentSession', async () => {
      const session = createMockSession();
      const updatedSession = createMockSession({ name: 'Updated Session' });
      useSessionStore.setState({ sessions: [session], currentSession: session });
      mockSessionApi.update.mockResolvedValue({ success: true, session: updatedSession });

      await act(async () => {
        await useSessionStore.getState().updateSession(session.id, { name: 'Updated Session' });
      });

      const state = useSessionStore.getState();
      expect(state.sessions[0].name).toBe('Updated Session');
      expect(state.currentSession?.name).toBe('Updated Session');
    });
  });

  describe('selectors', () => {
    it('should return session by ID', () => {
      const session = createMockSession();
      useSessionStore.setState({ sessions: [session] });

      const found = useSessionStore.getState().selectSessionById(session.id);
      expect(found?.id).toBe(session.id);
    });

    it('should return recent sessions sorted by updatedAt desc', () => {
      const older = createMockSession({
        id: 'older',
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      });
      const newer = createMockSession({
        id: 'newer',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      useSessionStore.setState({ sessions: [older, newer] });

      const recent = useSessionStore.getState().selectRecentSessions(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].id).toBe('newer');
    });
  });

  describe('setCurrentSession', () => {
    it('should set the currentSession field', () => {
      const session = createMockSession();
      useSessionStore.getState().setCurrentSession(session);

      expect(useSessionStore.getState().currentSession?.id).toBe(session.id);
    });
  });
});
