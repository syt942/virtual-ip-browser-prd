/**
 * Privacy Settings Panel
 * Connected to Zustand privacy store for state management
 */

import { usePrivacyStore } from '@/stores/privacyStore';

export function PrivacyPanel() {
  const {
    currentPrivacySettings,
    toggleCanvasSpoofing,
    toggleWebGLSpoofing,
    toggleAudioSpoofing,
    toggleNavigatorSpoofing,
    toggleTimezoneSpoofing,
    toggleFontSpoofing,
    toggleWebRTCProtection,
    toggleTrackerBlockingProtection,
  } = usePrivacyStore();

  return (
    <div className="h-full flex flex-col" data-testid="privacy-panel">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold" data-testid="privacy-panel-title">Privacy Protection</h2>
      </div>

      {/* Settings */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="privacy-settings">
        {/* Fingerprint Protection */}
        <div data-testid="fingerprint-section">
          <h3 className="text-sm font-semibold mb-3">Fingerprint Spoofing</h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer" data-testid="canvas-toggle-label">
              <span className="text-sm">Canvas Fingerprint</span>
              <input 
                type="checkbox" 
                checked={currentPrivacySettings.canvas} 
                onChange={toggleCanvasSpoofing}
                className="rounded"
                data-testid="canvas-toggle"
              />
            </label>
            <label className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer" data-testid="webgl-toggle-label">
              <span className="text-sm">WebGL Fingerprint</span>
              <input 
                type="checkbox" 
                checked={currentPrivacySettings.webgl} 
                onChange={toggleWebGLSpoofing}
                className="rounded"
                data-testid="webgl-toggle"
              />
            </label>
            <label className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer" data-testid="audio-toggle-label">
              <span className="text-sm">Audio Fingerprint</span>
              <input 
                type="checkbox" 
                checked={currentPrivacySettings.audio} 
                onChange={toggleAudioSpoofing}
                className="rounded"
                data-testid="audio-toggle"
              />
            </label>
            <label className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer" data-testid="navigator-toggle-label">
              <span className="text-sm">Navigator Spoofing</span>
              <input 
                type="checkbox" 
                checked={currentPrivacySettings.navigator} 
                onChange={toggleNavigatorSpoofing}
                className="rounded"
                data-testid="navigator-toggle"
              />
            </label>
            <label className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer" data-testid="fonts-toggle-label">
              <span className="text-sm">Font Fingerprint</span>
              <input 
                type="checkbox" 
                checked={currentPrivacySettings.fonts} 
                onChange={toggleFontSpoofing}
                className="rounded"
                data-testid="fonts-toggle"
              />
            </label>
          </div>
        </div>

        {/* WebRTC Protection */}
        <div data-testid="webrtc-section">
          <h3 className="text-sm font-semibold mb-3">WebRTC Protection</h3>
          <label className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer" data-testid="webrtc-toggle-label">
            <span className="text-sm">Block WebRTC Leaks</span>
            <input 
              type="checkbox" 
              checked={currentPrivacySettings.webrtc} 
              onChange={() => toggleWebRTCProtection()}
              className="rounded"
              data-testid="webrtc-toggle"
            />
          </label>
        </div>

        {/* Tracker Blocking */}
        <div data-testid="tracker-section">
          <h3 className="text-sm font-semibold mb-3">Tracker Blocking</h3>
          <label className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer" data-testid="tracker-toggle-label">
            <span className="text-sm">Block All Trackers</span>
            <input 
              type="checkbox" 
              checked={currentPrivacySettings.trackerBlocking} 
              onChange={() => toggleTrackerBlockingProtection()}
              className="rounded"
              data-testid="tracker-toggle"
            />
          </label>
        </div>

        {/* Timezone */}
        <div data-testid="timezone-section">
          <h3 className="text-sm font-semibold mb-3">Timezone Spoofing</h3>
          <label className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer" data-testid="timezone-toggle-label">
            <span className="text-sm">Enable Timezone Spoofing</span>
            <input 
              type="checkbox" 
              checked={currentPrivacySettings.timezone} 
              onChange={toggleTimezoneSpoofing}
              className="rounded"
              data-testid="timezone-toggle"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
