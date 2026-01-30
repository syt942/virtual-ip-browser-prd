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
