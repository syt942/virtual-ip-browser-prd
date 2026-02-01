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
      sessionList: [],
      currentActiveSessionId: null,
      keywordQueue: [],
      targetDomainList: [],
      selectedSearchEngine: 'google',
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
      expect(state.sessionList).toEqual([]);
    });

    it('initializes with null activeSessionId', () => {
      const state = useAutomationStore.getState();
      expect(state.currentActiveSessionId).toBeNull();
    });

    it('initializes with empty keywords array', () => {
      const state = useAutomationStore.getState();
      expect(state.keywordQueue).toEqual([]);
    });

    it('initializes with google as default engine', () => {
      const state = useAutomationStore.getState();
      expect(state.selectedSearchEngine).toBe('google');
    });
  });

  // ============================================================
  // SESSION MANAGEMENT TESTS
  // ============================================================
  describe('startNewSession', () => {
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
        await useAutomationStore.getState().startNewSession({
          engine: 'google',
          keywords: ['test'],
          targetDomains: ['example.com'],
        });
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.sessionList).toHaveLength(1);
      expect(state.sessionList[0].id).toBe(mockSession.id);
      expect(state.currentActiveSessionId).toBe(mockSession.id);
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
        await useAutomationStore.getState().startNewSession(config);
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
        await useAutomationStore.getState().startNewSession({
          engine: 'google',
          keywords: ['test'],
          targetDomains: [],
        });
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.sessionList).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('stopSessionById', () => {
    it('updates session status to stopped', async () => {
      // Arrange
      const sessionId = '00000000-0000-4000-a000-000000000001';
      useAutomationStore.setState({
        sessionList: [{
          id: sessionId,
          name: 'Test',
          status: 'active',
          engine: 'google',
          keywords: [],
          targetDomains: [],
          tasks: [],
          statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
        }],
        currentActiveSessionId: sessionId,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().stopSessionById(sessionId);
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.sessionList[0].status).toBe('stopped');
      expect(state.currentActiveSessionId).toBeNull();
    });

    it('calls window.api.automation.stopSearch', async () => {
      // Arrange
      const sessionId = 'session-123';
      useAutomationStore.setState({
        sessionList: [{
          id: sessionId,
          name: 'Test',
          status: 'active',
          engine: 'google',
          keywords: [],
          targetDomains: [],
          tasks: [],
          statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
        }],
        currentActiveSessionId: sessionId,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().stopSessionById(sessionId);
      });

      // Assert
      expect(mockApi.automation.stopSearch).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('pauseSessionById', () => {
    it('updates session status to paused', async () => {
      // Arrange
      const sessionId = 'session-123';
      useAutomationStore.setState({
        sessionList: [{
          id: sessionId,
          name: 'Test',
          status: 'active',
          engine: 'google',
          keywords: [],
          targetDomains: [],
          tasks: [],
          statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
        }],
        currentActiveSessionId: sessionId,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().pauseSessionById(sessionId);
      });

      // Assert
      expect(useAutomationStore.getState().sessionList[0].status).toBe('paused');
    });
  });

  describe('resumeSessionById', () => {
    it('updates session status to active', async () => {
      // Arrange
      const sessionId = 'session-123';
      useAutomationStore.setState({
        sessionList: [{
          id: sessionId,
          name: 'Test',
          status: 'paused',
          engine: 'google',
          keywords: [],
          targetDomains: [],
          tasks: [],
          statistics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, avgDuration: 0, successRate: 0 },
        }],
        currentActiveSessionId: sessionId,
      });

      // Act
      await act(async () => {
        await useAutomationStore.getState().resumeSessionById(sessionId);
      });

      // Assert
      expect(useAutomationStore.getState().sessionList[0].status).toBe('active');
    });
  });

  // ============================================================
  // KEYWORD MANAGEMENT TESTS
  // ============================================================
  describe('addKeywordToQueue', () => {
    it('adds trimmed keyword to list', () => {
      // Act
      act(() => {
        useAutomationStore.getState().addKeywordToQueue('  test keyword  ');
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.keywordQueue).toContain('test keyword');
    });

    it('prevents duplicate keywords', () => {
      // Act
      act(() => {
        useAutomationStore.getState().addKeywordToQueue('keyword');
        useAutomationStore.getState().addKeywordToQueue('keyword');
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.keywordQueue).toHaveLength(1);
    });

    it('ignores empty keywords', () => {
      // Act
      act(() => {
        useAutomationStore.getState().addKeywordToQueue('');
        useAutomationStore.getState().addKeywordToQueue('   ');
      });

      // Assert
      expect(useAutomationStore.getState().keywordQueue).toHaveLength(0);
    });

    it('adds multiple unique keywords', () => {
      // Act
      act(() => {
        useAutomationStore.getState().addKeywordToQueue('keyword1');
        useAutomationStore.getState().addKeywordToQueue('keyword2');
        useAutomationStore.getState().addKeywordToQueue('keyword3');
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.keywordQueue).toHaveLength(3);
      expect(state.keywordQueue).toEqual(['keyword1', 'keyword2', 'keyword3']);
    });
  });

  describe('removeKeywordFromQueue', () => {
    it('removes keyword from list', () => {
      // Arrange
      useAutomationStore.setState({ keywordQueue: ['keyword1', 'keyword2', 'keyword3'] });

      // Act
      act(() => {
        useAutomationStore.getState().removeKeywordFromQueue('keyword2');
      });

      // Assert
      const state = useAutomationStore.getState();
      expect(state.keywordQueue).toEqual(['keyword1', 'keyword3']);
    });

    it('does nothing for non-existent keyword', () => {
      // Arrange
      useAutomationStore.setState({ keywordQueue: ['keyword1'] });

      // Act
      act(() => {
        useAutomationStore.getState().removeKeywordFromQueue('nonexistent');
      });

      // Assert
      expect(useAutomationStore.getState().keywordQueue).toEqual(['keyword1']);
    });
  });

  describe('clearAllKeywords', () => {
    it('removes all keywords', () => {
      // Arrange
      useAutomationStore.setState({ keywordQueue: ['k1', 'k2', 'k3'] });

      // Act
      act(() => {
        useAutomationStore.getState().clearAllKeywords();
      });

      // Assert
      expect(useAutomationStore.getState().keywordQueue).toEqual([]);
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
