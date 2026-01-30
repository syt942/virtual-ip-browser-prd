/**
 * Settings Panel - Placeholder
 */

export function SettingsPanel() {
  return (
    <div className="p-4" data-testid="settings-panel">
      <h2 className="text-lg font-semibold mb-4" data-testid="settings-panel-title">Settings</h2>
      <p className="text-sm text-muted-foreground" data-testid="settings-placeholder">Application settings will be displayed here.</p>
    </div>
  );
}
