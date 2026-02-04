/**
 * Tab Management Types
 */

export interface TabConfig {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  proxyId?: string;
  fingerprint?: FingerprintConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  partition: string;
  proxyId?: string;
  fingerprintSeed?: string;
  status: TabStatus;
  isActive: boolean;
  isPinned: boolean;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  memoryUsage?: number;
  createdAt: Date;
  lastActiveAt: Date;
}

export type TabStatus = 'created' | 'loading' | 'active' | 'idle' | 'suspended' | 'closing' | 'closed';

export interface FingerprintConfig {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  navigator: boolean | NavigatorSpoofing;
  timezone?: boolean | string;
  language?: string;
  platform?: string;
}

export interface NavigatorSpoofing {
  userAgent?: string;
  platform?: string;
  language?: string;
  vendor?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}
