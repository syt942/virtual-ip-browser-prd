/**
 * Automation Store
 * Manages automation sessions and tasks
 */

import { create } from 'zustand';

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SearchTask {
  id: string;
  sessionId: string;
  keyword: string;
  engine: SearchEngine;
  status: TaskStatus;
  position?: number;
  error?: string;
  duration?: number;
}

export interface AutomationSession {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  engine: SearchEngine;
  keywords: string[];
  targetDomains: string[];
  tasks: SearchTask[];
  statistics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgDuration: number;
    successRate: number;
  };
}

/** Configuration required to start a new automation session */
interface SessionStartConfig {
  engine: SearchEngine;
  keywords: string[];
  targetDomains: string[];
}

interface AutomationState {
  // State
  sessionList: AutomationSession[];
  currentActiveSessionId: string | null;
  keywordQueue: string[];
  targetDomainList: string[];
  selectedSearchEngine: SearchEngine;
  
  // Actions - Session Lifecycle
  startNewSession: (config: SessionStartConfig) => Promise<void>;
  stopSessionById: (sessionId: string) => Promise<void>;
  pauseSessionById: (sessionId: string) => Promise<void>;
  resumeSessionById: (sessionId: string) => Promise<void>;
  
  // Actions - Keyword Management
  addKeywordToQueue: (keyword: string) => void;
  removeKeywordFromQueue: (keyword: string) => void;
  clearAllKeywords: () => void;
  
  // Actions - Domain Management
  addTargetDomainToList: (domain: string) => Promise<void>;
  removeTargetDomainFromList: (domain: string) => void;
  clearAllTargetDomains: () => void;
  
  // Actions - Configuration
  setSelectedSearchEngine: (engine: SearchEngine) => void;
  
  // Selectors
  selectCurrentActiveSession: () => AutomationSession | undefined;
}

/** Session status constants for type safety */
const SESSION_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
} as const;

export const useAutomationStore = create<AutomationState>((set, get) => ({
  sessionList: [],
  currentActiveSessionId: null,
  keywordQueue: [],
  targetDomainList: [],
  selectedSearchEngine: 'google',

  startNewSession: async (config) => {
    try {
      const result = await window.api.automation.startSearch(config) as { success: boolean; session?: AutomationSession };
      
      if (result.success && result.session) {
        const createdSession = result.session;
        set((state) => ({
          sessionList: [...state.sessionList, createdSession],
          currentActiveSessionId: createdSession.id
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AutomationStore] Failed to start new session:', errorMessage);
    }
  },

  stopSessionById: async (sessionId) => {
    try {
      const result = await window.api.automation.stopSearch(sessionId) as { success: boolean };
      
      if (result.success) {
        set((state) => ({
          sessionList: state.sessionList.map(session =>
            session.id === sessionId 
              ? { ...session, status: SESSION_STATUS.STOPPED } 
              : session
          ),
          currentActiveSessionId: state.currentActiveSessionId === sessionId 
            ? null 
            : state.currentActiveSessionId
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AutomationStore] Failed to stop session:', errorMessage, { sessionId });
    }
  },

  pauseSessionById: async (sessionId) => {
    set((state) => ({
      sessionList: state.sessionList.map(session =>
        session.id === sessionId 
          ? { ...session, status: SESSION_STATUS.PAUSED } 
          : session
      )
    }));
  },

  resumeSessionById: async (sessionId) => {
    set((state) => ({
      sessionList: state.sessionList.map(session =>
        session.id === sessionId 
          ? { ...session, status: SESSION_STATUS.ACTIVE } 
          : session
      )
    }));
  },

  addKeywordToQueue: (keyword) => {
    const trimmedKeyword = keyword.trim();
    const isEmptyKeyword = !trimmedKeyword;
    if (isEmptyKeyword) { return; }
    
    set((state) => {
      const isDuplicate = state.keywordQueue.includes(trimmedKeyword);
      return {
        keywordQueue: isDuplicate
          ? state.keywordQueue
          : [...state.keywordQueue, trimmedKeyword]
      };
    });
  },

  removeKeywordFromQueue: (keywordToRemove) => {
    set((state) => ({
      keywordQueue: state.keywordQueue.filter(keyword => keyword !== keywordToRemove)
    }));
  },

  addTargetDomainToList: async (domain) => {
    const trimmedDomain = domain.trim();
    const isEmptyDomain = !trimmedDomain;
    if (isEmptyDomain) { return; }
    
    try {
      await window.api.automation.addDomain(trimmedDomain);
      
      set((state) => {
        const isDuplicate = state.targetDomainList.includes(trimmedDomain);
        return {
          targetDomainList: isDuplicate
            ? state.targetDomainList
            : [...state.targetDomainList, trimmedDomain]
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AutomationStore] Failed to add target domain:', errorMessage, { domain: trimmedDomain });
    }
  },

  removeTargetDomainFromList: (domainToRemove) => {
    set((state) => ({
      targetDomainList: state.targetDomainList.filter(domain => domain !== domainToRemove)
    }));
  },

  setSelectedSearchEngine: (engine) => {
    set({ selectedSearchEngine: engine });
  },

  selectCurrentActiveSession: () => {
    const state = get();
    return state.sessionList.find(session => session.id === state.currentActiveSessionId);
  },

  clearAllKeywords: () => {
    set({ keywordQueue: [] });
  },

  clearAllTargetDomains: () => {
    set({ targetDomainList: [] });
  }
}));
