/**
 * Session Store
 * Manages browser session state (save/load/restore)
 * 
 * EP-010: Session Management
 */

import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export interface TabState {
  url: string;
  title?: string;
  favicon?: string;
  proxyId?: string | null;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SavedSession {
  id: string;
  name: string;
  tabs: TabState[];
  windowBounds: WindowBounds;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionState {
  // State
  sessions: SavedSession[];
  currentSession: SavedSession | null;
  isLoading: boolean;
  error: string | null;

  // Actions - CRUD
  saveSession: (name: string, tabs: TabState[], windowBounds: WindowBounds) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<SavedSession>) => Promise<void>;

  // Actions - List
  fetchAllSessions: () => Promise<void>;

  // Actions - State Management
  setCurrentSession: (session: SavedSession | null) => void;
  clearError: () => void;
  reset: () => void;

  // Selectors
  selectSessionById: (sessionId: string) => SavedSession | undefined;
  selectRecentSessions: (count: number) => SavedSession[];
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  sessions: [] as SavedSession[],
  currentSession: null as SavedSession | null,
  isLoading: false,
  error: null as string | null,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  // ---------------------------------------------------------------------------
  // saveSession
  // ---------------------------------------------------------------------------
  saveSession: async (name, tabs, windowBounds) => {
    try {
      set({ isLoading: true, error: null });

      const result = await window.api.session.save({
        name,
        tabs,
        windowBounds,
      }) as { success: boolean; session?: SavedSession; error?: string };

      if (result.success && result.session) {
        const savedSession = {
          ...result.session,
          createdAt: new Date(result.session.createdAt),
          updatedAt: new Date(result.session.updatedAt),
        };

        set((state) => ({
          sessions: [savedSession, ...state.sessions],
          currentSession: savedSession,
          isLoading: false,
        }));
      } else {
        set({
          error: result.error || 'Failed to save session',
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SessionStore] Failed to save session:', errorMessage);
      set({
        error: `Failed to save session: ${errorMessage}`,
        isLoading: false,
      });
      throw new Error(`Failed to save session: ${errorMessage}`);
    }
  },

  // ---------------------------------------------------------------------------
  // loadSession
  // ---------------------------------------------------------------------------
  loadSession: async (sessionId) => {
    try {
      set({ isLoading: true, error: null });

      const result = await window.api.session.load(sessionId) as {
        success: boolean;
        session?: SavedSession;
        error?: string;
      };

      if (result.success && result.session) {
        const loadedSession = {
          ...result.session,
          createdAt: new Date(result.session.createdAt),
          updatedAt: new Date(result.session.updatedAt),
        };

        set({
          currentSession: loadedSession,
          isLoading: false,
        });
      } else {
        set({
          error: result.error || 'Failed to load session',
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SessionStore] Failed to load session:', errorMessage, { sessionId });
      set({
        error: `Failed to load session: ${errorMessage}`,
        isLoading: false,
      });
      throw new Error(`Failed to load session: ${errorMessage}`);
    }
  },

  // ---------------------------------------------------------------------------
  // deleteSession
  // ---------------------------------------------------------------------------
  deleteSession: async (sessionId) => {
    try {
      set({ isLoading: true, error: null });

      const result = await window.api.session.delete(sessionId) as {
        success: boolean;
        error?: string;
      };

      if (result.success) {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          const newCurrentSession =
            state.currentSession?.id === sessionId ? null : state.currentSession;

          return {
            sessions: newSessions,
            currentSession: newCurrentSession,
            isLoading: false,
          };
        });
      } else {
        set({
          error: result.error || 'Failed to delete session',
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SessionStore] Failed to delete session:', errorMessage, { sessionId });
      set({
        error: `Failed to delete session: ${errorMessage}`,
        isLoading: false,
      });
      throw new Error(`Failed to delete session: ${errorMessage}`);
    }
  },

  // ---------------------------------------------------------------------------
  // updateSession
  // ---------------------------------------------------------------------------
  updateSession: async (sessionId, updates) => {
    try {
      set({ isLoading: true, error: null });

      const result = await window.api.session.update(sessionId, updates) as {
        success: boolean;
        session?: SavedSession;
        error?: string;
      };

      if (result.success && result.session) {
        const updatedSession = {
          ...result.session,
          createdAt: new Date(result.session.createdAt),
          updatedAt: new Date(result.session.updatedAt),
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? updatedSession : s
          ),
          currentSession:
            state.currentSession?.id === sessionId
              ? updatedSession
              : state.currentSession,
          isLoading: false,
        }));
      } else {
        set({
          error: result.error || 'Failed to update session',
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SessionStore] Failed to update session:', errorMessage, { sessionId });
      set({
        error: `Failed to update session: ${errorMessage}`,
        isLoading: false,
      });
      throw new Error(`Failed to update session: ${errorMessage}`);
    }
  },

  // ---------------------------------------------------------------------------
  // fetchAllSessions
  // ---------------------------------------------------------------------------
  fetchAllSessions: async () => {
    try {
      set({ isLoading: true, error: null });

      const result = await window.api.session.list() as {
        success: boolean;
        sessions?: SavedSession[];
        error?: string;
      };

      if (result.success && result.sessions) {
        const sessions = result.sessions.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }));

        set({
          sessions,
          isLoading: false,
        });
      } else {
        set({
          error: result.error || 'Failed to fetch sessions',
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SessionStore] Failed to fetch sessions:', errorMessage);
      set({
        error: `Failed to fetch sessions: ${errorMessage}`,
        isLoading: false,
      });
    }
  },

  // ---------------------------------------------------------------------------
  // setCurrentSession
  // ---------------------------------------------------------------------------
  setCurrentSession: (session) => {
    set({ currentSession: session });
  },

  // ---------------------------------------------------------------------------
  // clearError
  // ---------------------------------------------------------------------------
  clearError: () => {
    set({ error: null });
  },

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------
  reset: () => {
    set(initialState);
  },

  // ---------------------------------------------------------------------------
  // selectSessionById
  // ---------------------------------------------------------------------------
  selectSessionById: (sessionId) => {
    return get().sessions.find((s) => s.id === sessionId);
  },

  // ---------------------------------------------------------------------------
  // selectRecentSessions
  // ---------------------------------------------------------------------------
  selectRecentSessions: (count) => {
    const { sessions } = get();
    return [...sessions]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, count);
  },
}));

// ============================================================================
// TYPE AUGMENTATION FOR WINDOW.API
// ============================================================================

declare global {
  interface Window {
    api: {
      session: {
        save: (config: {
          name: string;
          tabs: TabState[];
          windowBounds: WindowBounds;
        }) => Promise<{ success: boolean; session?: SavedSession; error?: string }>;
        load: (id: string) => Promise<{ success: boolean; session?: SavedSession; error?: string }>;
        list: () => Promise<{ success: boolean; sessions?: SavedSession[]; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
        update: (
          id: string,
          updates: Partial<SavedSession>
        ) => Promise<{ success: boolean; session?: SavedSession; error?: string }>;
      };
      // ... other API namespaces
      proxy: {
        add: (config: unknown) => Promise<unknown>;
        remove: (id: string) => Promise<unknown>;
        update: (id: string, updates: unknown) => Promise<unknown>;
        list: () => Promise<unknown>;
        validate: (id: string) => Promise<unknown>;
        setRotation: (config: unknown) => Promise<unknown>;
      };
    };
  }
}
