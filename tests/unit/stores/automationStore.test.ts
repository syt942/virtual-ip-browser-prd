/**
 * AutomationStore Unit Tests
 * Tests for automation session and task management
 * 
 * Coverage targets:
 * - Session management (start, stop, pause, resume)
 * - Keyword management
 * - Domain management
 * - Engine selection
 * - IPC integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useAutomationStore } from '../../../src/stores/automationStore';
import { 
  createMockWindowApi, 
  setupWindowApiMock, 
  resetWindowApiMock,
  mockApiSuccess,
  type MockWindowApi 
} from '../../mocks/window-api.mock';

describe('useAutomationStore', () => {
  let mockApi: MockWindowApi;

  beforeEach(() => {
    mockApi = createMockWindowApi();
    setupWindowApiMock(mockApi);
    
    // Reset store state
    useAutomationStore.setState({
      sessions: [],
      activeSessionId: null,
      keywords: [],
      targetDomains: [],
      selectedEngine: 'google',
    });
  });

  afterEach(() => {
    resetWindowApiMock();
    vi.clearAllMocks();
  });

  // ============================================================
  // STATE INITIALIZATION TESTS
  // ============================================================
  describe('state initialization', () => {
    it('initializes with empty sessions array', () => {
      const state = useAutomationStore.getState();
      expect(state.sessions).toEqual([]);
    });

    it('initializes with null activeSessionId', () => {
      const state = useAutomationStore.getState();
      expect(state.activeSessionId).toBeNull();
    });

    it('initializes with empty keywords array', () => {
      const state = useAutomationStore.getState();
      expect(state.keywords).toEqual([]);
    });

    it('initializes with google as default engine', () => {
      const state = useAutomationStore.getState();
      expect(state.selectedEngine).toBe('google');
    });
  });

  // ============================================================
  // SESSION MANAGEMENT TESTS
  // ============================================================
  describe('startSession', () => {
    it('calls API and adds session to state', async () => {
      // Arrange
      const mockSession = {
        id: '00000000-0000-4000-a000-000000000001',
        name: 'Test Session',
        status: 'active' as const,
        engine: 'google' as const,
        keywords: ['test'],
        targetDomains: ['example.com'],
        tasks: [],
        statistics: {
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          avgDuration: 0,
          successRate: 0,
        },
      };
      
      mockApi.automation.startSearch.mockResolvedValueOnce({
        success: true,
        session: mockSession,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().startSession({
          engine: 'google',
          keywords: ['test'],
          targetDomains: ['example.com'],
        });
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0].id).toBe(mockSession.id);
      expect(state.activeSessionId).toBe(mockSession.id);
    });

    it('calls window.api.automation.startSearch with config', async () => {
      // Arrange
      const config = {
        engine: 'bing' as const,
        keywords: ['keyword1', 'keyword2'],
        targetDomains: ['domain.com'],
      };

      // Act
      await act(async () => {
        await useAutomationStore.getState().startSession(config);
      });

      // Assert
      expect(mockApi.automation.startSearch).toHaveBeenCalledWith(config);
    });

    it('handles API failure gracefully', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.automation.startSearch.mockRejectedValueOnce(new Error('API Error'));

      // Act
      await act(async () => {
        await useAutomationStore.getState().startSession({
          engine: 'google',
          keywords: ['test'],
          targetDomains: [],
        });
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.sessions).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('stopSession', () => {
    it('updates session status to stopped', async () => {
      // Arrange
      const sessionId = '00000000-0000-4000-a000-000000000001';
      useAutomationStore.setState({
        sessions: [{
          id: sessionId,
          name: 'Test',
          status: 'active',
          engine: 'google',
          keywords: [],
          targetDomains: [],
          tasks: [],
          statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
        }],
        activeSessionId: sessionId,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().stopSession(sessionId);
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.sessions[0].status).toBe('stopped');
      expect(state.activeSessionId).toBeNull();
    });

    it('calls window.api.automation.stopSearch', async () => {
      // Arrange
      const sessionId = 'session-123';
      useAutomationStore.setState({
        sessions: [{
          id: sessionId,
          name: 'Test',
          status: 'active',
          engine: 'google',
          keywords: [],
          targetDomains: [],
          tasks: [],
          statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
        }],
        activeSessionId: sessionId,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().stopSession(sessionId);
      });

      // Assert
      expect(mockApi.automation.stopSearch).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('pauseSession', () => {
    it('updates session status to paused', async () => {
      // Arrange
      const sessionId = 'session-123';
      useAutomationStore.setState({
        sessions: [{
          id: sessionId,
          name: 'Test',
          status: 'active',
          engine: 'google',
          keywords: [],
          targetDomains: [],
          tasks: [],
          statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
        }],
        activeSessionId: sessionId,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().pauseSession(sessionId);
      });

      // Assert
      expect(useAutomationStore.getState().sessions[0].status).toBe('paused');
    });
  });

  describe('resumeSession', () => {
    it('updates session status to active', async () => {
      // Arrange
      const sessionId = 'session-123';
      useAutomationStore.setState({
        sessions: [{
          id: sessionId,
          name: 'Test',
          status: 'paused',
          engine: 'google',
          keywords: [],
          targetDomains: [],
          tasks: [],
          statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
        }],
        activeSessionId: sessionId,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().resumeSession(sessionId);
      });

      // Assert
      expect(useAutomationStore.getState().sessions[0].status).toBe('active');
    });
  });

  // ============================================================
  // KEYWORD MANAGEMENT TESTS
  // ============================================================
  describe('addKeyword', () => {
    it('adds trimmed keyword to list', () => {
      // Act
      act(() => {
        useAutomationStore.getState().addKeyword('  test keyword  ');
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.keywords).toContain('test keyword');
    });

    it('prevents duplicate keywords', () => {
      // Act
      act(() => {
        useAutomationStore.getState().addKeyword('keyword');
        useAutomationStore.getState().addKeyword('keyword');
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.keywords).toHaveLength(1);
    });

    it('ignores empty keywords', () => {
      // Act
      act(() => {
        useAutomationStore.getState().addKeyword('');
        useAutomationStore.getState().addKeyword('   ');
      });

      // Assert
      expect(useAutomationStore.getState().keywords).toHaveLength(0);
    });

    it('adds multiple unique keywords', () => {
      // Act
      act(() => {
        useAutomationStore.getState().addKeyword('keyword1');
        useAutomationStore.getState().addKeyword('keyword2');
        useAutomationStore.getState().addKeyword('keyword3');
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.keywords).toHaveLength(3);
      expect(state.keywords).toEqual(['keyword1', 'keyword2', 'keyword3']);
    });
  });

  describe('removeKeyword', () => {
    it('removes keyword from list', () => {
      // Arrange
      useAutomationStore.setState({ keywords: ['keyword1', 'keyword2', 'keyword3'] });

      // Act
      act(() => {
        useAutomationStore.getState().removeKeyword('keyword2');
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.keywords).toEqual(['keyword1', 'keyword3']);
    });

    it('does nothing for non-existent keyword', () => {
      // Arrange
      useAutomationStore.setState({ keywords: ['keyword1'] });

      // Act
      act(() => {
        useAutomationStore.getState().removeKeyword('nonexistent');
      });

      // Assert
      expect(useAutomationStore.getState().keywords).toEqual(['keyword1']);
    });
  });

  describe('clearKeywords', () => {
    it('removes all keywords', () => {
      // Arrange
      useAutomationStore.setState({ keywords: ['k1', 'k2', 'k3'] });

      // Act
      act(() => {
        useAutomationStore.getState().clearKeywords();
      });

      // Assert
      expect(useAutomationStore.getState().keywords).toEqual([]);
    });
  });

  // ============================================================
  // DOMAIN MANAGEMENT TESTS
  // ============================================================
  describe('addTargetDomain', () => {
    it('calls API and adds domain', async () => {
      // Act
      await act(async () => {
        await useAutomationStore.getState().addTargetDomain('example.com');
      });

      // Assert
      expect(mockApi.automation.addDomain).toHaveBeenCalledWith('example.com');
      expect(useAutomationStore.getState().targetDomains).toContain('example.com');
    });

    it('prevents duplicate domains', async () => {
      // Act
      await act(async () => {
        await useAutomationStore.getState().addTargetDomain('example.com');
        await useAutomationStore.getState().addTargetDomain('example.com');
      });

      // Assert
      expect(useAutomationStore.getState().targetDomains).toHaveLength(1);
    });

    it('ignores empty domains', async () => {
      // Act
      await act(async () => {
        await useAutomationStore.getState().addTargetDomain('');
        await useAutomationStore.getState().addTargetDomain('   ');
      });

      // Assert
      expect(useAutomationStore.getState().targetDomains).toHaveLength(0);
      expect(mockApi.automation.addDomain).not.toHaveBeenCalled();
    });

    it('trims domain before adding', async () => {
      // Act
      await act(async () => {
        await useAutomationStore.getState().addTargetDomain('  example.com  ');
      });

      // Assert
      expect(useAutomationStore.getState().targetDomains).toContain('example.com');
    });
  });

  describe('removeTargetDomain', () => {
    it('removes domain from list', () => {
      // Arrange
      useAutomationStore.setState({ targetDomains: ['a.com', 'b.com', 'c.com'] });

      // Act
      act(() => {
        useAutomationStore.getState().removeTargetDomain('b.com');
      });

      // Assert
      expect(useAutomationStore.getState().targetDomains).toEqual(['a.com', 'c.com']);
    });
  });

  describe('clearTargetDomains', () => {
    it('removes all domains', () => {
      // Arrange
      useAutomationStore.setState({ targetDomains: ['a.com', 'b.com'] });

      // Act
      act(() => {
        useAutomationStore.getState().clearTargetDomains();
      });

      // Assert
      expect(useAutomationStore.getState().targetDomains).toEqual([]);
    });
  });

  // ============================================================
  // ENGINE SELECTION TESTS
  // ============================================================
  describe('setEngine', () => {
    it('updates selectedEngine', () => {
      // Act
      act(() => {
        useAutomationStore.getState().setEngine('bing');
      });

      // Assert
      expect(useAutomationStore.getState().selectedEngine).toBe('bing');
    });

    it('accepts all valid engine types', () => {
      const engines = ['google', 'bing', 'duckduckgo', 'yahoo', 'brave'] as const;

      engines.forEach(engine => {
        act(() => {
          useAutomationStore.getState().setEngine(engine);
        });
        expect(useAutomationStore.getState().selectedEngine).toBe(engine);
      });
    });
  });

  // ============================================================
  // UTILITY TESTS
  // ============================================================
  describe('getActiveSession', () => {
    it('returns correct active session', () => {
      // Arrange
      const activeSession = {
        id: 'active-session',
        name: 'Active',
        status: 'active' as const,
        engine: 'google' as const,
        keywords: [],
        targetDomains: [],
        tasks: [],
        statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
      };
      
      useAutomationStore.setState({
        sessions: [
          { ...activeSession, id: 'other', name: 'Other' },
          activeSession,
        ],
        activeSessionId: 'active-session',
      });

      // Act
      const result = useAutomationStore.getState().getActiveSession();

      // Assert
      expect(result?.id).toBe('active-session');
      expect(result?.name).toBe('Active');
    });

    it('returns undefined when no active session', () => {
      // Arrange
      useAutomationStore.setState({ sessions: [], activeSessionId: null });

      // Act
      const result = useAutomationStore.getState().getActiveSession();

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
