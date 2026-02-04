# Core User Flows - v1.4.0 Features

## Overview

This specification documents the user flows for the seven key features in v1.4.0 that address performance, control, and visibility pain points for power users running heavy automation workloads.

---

## Flow 1: Bulk Proxy Import

**Description:** Import multiple proxies at once from file or clipboard to eliminate tedious one-by-one addition.

**Trigger:** User clicks "Import" button in Proxy Panel header (next to "Add Proxy" button).

**Steps:**

1. User opens Proxy Panel from bottom toolbar
2. User clicks "Import" button in panel header
3. Modal opens with two input methods:
   - File upload area (drag-drop or click to browse)
   - Paste textarea for bulk text input
4. User either uploads .txt/.csv file OR pastes proxy list (one per line)
5. System parses proxies and shows preview table with columns:
   - Status indicator (✓ valid, ✗ invalid)
   - Host:Port
   - Protocol (auto-detected or defaulted)
   - Region (if detectable)
6. Invalid entries highlighted in red with error reason
7. User can deselect individual proxies via checkboxes
8. Summary shows: "X valid, Y invalid, Z duplicates (skipped)"
9. User clicks "Import Selected" button
10. Progress bar shows import progress
11. Success toast: "Imported 47 proxies successfully"
12. Modal closes, proxy list updates with new entries
13. Proxies begin automatic validation in background

**Exit:** User returns to Proxy Panel with imported proxies visible and validating.

### Wireframe: Bulk Import Modal

