# CAPTCHA Handling Strategy

## Overview

The Virtual IP Browser includes a comprehensive CAPTCHA detection system that automatically identifies and handles various captcha challenges during automation. This document outlines the detection strategies, configuration options, and best practices for captcha handling.

## Supported CAPTCHA Types

### 1. Google reCAPTCHA v2
- **Detection Method**: iframe src, `.g-recaptcha` class, `data-sitekey` attribute
- **Confidence**: High (90-95%)
- **Challenge Type**: Checkbox or image selection

### 2. Google reCAPTCHA v3
- **Detection Method**: Script source, `.grecaptcha-badge` class
- **Confidence**: High (85-95%)
- **Challenge Type**: Invisible (score-based)

### 3. hCaptcha
- **Detection Method**: iframe src, `.h-captcha` class, `data-hcaptcha-sitekey` attribute
- **Confidence**: High (85-95%)
- **Challenge Type**: Image selection or checkbox

### 4. Cloudflare Turnstile
- **Detection Method**: iframe src (challenges.cloudflare.com), `.cf-turnstile` class
- **Confidence**: High (85-95%)
- **Challenge Type**: Invisible or interactive challenge

### 5. Cloudflare Challenge Pages
- **Detection Method**: Text content ("Checking your browser"), `#challenge-form`
- **Confidence**: Medium-High (70-90%)
- **Challenge Type**: Browser verification page

### 6. Image CAPTCHAs
- **Detection Method**: Image src containing "captcha", input fields with captcha names
- **Confidence**: Medium (60-75%)
- **Challenge Type**: Text recognition from image

### 7. Slider CAPTCHAs
- **Detection Method**: `.slider-captcha`, `.geetest_slider` classes
- **Confidence**: Medium-High (75-90%)
- **Challenge Type**: Drag-to-complete puzzle

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAPTCHA Detection Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Page Load/Navigation                                            │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │ CaptchaDetector │◄─────── Detection Strategies               │
│  │    .scan()      │         (sorted by priority)               │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │ Pattern Match?  │────►│  No Captcha     │                    │
│  └────────┬────────┘ No  │  Continue       │                    │
│           │ Yes          └─────────────────┘                    │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Emit Event      │                                            │
│  │ captcha:detected│                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Determine Action│                                            │
│  │ (based on config│                                            │
│  │  and confidence)│                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│     ┌─────┼─────┬─────────┐                                     │
│     ▼     ▼     ▼         ▼                                     │
│  [Pause] [Alert] [Skip] [Manual]                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Detection

```typescript
import { CaptchaDetector } from './electron/core/automation';

const detector = new CaptchaDetector();

// Listen for captcha events
detector.on('captcha:detected', (event) => {
  console.log(`Captcha detected: ${event.result.type}`);
  console.log(`Confidence: ${event.result.confidence}`);
  console.log(`Action: ${event.action}`);
});

// Scan a page
const result = await detector.scan(webContents, 'https://example.com');
if (result.detected) {
  console.log(`Found ${result.type} captcha at ${result.selector}`);
}
```

### Continuous Monitoring

```typescript
// Start monitoring a tab
detector.startMonitoring(tabId, webContents, url);

// Listen for pause events
detector.on('automation:pause', ({ tabId, reason, result }) => {
  console.log(`Automation paused on tab ${tabId}: ${reason}`);
  // Handle pause - maybe show notification to user
});

// Resume after captcha is solved
detector.on('captcha:resolved', ({ tabId }) => {
  console.log(`Captcha resolved, automation resumed on ${tabId}`);
});

// Stop monitoring when done
detector.stopMonitoring(tabId);
```

### Custom Detection Strategies

```typescript
const customStrategy = {
  id: 'custom-captcha-provider',
  name: 'Custom CAPTCHA Provider',
  type: 'unknown' as CaptchaType,
  enabled: true,
  priority: 150, // Higher priority = checked first
  patterns: [
    { 
      type: 'selector', 
      value: '.my-captcha-widget', 
      isRegex: false, 
      confidence: 0.9 
    },
    { 
      type: 'script', 
      value: 'my-captcha-provider.com/api.js', 
      isRegex: false, 
      confidence: 0.85 
    }
  ]
};

detector.addStrategy(customStrategy);
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  enabled: true,
  checkInterval: 2000,      // ms between scans during monitoring
  defaultAction: 'pause',   // Action when captcha detected
  maxAttempts: 3,           // Max detection attempts
  timeout: 30000,           // Scan timeout in ms
  logging: true,            // Enable logging
  alertConfig: {
    desktopNotification: true,
    soundAlert: false,
    inAppAlert: true,
    minSeverity: 'medium'
  }
};
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable detection |
| `checkInterval` | number | 2000 | Interval between monitoring scans (ms) |
| `defaultAction` | CaptchaAction | 'pause' | Default action on detection |
| `maxAttempts` | number | 3 | Maximum retry attempts |
| `timeout` | number | 30000 | Scan timeout (ms) |
| `logging` | boolean | true | Enable debug logging |

### Action Types

| Action | Description |
|--------|-------------|
| `pause` | Pause automation, wait for manual resolution |
| `alert` | Show alert but continue automation |
| `skip` | Skip the current page/task |
| `retry` | Retry after a delay |
| `manual` | Require manual intervention |
| `abort` | Abort the current automation session |

## Integration with Tab Automation

The captcha detector integrates with the automation system to pause tasks when captchas are detected:

```typescript
import { AutomationManager, CaptchaDetector } from './electron/core/automation';

const automationManager = new AutomationManager(db);
const captchaDetector = new CaptchaDetector();

// Integration
captchaDetector.on('automation:pause', ({ tabId }) => {
  const session = automationManager.getSessionByTab(tabId);
  if (session) {
    automationManager.pauseSession(session.id);
  }
});

captchaDetector.on('automation:resume', ({ tabId }) => {
  const session = automationManager.getSessionByTab(tabId);
  if (session) {
    automationManager.resumeSession(session.id);
  }
});
```

## Statistics and Monitoring

```typescript
// Get detection statistics
const stats = detector.getStats();
console.log(`Total detections: ${stats.totalDetections}`);
console.log(`Average detection time: ${stats.avgDetectionTime}ms`);
console.log(`Detections by type:`, stats.byType);
console.log(`Detections by domain:`, stats.byDomain);

// Reset statistics
detector.resetStats();
```

## Best Practices

### 1. Minimize False Positives
- Use high-confidence patterns first
- Combine multiple detection methods
- Test patterns against known sites

### 2. Handle Detection Gracefully
- Always listen for detection events
- Provide user feedback when paused
- Allow manual override options

### 3. Respect Rate Limits
- Don't scan too frequently (default 2s interval)
- Consider site-specific detection intervals
- Monitor for ban patterns

### 4. Privacy Considerations
- Don't send captcha data to external services
- Log detections locally only
- Allow users to disable detection

## Troubleshooting

### Captcha Not Detected
1. Check if detection is enabled
2. Verify the captcha type is supported
3. Add custom strategy if needed
4. Check browser console for errors

### False Positives
1. Reduce confidence threshold for problematic patterns
2. Disable specific strategies
3. Add exclusion patterns for known false positives

### Performance Issues
1. Increase check interval
2. Disable unused strategies
3. Use specific strategy filters when scanning

## API Reference

See [CODEMAPS/automation.md](./CODEMAPS/automation.md) for complete API documentation.

## Related Documentation

- [Automation Guide](./CODEMAPS/automation.md)
- [Security Documentation](./SECURITY_CONSOLIDATED.md)
- [Architecture Overview](./ARCHITECTURE.md)
