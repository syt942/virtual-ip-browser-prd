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

interface AutomationState {
  sessions: AutomationSession[];
  activeSessionId: string | null;
  keywords: string[];
  targetDomains: string[];
  selectedEngine: SearchEngine;
  
  // Actions
  startSession: (config: { engine: SearchEngine; keywords: string[]; targetDomains: string[] }) => Promise<void>;
  stopSession: (id: string) => Promise<void>;
  pauseSession: (id: string) => Promise<void>;
  resumeSession: (id: string) => Promise<void>;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  addTargetDomain: (domain: string) => Promise<void>;
  removeTargetDomain: (domain: string) => void;
  setEngine: (engine: SearchEngine) => void;
  getActiveSession: () => AutomationSession | undefined;
  clearKeywords: () => void;
  clearTargetDomains: () => void;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  keywords: [],
  targetDomains: [],
  selectedEngine: 'google',

  startSession: async (config) => {
    try {
      const result = await window.api.automation.startSearch(config) as { success: boolean; session?: AutomationSession };
      
      if (result.success && result.session) {
        set((state) => ({
          sessions: [...state.sessions, result.session as AutomationSession],
          activeSessionId: (result.session as AutomationSession).id
        }));
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  },

  stopSession: async (id) => {
    try {
      const result = await window.api.automation.stopSearch(id) as { success: boolean };
      
      if (result.success) {
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === id ? { ...s, status: 'stopped' as const } : s
          ),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
        }));
      }
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  },

  pauseSession: async (id) => {
    set((state) => ({
      sessions: state.sessions.map(s =>
        s.id === id ? { ...s, status: 'paused' as const } : s
      )
    }));
  },

  resumeSession: async (id) => {
    set((state) => ({
      sessions: state.sessions.map(s =>
        s.id === id ? { ...s, status: 'active' as const } : s
      )
    }));
  },

  addKeyword: (keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    
    set((state) => ({
      keywords: state.keywords.includes(trimmed)
        ? state.keywords
        : [...state.keywords, trimmed]
    }));
  },

  removeKeyword: (keyword) => {
    set((state) => ({
      keywords: state.keywords.filter(k => k !== keyword)
    }));
  },

  addTargetDomain: async (domain) => {
    const trimmed = domain.trim();
    if (!trimmed) return;
    
    try {
      await window.api.automation.addDomain(trimmed);
      
      set((state) => ({
        targetDomains: state.targetDomains.includes(trimmed)
          ? state.targetDomains
          : [...state.targetDomains, trimmed]
      }));
    } catch (error) {
      console.error('Failed to add domain:', error);
    }
  },

  removeTargetDomain: (domain) => {
    set((state) => ({
      targetDomains: state.targetDomains.filter(d => d !== domain)
    }));
  },

  setEngine: (engine) => {
    set({ selectedEngine: engine });
  },

  getActiveSession: () => {
    const state = get();
    return state.sessions.find(s => s.id === state.activeSessionId);
  },

  clearKeywords: () => {
    set({ keywords: [] });
  },

  clearTargetDomains: () => {
    set({ targetDomains: [] });
  }
}));