```wireframe
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; }
  .modal { background: #2a2a2a; border: 1px solid #404040; border-radius: 12px; width: 600px; max-height: 80vh; display: flex; flex-direction: column; }
  .modal-header { padding: 20px; border-bottom: 1px solid #404040; display: flex; justify-content: space-between; align-items: center; }
  .modal-title { font-size: 18px; font-weight: 600; }
  .close-btn { background: none; border: none; color: #999; cursor: pointer; font-size: 24px; }
  .modal-body { padding: 20px; overflow-y: auto; flex: 1; }
  .input-section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 500; margin-bottom: 12px; color: #b0b0b0; }
  .upload-area { border: 2px dashed #505050; border-radius: 8px; padding: 40px; text-align: center; background: #252525; cursor: pointer; transition: all 0.2s; }
  .upload-area:hover { border-color: #6366f1; background: #2a2a3a; }
  .upload-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.3; }
  .upload-text { font-size: 14px; color: #999; }
  .upload-hint { font-size: 12px; color: #666; margin-top: 8px; }
  .divider { text-align: center; margin: 20px 0; color: #666; font-size: 12px; }
  textarea { width: 100%; min-height: 120px; background: #1f1f1f; border: 1px solid #404040; border-radius: 8px; padding: 12px; color: #e0e0e0; font-family: monospace; font-size: 13px; resize: vertical; }
  textarea::placeholder { color: #666; }
  .preview-section { margin-top: 24px; }
  .preview-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .preview-table th { background: #1f1f1f; padding: 10px; text-align: left; font-weight: 500; border-bottom: 1px solid #404040; }
  .preview-table td { padding: 10px; border-bottom: 1px solid #333; }
  .preview-table tr:hover { background: #252525; }
  .status-valid { color: #22c55e; }
  .status-invalid { color: #ef4444; }
  .checkbox { margin-right: 8px; }
  .summary { background: #1f1f1f; border: 1px solid #404040; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 13px; }
  .summary-item { display: inline-block; margin-right: 20px; }
  .summary-value { font-weight: 600; color: #6366f1; }
  .modal-footer { padding: 20px; border-top: 1px solid #404040; display: flex; justify-content: space-between; align-items: center; }
  .btn { padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
  .btn-primary { background: #6366f1; color: white; }
  .btn-primary:hover { background: #5558e3; }
  .btn-secondary { background: #404040; color: #e0e0e0; }
  .btn-secondary:hover { background: #4a4a4a; }
</style>
</head>
<body>
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Import Proxies</h2>
        <button class="close-btn" data-element-id="close-modal">×</button>
      </div>
      
      <div class="modal-body">
        <div class="input-section">
          <div class="section-title">Upload File</div>
          <div class="upload-area" data-element-id="file-upload">
            <div class="upload-icon">📁</div>
            <div class="upload-text">Drag & drop file here or click to browse</div>
            <div class="upload-hint">Supports .txt and .csv files</div>
          </div>
        </div>
        
        <div class="divider">— OR —</div>
        
        <div class="input-section">
          <div class="section-title">Paste Proxy List</div>
          <textarea 
            placeholder="host:port&#10;host:port:username:password&#10;protocol://host:port&#10;&#10;One proxy per line. Supported formats:&#10;• host:port&#10;• host:port:user:pass&#10;• protocol://host:port"
            data-element-id="paste-textarea"
          ></textarea>
        </div>
        
        <div class="preview-section">
          <div class="section-title">Preview (3 proxies detected)</div>
          <table class="preview-table">
            <thead>
              <tr>
                <th style="width: 40px;"><input type="checkbox" checked data-element-id="select-all"></th>
                <th style="width: 60px;">Status</th>
                <th>Host:Port</th>
                <th>Protocol</th>
                <th>Region</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><input type="checkbox" checked class="checkbox"></td>
                <td><span class="status-valid">✓ Valid</span></td>
                <td>192.168.1.100:8080</td>
                <td>HTTP</td>
                <td>US</td>
              </tr>
              <tr>
                <td><input type="checkbox" checked class="checkbox"></td>
                <td><span class="status-valid">✓ Valid</span></td>
                <td>proxy.example.com:3128</td>
                <td>SOCKS5</td>
                <td>EU</td>
              </tr>
              <tr>
                <td><input type="checkbox" class="checkbox"></td>
                <td><span class="status-invalid">✗ Invalid</span></td>
                <td>invalid-proxy</td>
                <td>—</td>
                <td>Invalid format</td>
              </tr>
            </tbody>
          </table>
          
          <div class="summary">
            <span class="summary-item"><span class="summary-value">2</span> valid</span>
            <span class="summary-item"><span class="summary-value">1</span> invalid</span>
            <span class="summary-item"><span class="summary-value">0</span> duplicates</span>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" data-element-id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" data-element-id="import-btn">Import 2 Selected Proxies</button>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## Flow 2: Dynamic Proxy Assignment

**Description:** Assign different proxies to different tabs during runtime for flexible IP management.

**Trigger:** User hovers over a tab in the tab bar, revealing a dropdown icon.

**Steps:**

1. User hovers over any tab in tab bar
2. Small dropdown icon (⌄) appears on right side of tab
3. User clicks dropdown icon
4. Dropdown menu opens showing:
   - Current assignment: "Using: US Proxy 1" (or "No Proxy")
   - Divider line
   - List of available proxies (name, status indicator, latency)
   - "No Proxy" option at bottom
5. User clicks desired proxy from list
6. Dropdown closes
7. Tab shows small proxy indicator badge (colored dot)
8. Page reloads with new proxy applied
9. Toast notification: "Proxy changed to US Proxy 1"

**Exit:** User continues browsing with new proxy assigned to that specific tab.

### Wireframe: Tab Proxy Dropdown

```wireframe
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
  .tab-bar { background: #2a2a2a; border-bottom: 1px solid #404040; padding: 8px; display: flex; gap: 4px; }
  .tab { background: #1f1f1f; border: 1px solid #404040; border-radius: 6px 6px 0 0; padding: 8px 12px; display: flex; align-items: center; gap: 8px; position: relative; min-width: 180px; cursor: pointer; }
  .tab.active { background: #2a2a2a; border-bottom-color: #2a2a2a; }
  .tab-icon { font-size: 14px; }
  .tab-title { flex: 1; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tab-close { opacity: 0.5; cursor: pointer; font-size: 16px; }
  .tab-close:hover { opacity: 1; }
  .tab-dropdown-trigger { opacity: 0; margin-left: auto; padding: 2px 4px; cursor: pointer; font-size: 12px; color: #999; }
  .tab:hover .tab-dropdown-trigger { opacity: 1; }
  .proxy-badge { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
  .dropdown-menu { position: absolute; top: 100%; right: 0; background: #2a2a2a; border: 1px solid #404040; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); min-width: 220px; z-index: 1000; margin-top: 4px; }
  .dropdown-header { padding: 12px; border-bottom: 1px solid #404040; font-size: 12px; color: #999; }
  .dropdown-current { font-size: 13px; color: #e0e0e0; margin-top: 4px; }
  .dropdown-divider { height: 1px; background: #404040; margin: 4px 0; }
  .dropdown-item { padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; transition: background 0.15s; }
  .dropdown-item:hover { background: #333; }
  .proxy-status { width: 8px; height: 8px; border-radius: 50%; }
  .proxy-status.active { background: #22c55e; }
  .proxy-status.failed { background: #ef4444; }
  .proxy-info { flex: 1; }
  .proxy-name { font-weight: 500; }
  .proxy-latency { font-size: 11px; color: #999; margin-left: auto; }
  .no-proxy-option { border-top: 1px solid #404040; }
</style>
</head>
<body>
  <div class="tab-bar">
    <div class="tab active">
      <span class="tab-icon">🌐</span>
      <span class="tab-title">Example Domain</span>
      <span class="proxy-badge"></span>
      <span class="tab-dropdown-trigger" data-element-id="tab-dropdown-trigger">⌄</span>
      <span class="tab-close">×</span>
      
      <!-- Dropdown Menu -->
      <div class="dropdown-menu" data-element-id="proxy-dropdown">
        <div class="dropdown-header">
          <div>Proxy Assignment</div>
          <div class="dropdown-current">Using: <strong>US Proxy 1</strong></div>
        </div>
        
        <div class="dropdown-divider"></div>
        
        <div class="dropdown-item" data-element-id="proxy-option-1">
          <span class="proxy-status active"></span>
          <div class="proxy-info">
            <div class="proxy-name">US Proxy 1</div>
          </div>
          <span class="proxy-latency">45ms</span>
        </div>
        
        <div class="dropdown-item" data-element-id="proxy-option-2">
          <span class="proxy-status active"></span>
          <div class="proxy-info">
            <div class="proxy-name">EU Proxy 2</div>
          </div>
          <span class="proxy-latency">78ms</span>
        </div>
        
        <div class="dropdown-item" data-element-id="proxy-option-3">
          <span class="proxy-status failed"></span>
          <div class="proxy-info">
            <div class="proxy-name">Asia Proxy 3</div>
          </div>
          <span class="proxy-latency">—</span>
        </div>
        
        <div class="dropdown-divider"></div>
        
        <div class="dropdown-item no-proxy-option" data-element-id="no-proxy-option">
          <span class="proxy-status" style="background: #666;"></span>
          <div class="proxy-info">
            <div class="proxy-name">No Proxy (Direct)</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="tab">
      <span class="tab-icon">📄</span>
      <span class="tab-title">Another Tab</span>
      <span class="tab-close">×</span>
    </div>
  </div>
</body>
</html>
```

---

## Flow 3: Automation Pause/Resume

**Description:** Control running automation sessions with pause/resume capability without losing progress.

**Trigger:** User clicks automation control button (dropdown) in Automation Panel.

**Steps:**

1. User opens Automation Panel from bottom toolbar
2. User configures keywords and starts automation
3. Primary button shows "Running" with dropdown arrow
4. User clicks dropdown arrow
5. Menu opens showing available actions:
   - "Pause Automation" (when running)
   - "Stop Automation" (destructive, red text)
6. User selects "Pause Automation"
7. Button changes to "Paused" state with dropdown
8. Session statistics freeze at current values
9. Active tabs complete current tasks then idle
10. User clicks dropdown again, sees:
    - "Resume Automation"
    - "Stop Automation"
11. User selects "Resume Automation"
12. Automation continues from where it paused
13. Statistics update in real-time again

**Exit:** User can pause/resume multiple times or stop completely when finished.

### Wireframe: Automation Control Dropdown

```wireframe
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
  .panel { background: #2a2a2a; border: 1px solid #404040; border-radius: 12px; width: 320px; }
  .panel-header { padding: 16px; border-bottom: 1px solid #404040; }
  .panel-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .control-group { position: relative; }
  .control-button { width: 100%; padding: 12px 16px; background: #22c55e; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .control-button.paused { background: #f59e0b; }
  .control-button.stopped { background: #6366f1; }
  .dropdown-arrow { margin-left: auto; font-size: 12px; }
  .dropdown-menu { position: absolute; top: 100%; left: 0; right: 0; background: #2a2a2a; border: 1px solid #404040; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-top: 4px; z-index: 100; }
  .dropdown-item { padding: 12px 16px; cursor: pointer; font-size: 14px; transition: background 0.15s; display: flex; align-items: center; gap: 8px; }
  .dropdown-item:hover { background: #333; }
  .dropdown-item:first-child { border-radius: 8px 8px 0 0; }
  .dropdown-item:last-child { border-radius: 0 0 8px 8px; }
  .dropdown-item.destructive { color: #ef4444; }
  .dropdown-divider { height: 1px; background: #404040; }
  .icon { font-size: 16px; }
  .stats-section { padding: 16px; background: #1f1f1f; margin: 16px; border-radius: 8px; }
  .stats-title { font-size: 13px; font-weight: 500; margin-bottom: 12px; color: #b0b0b0; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .stat-item { }
  .stat-label { font-size: 11px; color: #999; margin-bottom: 4px; }
  .stat-value { font-size: 18px; font-weight: 600; }
  .stat-value.success { color: #22c55e; }
  .stat-value.error { color: #ef4444; }
</style>
</head>
<body>
  <div class="panel">
    <div class="panel-header">
      <h2 class="panel-title">Automation Engine</h2>
      
      <!-- Running State -->
      <div class="control-group" style="margin-bottom: 20px;">
        <button class="control-button" data-element-id="automation-control-running">
          <span class="icon">▶</span>
          <span>Running</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        
        <div class="dropdown-menu" data-element-id="running-dropdown">
          <div class="dropdown-item" data-element-id="pause-action">
            <span class="icon">⏸</span>
            <span>Pause Automation</span>
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item destructive" data-element-id="stop-action">
            <span class="icon">⏹</span>
            <span>Stop Automation</span>
          </div>
        </div>
      </div>
      
      <!-- Paused State -->
      <div class="control-group" style="margin-bottom: 20px;">
        <button class="control-button paused" data-element-id="automation-control-paused">
          <span class="icon">⏸</span>
          <span>Paused</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        
        <div class="dropdown-menu" data-element-id="paused-dropdown" style="display: none;">
          <div class="dropdown-item" data-element-id="resume-action">
            <span class="icon">▶</span>
            <span>Resume Automation</span>
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item destructive" data-element-id="stop-action-2">
            <span class="icon">⏹</span>
            <span>Stop Automation</span>
          </div>
        </div>
      </div>
      
      <!-- Stopped State -->
      <div class="control-group">
        <button class="control-button stopped" data-element-id="automation-control-stopped">
          <span class="icon">▶</span>
          <span>Start Automation</span>
          <span class="dropdown-arrow">▼</span>
        </button>
      </div>
    </div>
    
    <div class="stats-section">
      <div class="stats-title">Session Statistics</div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Completed</div>
          <div class="stat-value success">127</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Failed</div>
          <div class="stat-value error">3</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Success Rate</div>
          <div class="stat-value">97.7%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Avg Duration</div>
          <div class="stat-value">8.3s</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## Flow 4: Tab Suspension (Hybrid Auto + Manual)

**Description:** Automatically suspend idle tabs to save memory, with manual override capability.

**Trigger:** Automatic after configured idle time, or manual via tab context menu.

**Automatic Suspension Flow:**

1. User has multiple tabs open (e.g., 30+ tabs)
2. Tab becomes idle (no user interaction for X minutes, configurable in Settings)
3. System checks if tab is eligible for suspension (not playing media, not in automation)
4. Tab appearance changes: title grays out, small "💤" icon appears
5. Memory is freed (tab content unloaded)
6. User clicks suspended tab
7. Tab restores instantly (from saved state)
8. Content reloads, scroll position preserved
9. Tab returns to normal appearance

**Manual Suspension Flow:**

1. User right-clicks on any tab
2. Context menu shows "Suspend Tab" option
3. User clicks "Suspend Tab"
4. Tab immediately suspends (grays out, shows 💤 icon)
5. Memory freed
6. User can click to restore anytime

**Settings Configuration:**

1. User opens Settings Panel
2. Navigates to "Performance" section
3. Sees "Tab Suspension" settings:
   - Enable/disable auto-suspension toggle
   - Idle timeout slider (5-60 minutes)
   - Exclude tabs in automation checkbox
   - Memory threshold trigger option
4. User adjusts preferences
5. Changes apply immediately

**Exit:** Tabs suspend and restore seamlessly, reducing memory usage without user intervention.

### Wireframe: Tab Suspension States

```wireframe
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
  .section { margin-bottom: 30px; }
  .section-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #b0b0b0; }
  .tab-bar { background: #2a2a2a; border-bottom: 1px solid #404040; padding: 8px; display: flex; gap: 4px; }
  .tab { background: #1f1f1f; border: 1px solid #404040; border-radius: 6px 6px 0 0; padding: 8px 12px; display: flex; align-items: center; gap: 8px; min-width: 180px; cursor: pointer; }
  .tab.active { background: #2a2a2a; border-bottom-color: #2a2a2a; }
  .tab.suspended { opacity: 0.5; }
  .tab.suspended .tab-title { color: #666; }
  .tab-icon { font-size: 14px; }
  .tab-title { flex: 1; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tab-close { opacity: 0.5; cursor: pointer; font-size: 16px; }
  .context-menu { background: #2a2a2a; border: 1px solid #404040; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); min-width: 180px; }
  .context-item { padding: 10px 16px; cursor: pointer; font-size: 13px; transition: background 0.15s; display: flex; align-items: center; gap: 10px; }
  .context-item:hover { background: #333; }
  .context-item:first-child { border-radius: 8px 8px 0 0; }
  .context-item:last-child { border-radius: 0 0 8px 8px; }
  .context-divider { height: 1px; background: #404040; margin: 4px 0; }
  .settings-panel { background: #2a2a2a; border: 1px solid #404040; border-radius: 12px; padding: 20px; max-width: 400px; }
  .settings-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
  .setting-group { margin-bottom: 20px; }
  .setting-label { font-size: 14px; font-weight: 500; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
  .toggle { width: 44px; height: 24px; background: #404040; border-radius: 12px; position: relative; cursor: pointer; transition: background 0.2s; }
  .toggle.on { background: #22c55e; }
  .toggle-knob { width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: left 0.2s; }
  .toggle.on .toggle-knob { left: 22px; }
  .slider-container { margin-top: 8px; }
  .slider { width: 100%; }
  .slider-value { font-size: 12px; color: #999; margin-top: 4px; }
  .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
  .checkbox { width: 16px; height: 16px; }
</style>
</head>
<body>
  <div class="section">
    <div class="section-title">Normal Tab State</div>
    <div class="tab-bar">
      <div class="tab active">
        <span class="tab-icon">🌐</span>
        <span class="tab-title">Active Tab</span>
        <span class="tab-close">×</span>
      </div>
      <div class="tab">
        <span class="tab-icon">📄</span>
        <span class="tab-title">Idle Tab (will suspend in 3 min)</span>
        <span class="tab-close">×</span>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Suspended Tab State</div>
    <div class="tab-bar">
      <div class="tab suspended">
        <span class="tab-icon">💤</span>
        <span class="tab-title">Suspended Tab (click to restore)</span>
        <span class="tab-close">×</span>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Tab Context Menu</div>
    <div class="context-menu" data-element-id="tab-context-menu">
      <div class="context-item" data-element-id="reload-tab">
        <span>🔄</span>
        <span>Reload Tab</span>
      </div>
      <div class="context-item" data-element-id="duplicate-tab">
        <span>📋</span>
        <span>Duplicate Tab</span>
      </div>
      <div class="context-divider"></div>
      <div class="context-item" data-element-id="suspend-tab">
        <span>💤</span>
        <span>Suspend Tab</span>
      </div>
      <div class="context-item" data-element-id="assign-proxy">
        <span>🌐</span>
        <span>Assign Proxy</span>
      </div>
      <div class="context-divider"></div>
      <div class="context-item" data-element-id="close-tab">
        <span>×</span>
        <span>Close Tab</span>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Settings Panel - Tab Suspension</div>
    <div class="settings-panel">
      <h3 class="settings-title">Performance Settings</h3>
      
      <div class="setting-group">
        <div class="setting-label">
          <span>Auto-Suspend Idle Tabs</span>
          <div class="toggle on" data-element-id="auto-suspend-toggle">
            <div class="toggle-knob"></div>
          </div>
        </div>
        <div class="slider-container">
          <label style="font-size: 12px; color: #999; display: block; margin-bottom: 4px;">Idle Timeout</label>
          <input type="range" min="5" max="60" value="15" class="slider" data-element-id="timeout-slider">
          <div class="slider-value">Suspend after 15 minutes of inactivity</div>
        </div>
      </div>
      
      <div class="setting-group">
        <label class="checkbox-label">
          <input type="checkbox" checked class="checkbox" data-element-id="exclude-automation">
          <span>Exclude tabs in automation</span>
        </label>
      </div>
      
      <div class="setting-group">
        <label class="checkbox-label">
          <input type="checkbox" class="checkbox" data-element-id="memory-trigger">
          <span>Only suspend when memory usage > 80%</span>
        </label>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## Flow 5: Privacy Statistics Viewing

**Description:** View real-time tracker blocking statistics to verify privacy protection effectiveness.

**Trigger:** User opens Privacy Panel from bottom toolbar.

**Steps:**

1. User clicks "Privacy" button in bottom toolbar
2. Privacy Panel opens showing existing privacy controls
3. New "Statistics" section appears below privacy toggles
4. Section shows:
   - Total blocked count (animated NumberTicker)
   - Breakdown by category with individual counts:
     - Ads blocked
     - Analytics blocked
     - Social trackers blocked
     - Cryptomining blocked
     - Fingerprinting blocked
5. Each category shows percentage of total
6. Real-time updates as new requests are blocked
7. "Reset Stats" button to clear counters
8. "Per-Session" / "All-Time" toggle to switch views
9. Small chart shows blocking trend over last hour

**Exit:** User understands what's being blocked and can verify protection is working.

### Wireframe: Privacy Panel with Statistics

```wireframe
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
  .panel { background: #2a2a2a; border: 1px solid #404040; border-radius: 12px; width: 320px; max-height: 600px; overflow-y: auto; }
  .panel-header { padding: 16px; border-bottom: 1px solid #404040; }
  .panel-title { font-size: 16px; font-weight: 600; }
  .section { padding: 16px; border-bottom: 1px solid #404040; }
  .section-title { font-size: 14px; font-weight: 500; margin-bottom: 12px; color: #b0b0b0; }
  .stats-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .total-blocked { text-align: center; padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px; margin-bottom: 16px; }
  .total-label { font-size: 12px; color: rgba(255,255,255,0.8); margin-bottom: 4px; }
  .total-value { font-size: 36px; font-weight: 700; color: white; }
  .category-list { display: flex; flex-direction: column; gap: 12px; }
  .category-item { display: flex; align-items: center; gap: 12px; }
  .category-icon { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .category-icon.ads { background: #ef4444; }
  .category-icon.analytics { background: #f59e0b; }
  .category-icon.social { background: #3b82f6; }
  .category-icon.crypto { background: #8b5cf6; }
  .category-icon.fingerprint { background: #10b981; }
  .category-info { flex: 1; }
  .category-name { font-size: 13px; font-weight: 500; }
  .category-count { font-size: 11px; color: #999; }
  .category-value { font-size: 16px; font-weight: 600; }
  .progress-bar { height: 4px; background: #404040; border-radius: 2px; margin-top: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); transition: width 0.3s; }
  .view-toggle { display: flex; gap: 4px; background: #1f1f1f; border-radius: 6px; padding: 2px; }
  .view-btn { flex: 1; padding: 6px 12px; border: none; background: none; color: #999; font-size: 11px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
  .view-btn.active { background: #6366f1; color: white; }
  .reset-btn { padding: 8px 16px; background: #404040; color: #e0e0e0; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; transition: background 0.2s; }
  .reset-btn:hover { background: #4a4a4a; }
</style>
</head>
<body>
  <div class="panel">
    <div class="panel-header">
      <h2 class="panel-title">Privacy Protection</h2>
    </div>
    
    <div class="section">
      <div class="section-title">Protection Status</div>
      <div style="font-size: 13px; color: #22c55e; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">🛡️</span>
        <span>All protections active</span>
      </div>
    </div>
    
    <div class="section">
      <div class="stats-header">
        <div class="section-title" style="margin: 0;">Statistics</div>
        <div class="view-toggle" data-element-id="view-toggle">
          <button class="view-btn active" data-element-id="session-view">Session</button>
          <button class="view-btn" data-element-id="alltime-view">All-Time</button>
        </div>
      </div>
      
      <div class="total-blocked">
        <div class="total-label">Total Blocked</div>
        <div class="total-value" data-element-id="total-count">1,947</div>
      </div>
      
      <div class="category-list">
        <div class="category-item">
          <div class="category-icon ads">🚫</div>
          <div class="category-info">
            <div class="category-name">Ads</div>
            <div class="category-count">63.4% of total</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: 63.4%;"></div>
            </div>
          </div>
          <div class="category-value">1,234</div>
        </div>
        
        <div class="category-item">
          <div class="category-icon analytics">📊</div>
          <div class="category-info">
            <div class="category-name">Analytics</div>
            <div class="category-count">29.1% of total</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: 29.1%;"></div>
            </div>
          </div>
          <div class="category-value">567</div>
        </div>
        
        <div class="category-item">
          <div class="category-icon social">👥</div>
          <div class="category-info">
            <div class="category-name">Social Trackers</div>
            <div class="category-count">4.6% of total</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: 4.6%;"></div>
            </div>
          </div>
          <div class="category-value">89</div>
        </div>
        
        <div class="category-item">
          <div class="category-icon crypto">⛏️</div>
          <div class="category-info">
            <div class="category-name">Cryptomining</div>
            <div class="category-count">0.6% of total</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: 0.6%;"></div>
            </div>
          </div>
          <div class="category-value">12</div>
        </div>
        
        <div class="category-item">
          <div class="category-icon fingerprint">🔍</div>
          <div class="category-info">
            <div class="category-name">Fingerprinting</div>
            <div class="category-count">2.3% of total</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: 2.3%;"></div>
            </div>
          </div>
          <div class="category-value">45</div>
        </div>
      </div>
      
      <button class="reset-btn" data-element-id="reset-stats" style="width: 100%; margin-top: 16px;">
        Reset Statistics
      </button>
    </div>
  </div>
</body>
</html>
```

---

## Flow 6: Position History Visualization

**Description:** View SERP ranking trends over time for tracked keywords with detailed charts.

**Trigger:** User clicks "View History" button in Automation Panel or Stats Panel.

**Steps:**

1. User opens Automation Panel or Stats Panel
2. User clicks "View History" button
3. Full-screen modal opens with position history interface
4. Left sidebar shows keyword list with search icons
5. User selects keyword from list
6. Main area shows line chart with:
   - X-axis: Date/time
   - Y-axis: Position (1-100, inverted so #1 is at top)
   - Line showing position changes over time
   - Markers for significant changes
7. Time range selector: 7 days / 30 days / 90 days / All time
8. Chart shows:
   - Current position (large number)
   - Change from previous (+5 or -3 with color)
   - Best position achieved
   - Average position
9. User can select multiple keywords to compare (overlay lines)
10. Export button to download data as CSV
11. Close button returns to panel

**Exit:** User understands ranking trends and can make informed SEO decisions.

### Wireframe: Position History Modal

```wireframe
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a1a; color: #e0e0e0; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: #2a2a2a; border: 1px solid #404040; border-radius: 12px; width: 100%; max-width: 1200px; height: 80vh; display: flex; flex-direction: column; }
  .modal-header { padding: 20px; border-bottom: 1px solid #404040; display: flex; justify-content: space-between; align-items: center; }
  .modal-title { font-size: 20px; font-weight: 600; }
  .header-actions { display: flex; gap: 12px; }
  .time-range { display: flex; gap: 4px; background: #1f1f1f; border-radius: 6px; padding: 2px; }
  .time-btn { padding: 6px 12px; border: none; background: none; color: #999; font-size: 12px; border-radius: 4px; cursor: pointer; }
  .time-btn.active { background: #6366f1; color: white; }
  .export-btn { padding: 8px 16px; background: #404040; color: #e0e0e0; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
  .close-btn { background: none; border: none; color: #999; cursor: pointer; font-size: 24px; }
  .modal-body { flex: 1; display: flex; overflow: hidden; }
  .sidebar { width: 280px; border-right: 1px solid #404040; overflow-y: auto; }
  .sidebar-header { padding: 16px; border-bottom: 1px solid #404040; font-size: 13px; font-weight: 500; color: #b0b0b0; }
  .keyword-list { }
  .keyword-item { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #333; transition: background 0.15s; display: flex; align-items: center; gap: 12px; }
  .keyword-item:hover { background: #2f2f2f; }
  .keyword-item.active { background: #6366f1; }
  .keyword-icon { font-size: 16px; }
  .keyword-text { flex: 1; font-size: 13px; }
  .keyword-position { font-size: 12px; color: #999; }
  .chart-area { flex: 1; padding: 20px; display: flex; flex-direction: column; }
  .chart-header { margin-bottom: 20px; }
  .keyword-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
  .stats-row { display: flex; gap: 24px; }
  .stat-box { }
  .stat-label { font-size: 11px; color: #999; margin-bottom: 4px; }
  .stat-value { font-size: 24px; font-weight: 600; }
  .stat-value.current { color: #6366f1; }
  .stat-value.change { color: #22c55e; }
  .stat-value.change.negative { color: #ef4444; }
  .chart-container { flex: 1; background: #1f1f1f; border: 1px solid #404040; border-radius: 8px; padding: 20px; position: relative; }
  .chart-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #666; font-size: 14px; }
  .axis-label { position: absolute; font-size: 11px; color: #666; }
  .axis-label.y { left: 0; top: 50%; transform: rotate(-90deg) translateX(-50%); }
  .axis-label.x { bottom: 0; left: 50%; transform: translateX(-50%); }
</style>
</head>
<body>
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Position History</h2>
        <div class="header-actions">
          <div class="time-range" data-element-id="time-range">
            <button class="time-btn" data-element-id="7d">7D</button>
            <button class="time-btn active" data-element-id="30d">30D</button>
            <button class="time-btn" data-element-id="90d">90D</button>
            <button class="time-btn" data-element-id="all">All</button>
          </div>
          <button class="export-btn" data-element-id="export-csv">📥 Export CSV</button>
          <button class="close-btn" data-element-id="close-modal">×</button>
        </div>
      </div>
      
      <div class="modal-body">
        <div class="sidebar">
          <div class="sidebar-header">Keywords (5)</div>
          <div class="keyword-list">
            <div class="keyword-item active" data-element-id="keyword-1">
              <span class="keyword-icon">🔍</span>
              <span class="keyword-text">best coffee shops</span>
              <span class="keyword-position">#12</span>
            </div>
            <div class="keyword-item" data-element-id="keyword-2">
              <span class="keyword-icon">🔍</span>
              <span class="keyword-text">coffee beans online</span>
              <span class="keyword-position">#7</span>
            </div>
            <div class="keyword-item" data-element-id="keyword-3">
              <span class="keyword-icon">🔍</span>
              <span class="keyword-text">espresso machine</span>
              <span class="keyword-position">#23</span>
            </div>
            <div class="keyword-item" data-element-id="keyword-4">
              <span class="keyword-icon">🔍</span>
              <span class="keyword-text">coffee grinder</span>
              <span class="keyword-position">#15</span>
            </div>
            <div class="keyword-item" data-element-id="keyword-5">
              <span class="keyword-icon">🔍</span>
              <span class="keyword-text">french press</span>
              <span class="keyword-position">#9</span>
            </div>
          </div>
        </div>
        
        <div class="chart-area">
          <div class="chart-header">
            <div class="keyword-title">best coffee shops</div>
            <div class="stats-row">
              <div class="stat-box">
                <div class="stat-label">Current Position</div>
                <div class="stat-value current">#12</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Change (30d)</div>
                <div class="stat-value change">+5</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Best Position</div>
                <div class="stat-value">#7</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Average</div>
                <div class="stat-value">#14.3</div>
              </div>
            </div>
          </div>
          
          <div class="chart-container">
            <div class="axis-label y">Position (Lower is Better)</div>
            <div class="axis-label x">Date</div>
            <div class="chart-placeholder">
              📈 Line chart showing position over time<br>
              (Inverted Y-axis: #1 at top, #100 at bottom)<br>
              Markers for significant changes<br>
              Hover tooltips with exact position and date
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## Flow 7: Tab Pool Configuration

**Description:** Configure and monitor tab pool for optimal performance with full visibility and control.

**Trigger:** User opens Settings Panel and navigates to Performance section.

**Steps:**

1. User clicks "Settings" button in bottom toolbar
2. Settings Panel opens
3. User clicks "Performance" tab/section
4. Tab Pool settings section shows:
   - Enable/disable tab pool toggle
   - Minimum pool size slider (0-10, default 3)
   - Maximum pool size slider (5-20, default 10)
   - Warm-up delay slider (50-500ms, default 100ms)
5. Real-time status display shows:
   - Pool status: "Active" or "Disabled"
   - Current pool size: "5 tabs ready"
   - Memory usage: "~150MB reserved"
6. "Warm Up Pool Now" button to manually pre-create tabs
7. "Drain Pool" button to release all pooled tabs
8. User adjusts sliders
9. Changes apply immediately
10. Stats Panel shows tab pool metrics:
    - Pool hit rate (% of tabs from pool vs. created fresh)
    - Average tab creation time
    - Pool efficiency graph

**Exit:** User has full control over tab pool behavior and can see performance impact.

### Wireframe: Tab Pool Settings

```wireframe
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
  .panel { background: #2a2a2a; border: 1px solid #404040; border-radius: 12px; width: 320px; max-height: 600px; overflow-y: auto; }
  .panel-header { padding: 16px; border-bottom: 1px solid #404040; }
  .panel-title { font-size: 16px; font-weight: 600; }
  .tabs { display: flex; border-bottom: 1px solid #404040; }
  .tab { flex: 1; padding: 12px; text-align: center; font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
  .tab.active { border-bottom-color: #6366f1; color: #6366f1; }
  .section { padding: 16px; }
  .section-title { font-size: 14px; font-weight: 500; margin-bottom: 16px; color: #b0b0b0; }
  .setting-group { margin-bottom: 24px; }
  .setting-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .setting-label { font-size: 14px; font-weight: 500; }
  .toggle { width: 44px; height: 24px; background: #404040; border-radius: 12px; position: relative; cursor: pointer; transition: background 0.2s; }
  .toggle.on { background: #22c55e; }
  .toggle-knob { width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: left 0.2s; }
  .toggle.on .toggle-knob { left: 22px; }
  .slider-group { margin-top: 12px; }
  .slider-label { font-size: 12px; color: #999; margin-bottom: 8px; display: block; }
  .slider { width: 100%; }
  .slider-value { font-size: 12px; color: #6366f1; margin-top: 4px; text-align: right; }
  .status-box { background: #1f1f1f; border: 1px solid #404040; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
  .status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; }
  .status-row:last-child { margin-bottom: 0; }
  .status-label { color: #999; }
  .status-value { font-weight: 500; }
  .status-value.active { color: #22c55e; }
  .status-value.disabled { color: #ef4444; }
  .btn-group { display: flex; gap: 8px; }
  .btn { flex: 1; padding: 10px; background: #404040; color: #e0e0e0; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; transition: background 0.2s; }
  .btn:hover { background: #4a4a4a; }
  .btn.primary { background: #6366f1; }
  .btn.primary:hover { background: #5558e3; }
  .help-text { font-size: 11px; color: #666; margin-top: 8px; line-height: 1.4; }
</style>
</head>
<body>
  <div class="panel">
    <div class="panel-header">
      <h2 class="panel-title">Settings</h2>
    </div>
    
    <div class="tabs">
      <div class="tab">General</div>
      <div class="tab active">Performance</div>
      <div class="tab">Privacy</div>
    </div>
    
    <div class="section">
      <div class="section-title">Tab Pool</div>
      
      <div class="setting-group">
        <div class="setting-header">
          <span class="setting-label">Enable Tab Pool</span>
          <div class="toggle on" data-element-id="tab-pool-toggle">
            <div class="toggle-knob"></div>
          </div>
        </div>
        <div class="help-text">
          Pre-creates tabs for faster automation. Improves tab creation speed by up to 5x.
        </div>
      </div>
      
      <div class="status-box">
        <div class="status-row">
          <span class="status-label">Pool Status</span>
          <span class="status-value active">Active</span>
        </div>
        <div class="status-row">
          <span class="status-label">Ready Tabs</span>
          <span class="status-value">5 / 10</span>
        </div>
        <div class="status-row">
          <span class="status-label">Memory Reserved</span>
          <span class="status-value">~150 MB</span>
        </div>
      </div>
      
      <div class="setting-group">
        <div class="slider-group">
          <label class="slider-label">Minimum Pool Size</label>
          <input type="range" min="0" max="10" value="3" class="slider" data-element-id="min-pool-slider">
          <div class="slider-value">3 tabs</div>
        </div>
        <div class="help-text">
          Minimum number of tabs to keep ready. Higher values use more memory but ensure instant availability.
        </div>
      </div>
      
      <div class="setting-group">
        <div class="slider-group">
          <label class="slider-label">Maximum Pool Size</label>
          <input type="range" min="5" max="20" value="10" class="slider" data-element-id="max-pool-slider">
          <div class="slider-value">10 tabs</div>
        </div>
        <div class="help-text">
          Maximum pool size. Pool grows to this size during heavy usage.
        </div>
      </div>
      
      <div class="setting-group">
        <div class="slider-group">
          <label class="slider-label">Warm-up Delay</label>
          <input type="range" min="50" max="500" value="100" step="50" class="slider" data-element-id="warmup-slider">
          <div class="slider-value">100 ms</div>
        </div>
        <div class="help-text">
          Delay between creating pooled tabs. Lower values fill pool faster but may cause CPU spikes.
        </div>
      </div>
      
      <div class="btn-group">
        <button class="btn primary" data-element-id="warmup-btn">Warm Up Now</button>
        <button class="btn" data-element-id="drain-btn">Drain Pool</button>
      </div>
    </div>
    
    <div class="section" style="border-top: 1px solid #404040;">
      <div class="section-title">Performance Metrics</div>
      
      <div class="status-box">
        <div class="status-row">
          <span class="status-label">Pool Hit Rate</span>
          <span class="status-value">87.3%</span>
        </div>
        <div class="status-row">
          <span class="status-label">Avg Creation Time</span>
          <span class="status-value">92 ms</span>
        </div>
        <div class="status-row">
          <span class="status-label">Tabs Created Today</span>
          <span class="status-value">247</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## Summary

These seven user flows provide complete interaction patterns for v1.4.0's performance and control features:

1. **Bulk Proxy Import** - Eliminates tedious one-by-one proxy addition
2. **Dynamic Proxy Assignment** - Per-tab proxy control during runtime
3. **Automation Pause/Resume** - Full session control without losing progress
4. **Tab Suspension** - Automatic + manual memory optimization
5. **Privacy Statistics** - Real-time visibility into protection effectiveness
6. **Position History** - Comprehensive SERP ranking trend analysis
7. **Tab Pool Configuration** - Full control over performance optimization

Each flow is designed for power users running heavy automation workloads, with emphasis on:
- **Discoverability**: Features are easy to find when needed
- **Efficiency**: Minimal clicks for frequent operations
- **Transparency**: Clear feedback on what's happening
- **Control**: Users can override automatic behavior
- **Performance**: Optimized for 50+ concurrent tabs

The flows integrate seamlessly into the existing UI patterns (bottom toolbar → side panels, dropdown menus, modals) while adding the advanced capabilities needed for production-ready automation at scale.