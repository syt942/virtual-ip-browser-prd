# Project Requirements Document (PRD)
# Virtual IP Browser - Enhanced Privacy-Focused Browser
# DETAILED SPECIFICATION DOCUMENT

---

## Document Information

| Field | Value |
|-------|-------|
| **Project Name** | Virtual IP Browser - Enhanced Edition |
| **Document Version** | 2.0.0 |
| **Date Created** | 2026-01-27 |
| **Last Updated** | 2026-01-27 |
| **Prepared By** | Development Team |
| **Status** | Detailed Specification |
| **Document Type** | Comprehensive PRD |
| **Confidentiality** | Internal Use Only |

---

## Document Control

### Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-01-27 | Dev Team | Initial PRD draft |
| 2.0.0 | 2026-01-27 | Dev Team | Detailed specification with user stories, API specs, wireframes |

### Approval Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | _______________ | _______________ | _______________ |
| Technical Lead | _______________ | _______________ | _______________ |
| UX Lead | _______________ | _______________ | _______________ |
| QA Lead | _______________ | _______________ | _______________ |

### Distribution List

| Name | Role | Department |
|------|------|------------|
| TBD | Product Manager | Product |
| TBD | Engineering Lead | Engineering |
| TBD | UX Designer | Design |
| TBD | QA Engineer | Quality Assurance |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Goals and Objectives](#3-goals-and-objectives)
4. [Target Audience and User Personas](#4-target-audience-and-user-personas)
5. [User Stories and Acceptance Criteria](#5-user-stories-and-acceptance-criteria)
6. [Core Features - Detailed Specifications](#6-core-features---detailed-specifications)
7. [Technical Architecture](#7-technical-architecture)
8. [API Specifications](#8-api-specifications)
9. [Data Models and Database Schema](#9-data-models-and-database-schema)
10. [User Interface Specifications](#10-user-interface-specifications)
11. [Functional Requirements](#11-functional-requirements)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Security Requirements](#13-security-requirements)
14. [Testing Requirements](#14-testing-requirements)
15. [Development Roadmap](#15-development-roadmap)
16. [Risk Assessment and Mitigation](#16-risk-assessment-and-mitigation)
17. [Success Metrics and KPIs](#17-success-metrics-and-kpis)
18. [Appendices](#18-appendices)

---

## 1. Executive Summary

### 1.1 Project Vision

Virtual IP Browser is a next-generation, privacy-focused Electron-based desktop browser designed to provide users with unprecedented control over their online identity and browsing privacy. The browser combines advanced proxy management, fingerprint spoofing, tracker blocking, and automation capabilities into a seamless, user-friendly experience.

### 1.2 Business Case

#### 1.2.1 Market Opportunity

The global privacy browser market is experiencing significant growth due to:
- Increasing awareness of online privacy concerns
- Growing demand for anti-fingerprinting solutions
- Rising need for web automation tools
- Expansion of SEO and digital marketing industries

#### 1.2.2 Competitive Analysis

| Competitor | Strengths | Weaknesses | Our Advantage |
|------------|-----------|------------|---------------|
| **Multilogin** | Established brand, browser profiles | Expensive, limited automation | Full automation engine, lower cost |
| **GoLogin** | Good fingerprinting, affordable | Limited proxy rotation | 10+ rotation strategies |
| **Kameleo** | Mobile emulation | Complex UI | Intuitive interface |
| **Brave** | Privacy-focused, mainstream | No proxy management | Per-tab proxy isolation |
| **Tor Browser** | Strong anonymity | Slow, limited features | Speed + full feature set |

#### 1.2.3 Value Proposition

1. **All-in-One Solution**: Combines proxy management, privacy protection, and automation
2. **Cost Effective**: Single tool replaces multiple subscriptions
3. **User Friendly**: Complex features with simple interface
4. **Fully Autonomous**: Set-and-forget automation capabilities
5. **Open Architecture**: Extensible and customizable

### 1.3 Key Value Propositions (Detailed)

#### 1.3.1 Ultimate Privacy
- **Multi-layered Protection**: WebRTC leak prevention, fingerprint spoofing, tracker blocking
- **Zero Data Collection**: No telemetry, no analytics, no user tracking
- **Complete Anonymity**: Each tab presents unique identity to websites
- **Military-Grade Security**: Encrypted storage, secure IPC, sandboxed processes

#### 1.3.2 Proxy Mastery
- **10+ Rotation Strategies**: From simple round-robin to AI-powered selection
- **Health Monitoring**: Real-time proxy status with automatic failover
- **Per-Tab Isolation**: Different proxy per tab with no cross-contamination
- **Protocol Support**: HTTP, HTTPS, SOCKS4, SOCKS5 with authentication

#### 1.3.3 Automation Power
- **Parallel Execution**: Up to 50 concurrent isolated tabs
- **Human-Like Behavior**: Randomized timing, natural mouse movements
- **Self-Healing**: Automatic error recovery and retry logic
- **Scheduling**: One-time, recurring, continuous, and cron-based schedules

#### 1.3.4 Tab Isolation
- **Session Partitioning**: Each tab has isolated cookies, storage, cache
- **Fingerprint Uniqueness**: Different fingerprint per tab
- **Resource Management**: Memory-aware tab creation and lifecycle
- **No Data Leakage**: Complete separation between tabs

### 1.4 Target Market Segments

| Segment | Size Estimate | Revenue Potential | Priority |
|---------|---------------|-------------------|----------|
| Privacy Advocates | 500K+ users | Medium | High |
| SEO Professionals | 200K+ users | High | High |
| Web Automation Engineers | 100K+ users | High | High |
| Security Researchers | 50K+ users | Medium | Medium |
| Content Creator Supporters | 1M+ users | Medium | Medium |
| QA/Testing Teams | 100K+ users | High | Medium |

### 1.5 Project Scope

#### 1.5.1 In Scope
- Desktop application for Windows, macOS, Linux
- Core browser functionality with Chromium engine
- Proxy management with 10+ rotation strategies
- Privacy protection suite (fingerprint, WebRTC, trackers)
- Tab isolation with session partitioning
- Search automation engine
- Domain targeting system
- Creator support module
- Translation integration
- Chrome extension support
- Session persistence and templates

#### 1.5.2 Out of Scope (Phase 1)
- Password manager
- Social media automation

#### 1.5.3 Future Considerations (Phase 2+)
- Team/Enterprise features
- API for programmatic access
- Marketplace for automation scripts
- Community-contributed blocklists

---

## 2. Project Overview

### 2.1 Product Description

Virtual IP Browser is an Electron-based desktop application that combines the power of Chromium with advanced privacy protection and automation features. It provides users with complete control over their browsing identity through sophisticated proxy management, fingerprint spoofing, and session isolation.

### 2.2 Problem Statement

#### 2.2.1 Current Market Pain Points

| Pain Point | Description | Impact | Our Solution |
|------------|-------------|--------|--------------|
| **IP Tracking** | Websites track users via IP address | Privacy violation | Per-tab proxy isolation |
| **Browser Fingerprinting** | Unique device identification | Cross-site tracking | Multi-vector fingerprint spoofing |
| **WebRTC Leaks** | Real IP exposed through WebRTC | Proxy bypass | 100% leak prevention |
| **Manual Automation** | Repetitive browsing tasks | Time waste | Autonomous execution engine |
| **Session Contamination** | Shared cookies between tabs | Identity linkage | Complete session isolation |
| **Proxy Management** | Complex proxy switching | Productivity loss | Intelligent rotation strategies |
| **Creator Support** | Manual ad viewing | Time constraints | Automated ethical support |

#### 2.2.2 User Frustrations

1. **Privacy Users**: "I use a VPN but websites still track me through fingerprinting"
2. **SEO Professionals**: "I need to check rankings from different locations but keep getting blocked"
3. **Automation Engineers**: "Managing proxies and sessions across multiple tools is a nightmare"
4. **Security Researchers**: "I need isolated sessions that don't contaminate each other"
5. **Creator Supporters**: "I want to support my favorite creators but don't have time to watch all ads"

### 2.3 Solution Overview

Virtual IP Browser addresses these gaps by providing:

#### 2.3.1 Unified Privacy Platform
- Single application for all privacy and automation needs
- Seamless integration between features
- Consistent user experience across all modules

#### 2.3.2 Technical Innovation
- Per-tab proxy isolation with Electron's session partitioning
- Multi-vector fingerprint spoofing using preload scripts
- Autonomous execution engine with self-healing capabilities
- Real-time proxy health monitoring with intelligent failover

#### 2.3.3 User-Centric Design
- Progressive disclosure: Simple by default, advanced on demand
- Real-time feedback for all operations
- Comprehensive but accessible documentation
- Keyboard shortcuts for power users

### 2.4 Success Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| Privacy Effectiveness | 100% leak prevention | Automated testing |
| Automation Reliability | >98% success rate | Task completion logs |
| User Satisfaction | >4.5/5 rating | User surveys |
| Performance | <3s launch, <200MB/tab | Performance metrics |
| Adoption | 10K+ active users (Year 1) | Analytics |

---

## 3. Goals and Objectives

### 3.1 Primary Goals

#### Goal 1: Privacy First
**Description**: Provide military-grade privacy protection for all browsing activities

**Objectives**:
- Achieve 100% WebRTC leak prevention
- Implement 5+ fingerprint spoofing vectors
- Block 95%+ of known trackers
- Ensure zero cross-tab data leakage

**Success Metrics**:
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| WebRTC Leak Prevention | 100% | - | Planned |
| Fingerprint Vectors | 5+ | - | Planned |
| Tracker Block Rate | >95% | - | Planned |
| Tab Isolation | 100% | - | Planned |

#### Goal 2: Automation Excellence
**Description**: Enable fully autonomous web automation with zero user intervention

**Objectives**:
- Support up to 50 concurrent automated tabs
- Implement human-like behavior simulation
- Achieve >98% automation success rate
- Provide 4 schedule types for autonomous execution

**Success Metrics**:
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Concurrent Tabs | 50 | - | Planned |
| Success Rate | >98% | - | Planned |
| Error Recovery | >95% | - | Planned |
| Schedule Types | 4 | - | Planned |

#### Goal 3: Performance
**Description**: Maintain smooth performance even with heavy usage

**Objectives**:
- Launch application in under 3 seconds
- Create new tabs in under 500ms
- Keep memory usage under 200MB per tab average
- Maintain UI responsiveness under 100ms

**Success Metrics**:
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Launch Time | <3s | - | Planned |
| Tab Creation | <500ms | - | Planned |
| Memory/Tab | <200MB | - | Planned |
| UI Response | <100ms | - | Planned |

#### Goal 4: User Experience
**Description**: Deliver intuitive UI/UX despite complex underlying functionality

**Objectives**:
- Achieve WCAG 2.1 AA accessibility compliance
- Implement progressive disclosure for advanced features
- Provide immediate visual feedback for all actions
- Support keyboard shortcuts for common operations

**Success Metrics**:
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Accessibility | WCAG 2.1 AA | - | Planned |
| User Satisfaction | >4.5/5 | - | Planned |
| Feature Discovery | >80% | - | Planned |
| Task Completion | >95% | - | Planned |

#### Goal 5: Extensibility
**Description**: Build modular architecture for easy feature additions

**Objectives**:
- Design plugin-friendly architecture
- Support Chrome extension loading
- Enable custom automation scripts
- Provide configuration import/export

**Success Metrics**:
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Extension Support | Manifest v2/v3 | - | Planned |
| Module Separation | >90% | - | Planned |
| API Coverage | >80% | - | Planned |
| Config Portability | 100% | - | Planned |

### 3.2 Secondary Goals

| Goal | Description | Priority |
|------|-------------|----------|
| Cross-Platform | Support Windows, macOS, Linux equally | High |
| Localization | Support 10+ languages | Medium |
| Documentation | Comprehensive user and developer docs | High |
| Community | Build active user community | Medium |
| Monetization | Sustainable business model | Medium |

### 3.3 Key Performance Indicators (KPIs)

#### 3.3.1 Privacy KPIs

| KPI | Description | Target | Frequency |
|-----|-------------|--------|-----------|
| Leak Prevention Rate | % of WebRTC leak attempts blocked | 100% | Real-time |
| Fingerprint Uniqueness | % of unique fingerprints per session | >99% | Per session |
| Tracker Block Rate | % of tracker requests blocked | >95% | Real-time |
| Privacy Score | Composite privacy effectiveness score | >95/100 | Daily |

#### 3.3.2 Performance KPIs

| KPI | Description | Target | Frequency |
|-----|-------------|--------|-----------|
| App Launch Time | Time from click to ready | <3s | Per launch |
| Tab Creation Time | Time to create new isolated tab | <500ms | Per tab |
| Memory Efficiency | Average memory per tab | <200MB | Real-time |
| CPU Idle Usage | CPU usage when idle | <5% | Real-time |

#### 3.3.3 Automation KPIs

| KPI | Description | Target | Frequency |
|-----|-------------|--------|-----------|
| Task Success Rate | % of automation tasks completed | >98% | Per task |
| Error Recovery Rate | % of errors successfully recovered | >95% | Per error |
| Automation Uptime | % time automation runs without issues | >99% | Daily |
| Average Task Duration | Time to complete standard task | <10s | Per task |

#### 3.3.4 User Experience KPIs

| KPI | Description | Target | Frequency |
|-----|-------------|--------|-----------|
| User Satisfaction Score | Average user rating | >4.5/5 | Monthly |
| Feature Adoption Rate | % users using each feature | >60% | Monthly |
| Task Completion Rate | % of started tasks completed | >95% | Per session |
| Support Ticket Volume | Number of support requests | <5% of users | Weekly |

---

## 4. Target Audience and User Personas

### 4.1 Primary User Personas

#### Persona 1: Privacy Advocate "Alex"

**Demographics**
| Attribute | Value |
|-----------|-------|
| Age | 28-45 |
| Occupation | Software Developer / IT Professional |
| Technical Level | High |
| Location | Global (US, EU, Asia) |
| Income | $60K-$120K |

**Profile**
Alex is a tech-savvy individual deeply concerned about online privacy. They understand how tracking works and actively seek tools to protect their digital identity. They've tried various privacy tools but find them lacking in either effectiveness or usability.

**Goals**
- Browse the internet without being tracked or fingerprinted
- Prevent WebRTC leaks when using VPNs/proxies
- Maintain different online identities for different purposes
- Access geo-restricted content securely

**Frustrations**
- "Existing browsers leak my real IP through WebRTC"
- "Fingerprinting defeats my VPN and proxy setups"
- "I can't maintain separate browsing identities easily"
- "Privacy tools are either too complex or too basic"

**Use Cases**
1. Anonymous browsing for sensitive research
2. Secure communications without tracking
3. Testing website privacy policies
4. Accessing region-locked content

**Feature Priorities**
| Feature | Priority |
|---------|----------|
| WebRTC Leak Prevention | Must Have |
| Fingerprint Spoofing | Must Have |
| Per-Tab Proxy | Must Have |
| Tracker Blocking | Must Have |
| Session Isolation | Should Have |

**User Journey**
```
Discovery → Download → First Launch → Configure Privacy Settings → 
Browse Anonymously → Verify Protection → Regular Use → Recommend to Others
```

---

#### Persona 2: SEO Professional "Jordan"

**Demographics**
| Attribute | Value |
|-----------|-------|
| Age | 25-40 |
| Occupation | SEO Specialist / Digital Marketer |
| Technical Level | Medium-High |
| Location | Global |
| Income | $50K-$100K |

**Profile**
Jordan works at a digital marketing agency and needs to track search rankings for multiple clients across different locations. They spend hours manually checking SERPs and managing proxy rotations to avoid IP blocks.

**Goals**
- Automate rank tracking across multiple search engines
- Check search results from different geographic locations
- Avoid IP blocks and captchas
- Generate reports for clients efficiently

**Frustrations**
- "Manual rank checking takes hours every day"
- "I get blocked constantly when checking rankings"
- "Managing proxies across different tools is a nightmare"
- "I need accurate position data from multiple locations"

**Use Cases**
1. Automated keyword rank tracking
2. Competitor SERP analysis
3. Local SEO verification
4. Search result extraction and logging

**Feature Priorities**
| Feature | Priority |
|---------|----------|
| Search Automation | Must Have |
| Proxy Rotation | Must Have |
| Position Tracking | Must Have |
| Bulk Keywords | Must Have |
| Result Export | Should Have |

**User Journey**
```
Need Identified → Evaluate Tools → Trial Download → Configure Proxies → 
Import Keywords → Run First Search → Review Results → Scale Usage → Client Reports
```

---

#### Persona 3: Web Automation Engineer "Sam"

**Demographics**
| Attribute | Value |
|-----------|-------|
| Age | 25-35 |
| Occupation | Software Developer / Automation Engineer |
| Technical Level | Very High |
| Location | Global |
| Income | $80K-$150K |

**Profile**
Sam builds web automation workflows for data collection and testing. They're proficient with tools like Puppeteer and Playwright but need a solution that handles proxy management and anti-detection out of the box.

**Goals**
- Build reliable web scraping workflows
- Avoid bot detection and rate limiting
- Manage multiple concurrent sessions
- Handle proxy rotation automatically

**Frustrations**
- "Setting up anti-detection is time-consuming"
- "Managing proxies in code is error-prone"
- "Session isolation requires complex setup"
- "I need to handle failures gracefully"

**Use Cases**
1. Large-scale web scraping
2. Automated testing with different identities
3. Data collection from multiple sources
4. Performance testing with geographic distribution

**Feature Priorities**
| Feature | Priority |
|---------|----------|
| Tab Isolation | Must Have |
| Proxy Management | Must Have |
| Parallel Execution | Must Have |
| Error Recovery | Must Have |
| Fingerprint Spoofing | Should Have |

**User Journey**
```
Requirement Analysis → Tool Evaluation → POC Development → 
Configure Automation → Test at Scale → Production Deployment → Maintenance
```

---

#### Persona 4: Content Creator Supporter "Casey"

**Demographics**
| Attribute | Value |
|-----------|-------|
| Age | 18-35 |
| Occupation | Various (Student, Professional) |
| Technical Level | Low-Medium |
| Location | Global |
| Income | $30K-$80K |

**Profile**
Casey loves watching content from their favorite creators and wants to support them by viewing ads. However, they don't always have time to watch all the content and feel guilty about using ad blockers.

**Goals**
- Support favorite creators without spending money
- Automate ad viewing ethically
- Track support history
- Discover new creators to support

**Frustrations**
- "I want to support creators but don't have time"
- "I feel bad using ad blockers"
- "Manual ad viewing is tedious"
- "I can't track how much I've supported"

**Use Cases**
1. Automated ad viewing on YouTube
2. Supporting multiple creators in parallel
3. Tracking support statistics
4. Scheduled creator support sessions

**Feature Priorities**
| Feature | Priority |
|---------|----------|
| Creator Management | Must Have |
| Ad Viewing Automation | Must Have |
| Support Statistics | Should Have |
| Scheduling | Should Have |
| Platform Detection | Should Have |

**User Journey**
```
Hear About Tool → Download → Add Creators → Configure Support → 
Start Automation → Monitor Progress → View Statistics → Add More Creators
```

---

#### Persona 5: Security Researcher "Morgan"

**Demographics**
| Attribute | Value |
|-----------|-------|
| Age | 28-45 |
| Occupation | Security Analyst / Penetration Tester |
| Technical Level | Very High |
| Location | Global |
| Income | $90K-$160K |

**Profile**
Morgan performs security assessments and penetration testing. They need isolated browser sessions that don't contaminate each other and the ability to present different fingerprints to test anti-bot systems.

**Goals**
- Test web application security
- Evaluate anti-fingerprinting effectiveness
- Maintain isolated testing sessions
- Simulate different user profiles

**Frustrations**
- "Session contamination invalidates my tests"
- "I need to test from different fingerprints"
- "Manual session management is tedious"
- "I need detailed logging for reports"

**Use Cases**
1. Web application security testing
2. Anti-bot system evaluation
3. Fingerprint consistency testing
4. Session isolation verification

**Feature Priorities**
| Feature | Priority |
|---------|----------|
| Session Isolation | Must Have |
| Fingerprint Variation | Must Have |
| Detailed Logging | Must Have |
| Proxy Control | Must Have |
| Extension Support | Should Have |

**User Journey**
```
Assessment Planning → Tool Setup → Configure Sessions → 
Execute Tests → Analyze Results → Document Findings → Report Generation
```

---

### 4.2 Secondary Audiences

| Audience | Description | Key Needs |
|----------|-------------|-----------|
| QA Teams | Software testing professionals | Session isolation, automation, multi-browser testing |
| Academic Researchers | University researchers studying web behavior | Data collection, anonymity, reproducible environments |
| Competitive Intelligence | Business analysts tracking competitors | Automated monitoring, data extraction, anonymity |
| Market Researchers | Professionals gathering market data | Survey access, geo-targeting, data collection |
| Journalists | Investigative journalists | Source protection, anonymous research, secure communication |

### 4.3 User Segmentation Matrix

| Segment | Technical Level | Primary Need | Price Sensitivity | Support Need |
|---------|-----------------|--------------|-------------------|--------------|
| Privacy Advocates | High | Privacy | Medium | Low |
| SEO Professionals | Medium | Automation | Low | Medium |
| Automation Engineers | Very High | Scalability | Low | Low |
| Creator Supporters | Low | Simplicity | High | High |
| Security Researchers | Very High | Isolation | Low | Low |
| QA Teams | High | Reliability | Medium | Medium |

---

## 5. User Stories and Acceptance Criteria

### 5.1 Epic Overview

| Epic ID | Epic Name | Description | Priority |
|---------|-----------|-------------|----------|
| EP-001 | Proxy Management | Complete proxy lifecycle management | P0 |
| EP-002 | Privacy Protection | Multi-vector privacy protection suite | P0 |
| EP-003 | Tab Management | Isolated tab creation and management | P0 |
| EP-004 | Search Automation | Automated keyword search execution | P1 |
| EP-005 | Domain Targeting | Target domain identification and interaction | P1 |
| EP-006 | Autonomous Execution | Self-healing automation engine | P1 |
| EP-007 | Creator Support | Ethical creator support automation | P2 |
| EP-008 | Translation | Built-in translation capabilities | P2 |
| EP-009 | Extensions | Chrome extension support | P2 |
| EP-010 | Session Management | Session save/restore functionality | P2 |

---

### 5.2 Epic EP-001: Proxy Management

#### User Story PM-001: Add Single Proxy
**As a** user  
**I want to** add a proxy server to my proxy list  
**So that** I can use it for anonymous browsing

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | User can access "Add Proxy" button from proxy panel | ☐ |
| 2 | Modal form displays fields: Name, Host, Port, Protocol, Username, Password | ☐ |
| 3 | Protocol dropdown includes: HTTP, HTTPS, SOCKS4, SOCKS5 | ☐ |
| 4 | Form validates required fields (Host, Port, Protocol) | ☐ |
| 5 | Port field only accepts numbers 1-65535 | ☐ |
| 6 | Username/Password fields are optional | ☐ |
| 7 | On save, proxy is validated automatically | ☐ |
| 8 | Success toast notification appears on successful add | ☐ |
| 9 | Error toast appears if validation fails with reason | ☐ |
| 10 | Proxy appears in list with "Checking" status initially | ☐ |

**Technical Notes:**
- Use Zod for form validation
- Validate proxy connectivity using `got` library
- Store proxy in SQLite database
- Emit IPC event for renderer update

**Mockup Reference:** Section 10.3.1

---

#### User Story PM-002: Bulk Import Proxies
**As a** power user  
**I want to** import multiple proxies from a file or text  
**So that** I can quickly add my proxy list

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | User can access "Import" button from proxy panel | ☐ |
| 2 | Import modal supports file upload (.txt, .csv) | ☐ |
| 3 | Import modal supports paste from clipboard | ☐ |
| 4 | Supported formats: `host:port`, `host:port:user:pass`, `protocol://host:port` | ☐ |
| 5 | Preview shows parsed proxies before import | ☐ |
| 6 | Invalid entries are highlighted with error reason | ☐ |
| 7 | User can select/deselect individual proxies | ☐ |
| 8 | Progress bar shows import progress | ☐ |
| 9 | Summary shows imported/failed/skipped counts | ☐ |
| 10 | Duplicate proxies are detected and optionally skipped | ☐ |

**Technical Notes:**
- Parse multiple formats with regex
- Batch insert to database for performance
- Validate in parallel with concurrency limit

---

#### User Story PM-003: Validate Proxy
**As a** user  
**I want to** validate if a proxy is working  
**So that** I know which proxies are reliable

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | User can click "Validate" button on individual proxy | ☐ |
| 2 | User can click "Validate All" for batch validation | ☐ |
| 3 | Status changes to "Checking" during validation | ☐ |
| 4 | Validation checks connectivity to test endpoint | ☐ |
| 5 | Latency is measured and displayed in milliseconds | ☐ |
| 6 | Status updates to "Active" (green) or "Failed" (red) | ☐ |
| 7 | Last checked timestamp is updated | ☐ |
| 8 | Failed proxies show error reason on hover | ☐ |
| 9 | Batch validation shows progress indicator | ☐ |
| 10 | User can cancel ongoing validation | ☐ |

**Technical Notes:**
- Test against multiple endpoints for reliability
- Timeout after 10 seconds
- Calculate average latency over 3 attempts
- Store validation results in database

---

#### User Story PM-004: Proxy Rotation Strategies
**As a** user  
**I want to** configure how proxies rotate  
**So that** I can optimize for my use case

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Rotation strategy dropdown in proxy settings | ☐ |
| 2 | Round Robin: Sequential rotation | ☐ |
| 3 | Random: Random selection each time | ☐ |
| 4 | Weighted: Priority-based selection | ☐ |
| 5 | Latency-Based: Fastest proxy preferred | ☐ |
| 6 | Least Used: Balance across proxies | ☐ |
| 7 | Geographic: Rotate by region | ☐ |
| 8 | Sticky Session: Same proxy per domain | ☐ |
| 9 | Failover: Next proxy on failure | ☐ |
| 10 | Time-Based: Rotate every N minutes | ☐ |
| 11 | Custom Rules: User-defined logic | ☐ |

**Technical Notes:**
- Implement strategy pattern for rotation algorithms
- Store strategy configuration per profile
- Support strategy-specific parameters

---

#### User Story PM-005: Per-Tab Proxy Assignment
**As a** user  
**I want to** assign different proxies to different tabs  
**So that** each tab has its own IP identity

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Tab context menu includes "Assign Proxy" option | ☐ |
| 2 | Proxy selector shows available proxies with status | ☐ |
| 3 | "No Proxy" option available for direct connection | ☐ |
| 4 | "Auto" option uses rotation strategy | ☐ |
| 5 | Selected proxy indicator appears on tab | ☐ |
| 6 | Proxy change applies immediately | ☐ |
| 7 | Page reloads with new proxy after confirmation | ☐ |
| 8 | Tab maintains assigned proxy until changed | ☐ |
| 9 | New tabs inherit default proxy setting | ☐ |
| 10 | Proxy assignment persists across session restore | ☐ |

**Technical Notes:**
- Use Electron session partitioning
- Configure proxy via `session.setProxy()`
- Store proxy assignment in tab state

---

### 5.3 Epic EP-002: Privacy Protection

#### User Story PP-001: WebRTC Leak Prevention
**As a** privacy-conscious user  
**I want to** prevent WebRTC from leaking my real IP  
**So that** my proxy/VPN isn't bypassed

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Privacy panel shows WebRTC protection toggle | ☐ |
| 2 | Four policy options available: Disable, Disable Non-Proxied, Proxy Only, Default | ☐ |
| 3 | "Disable" completely blocks WebRTC | ☐ |
| 4 | "Disable Non-Proxied" blocks local IP discovery | ☐ |
| 5 | "Proxy Only" forces WebRTC through proxy | ☐ |
| 6 | Policy applies to all tabs immediately | ☐ |
| 7 | Policy persists across application restarts | ☐ |
| 8 | Visual indicator shows current protection level | ☐ |
| 9 | Test button verifies leak protection | ☐ |
| 10 | 100% effectiveness verified by automated tests | ☐ |

**Technical Notes:**
- Use `webrtcIPHandlingPolicy` in BrowserView
- Inject preload script to override `RTCPeerConnection`
- Filter ICE candidates in preload

---

#### User Story PP-002: Canvas Fingerprint Spoofing
**As a** user  
**I want to** prevent canvas fingerprinting  
**So that** websites cannot uniquely identify my browser

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Canvas spoofing toggle in privacy panel | ☐ |
| 2 | When enabled, canvas output is modified | ☐ |
| 3 | Noise injection is imperceptible to users | ☐ |
| 4 | Each tab has unique canvas fingerprint | ☐ |
| 5 | Fingerprint is consistent within session | ☐ |
| 6 | Fingerprint changes on new session | ☐ |
| 7 | Both 2D and WebGL canvas are protected | ☐ |
| 8 | Performance impact is minimal (<1% CPU) | ☐ |
| 9 | Protection verified by fingerprint test sites | ☐ |
| 10 | No website breakage from spoofing | ☐ |

**Technical Notes:**
- Override `HTMLCanvasElement.prototype.toDataURL`
- Override `HTMLCanvasElement.prototype.toBlob`
- Override `CanvasRenderingContext2D.prototype.getImageData`
- Use deterministic noise based on session seed

---

#### User Story PP-003: Navigator Spoofing
**As a** user  
**I want to** spoof my browser's navigator properties  
**So that** I appear as a different browser/device

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Navigator spoofing toggle in privacy panel | ☐ |
| 2 | User agent string is randomized or customizable | ☐ |
| 3 | Platform property matches user agent | ☐ |
| 4 | Language settings are spoofable | ☐ |
| 5 | Hardware concurrency can be modified | ☐ |
| 6 | Device memory can be spoofed | ☐ |
| 7 | Plugin list is normalized | ☐ |
| 8 | Screen resolution can be spoofed | ☐ |
| 9 | Timezone matches proxy location (optional) | ☐ |
| 10 | Spoofed values are internally consistent | ☐ |

**Technical Notes:**
- Use `user-agents` library for realistic UA strings
- Override navigator properties via preload script
- Ensure consistency between related properties

---

#### User Story PP-004: Tracker Blocking
**As a** user  
**I want to** block tracking scripts and requests  
**So that** my browsing activity is not monitored

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Tracker blocking toggle (master switch) | ☐ |
| 2 | Category toggles: Ads, Analytics, Social, Cryptomining, Fingerprinting | ☐ |
| 3 | Built-in blocklist with 50K+ domains | ☐ |
| 4 | Real-time request interception | ☐ |
| 5 | Blocking latency < 1ms | ☐ |
| 6 | Live counter shows blocked requests | ☐ |
| 7 | Per-tab blocking statistics | ☐ |
| 8 | Custom whitelist for exceptions | ☐ |
| 9 | Custom blacklist for additional blocking | ☐ |
| 10 | Blocklist updates automatically | ☐ |

**Technical Notes:**
- Use `webRequest.onBeforeRequest` for interception
- Implement bloom filter for fast lookup
- Categorize using EasyList/EasyPrivacy format

---

### 5.4 Epic EP-003: Tab Management

#### User Story TM-001: Create Isolated Tab
**As a** user  
**I want to** create a new tab with complete isolation  
**So that** it has no data shared with other tabs

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | New tab button creates isolated tab | ☐ |
| 2 | Each tab has unique session partition | ☐ |
| 3 | Cookies are isolated per tab | ☐ |
| 4 | localStorage is isolated per tab | ☐ |
| 5 | Cache is isolated per tab | ☐ |
| 6 | IndexedDB is isolated per tab | ☐ |
| 7 | Service workers are isolated per tab | ☐ |
| 8 | Tab creation time < 500ms | ☐ |
| 9 | Memory is released on tab close | ☐ |
| 10 | Maximum 50 tabs can be open | ☐ |

**Technical Notes:**
- Use `partition: 'persist:tab-${uuid}'` for isolation
- Create new BrowserView per tab
- Implement tab pool for performance

---

#### User Story TM-002: Tab Pool Management
**As a** power user  
**I want to** manage many tabs efficiently  
**So that** automation runs smoothly

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Tab pool pre-creates tabs for performance | ☐ |
| 2 | Maximum 50 concurrent tabs enforced | ☐ |
| 3 | Memory usage monitored per tab | ☐ |
| 4 | Tabs exceeding memory limit are flagged | ☐ |
| 5 | Idle tabs can be suspended | ☐ |
| 6 | Suspended tabs restore on focus | ☐ |
| 7 | Force close unresponsive tabs after 30s | ☐ |
| 8 | Tab recycling for automation efficiency | ☐ |
| 9 | Pool statistics visible in UI | ☐ |
| 10 | Resource threshold warnings displayed | ☐ |

**Technical Notes:**
- Implement tab pool with configurable size
- Use `webContents.isDestroyed()` for cleanup
- Monitor via `process.memoryUsage()`

---

### 5.5 Epic EP-004: Search Automation

#### User Story SA-001: Keyword Queue Management
**As an** SEO professional  
**I want to** manage a queue of keywords to search  
**So that** I can automate rank tracking

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Text area for bulk keyword input | ☐ |
| 2 | One keyword per line | ☐ |
| 3 | CSV import support | ☐ |
| 4 | Duplicate detection and removal | ☐ |
| 5 | Keyword count displayed | ☐ |
| 6 | Queue can hold 10,000+ keywords | ☐ |
| 7 | Keywords can be added during execution | ☐ |
| 8 | Individual keyword removal | ☐ |
| 9 | Clear all keywords option | ☐ |
| 10 | Queue persists across restarts | ☐ |

**Technical Notes:**
- Store queue in SQLite for persistence
- Virtual list rendering for large queues
- Batch operations for performance

---

#### User Story SA-002: Search Execution
**As an** SEO professional  
**I want to** execute automated searches  
**So that** I can check rankings without manual work

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Start button initiates search execution | ☐ |
| 2 | New tab created per keyword | ☐ |
| 3 | Maximum concurrent tabs configurable (1-50) | ☐ |
| 4 | Search engine selectable (Google, Bing, DuckDuckGo, Yahoo, Brave) | ☐ |
| 5 | Human-like delays between actions (2-5s) | ☐ |
| 6 | Proxy auto-rotates per search | ☐ |
| 7 | Fingerprint unique per search | ☐ |
| 8 | Progress indicator shows completion % | ☐ |
| 9 | Pause/Resume functionality | ☐ |
| 10 | Stop button cancels execution | ☐ |

**Technical Notes:**
- Implement human-like typing simulation
- Random delays with Gaussian distribution
- Handle search engine variations

---

#### User Story SA-003: Result Extraction
**As an** SEO professional  
**I want to** extract search results automatically  
**So that** I can analyze ranking positions

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Extract title, URL, description for each result | ☐ |
| 2 | Extract position (1-100) for each result | ☐ |
| 3 | Handle pagination for positions > 10 | ☐ |
| 4 | Identify target domains in results | ☐ |
| 5 | Log target domain position if found | ☐ |
| 6 | Log "not found" if target not in results | ☐ |
| 7 | Results stored in database | ☐ |
| 8 | Export results to CSV/JSON | ☐ |
| 9 | Historical position tracking | ☐ |
| 10 | Position change alerts | ☐ |

**Technical Notes:**
- Use DOM selectors for each search engine
- Handle dynamic loading with `waitForSelector`
- Store extraction timestamp for history

---

### 5.6 Epic EP-005: Domain Targeting

#### User Story DT-001: Target Domain Configuration
**As an** SEO professional  
**I want to** configure target domains to find in search results  
**So that** I can track their rankings

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Domain input field in Domain tab | ☐ |
| 2 | Add individual domains | ☐ |
| 3 | Bulk import domains | ☐ |
| 4 | Wildcard support (*.example.com) | ☐ |
| 5 | Regex pattern support | ☐ |
| 6 | Enable/disable individual domains | ☐ |
| 7 | Priority setting per domain | ☐ |
| 8 | Domain list displayed in table | ☐ |
| 9 | Delete domain option | ☐ |
| 10 | Maximum 500 target domains | ☐ |

**Technical Notes:**
- Validate domain format with regex
- Compile regex patterns at configuration time
- Store in SQLite with priority index

---

#### User Story DT-002: Domain Click Simulation
**As a** user  
**I want to** automatically click on target domains in search results  
**So that** I can visit them with human-like behavior

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Scan search results for target domains | ☐ |
| 2 | Highlight found domains in results | ☐ |
| 3 | Simulate mouse movement to element | ☐ |
| 4 | Hover over link before clicking | ☐ |
| 5 | Random delay before click (0.5-2s) | ☐ |
| 6 | Click opens in new isolated tab | ☐ |
| 7 | Log click action with timestamp | ☐ |
| 8 | Handle multiple matches per search | ☐ |
| 9 | Retry if click fails | ☐ |
| 10 | Skip if domain not found | ☐ |

**Technical Notes:**
- Use `webContents.sendInputEvent` for mouse events
- Calculate smooth bezier curve for movement
- Random click offset within element bounds

---

#### User Story DT-003: Page Interaction
**As a** user  
**I want to** simulate natural page interaction  
**So that** visits appear authentic

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Configurable dwell time (10-300s) | ☐ |
| 2 | Smart scrolling patterns | ☐ |
| 3 | Random scroll speed variation | ☐ |
| 4 | Scroll to different page sections | ☐ |
| 5 | Optional internal link clicks | ☐ |
| 6 | Configurable interaction depth | ☐ |
| 7 | Mouse movement simulation | ☐ |
| 8 | Page focus maintained | ☐ |
| 9 | Exit after dwell time | ☐ |
| 10 | Log all interactions | ☐ |

**Technical Notes:**
- Implement scroll patterns (linear, eased, natural)
- Random pauses during scroll
- Track interaction metrics for analytics

---

### 5.7 Epic EP-006: Autonomous Execution

#### User Story AE-001: Scheduling System
**As a** user  
**I want to** schedule automation tasks  
**So that** they run without manual intervention

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Schedule type selector: One-time, Recurring, Continuous, Custom | ☐ |
| 2 | One-time: Date and time picker | ☐ |
| 3 | Recurring: Daily, weekly, monthly options | ☐ |
| 4 | Recurring: Day of week selector | ☐ |
| 5 | Continuous: Interval setting (minutes) | ☐ |
| 6 | Custom: Cron expression input | ☐ |
| 7 | Start/end date range (optional) | ☐ |
| 8 | Next run time displayed | ☐ |
| 9 | Schedule persists across restarts | ☐ |
| 10 | Multiple schedules can coexist | ☐ |

**Technical Notes:**
- Use `node-cron` for cron parsing
- Store schedules in database
- Implement schedule manager service

---

#### User Story AE-002: Self-Healing Automation
**As a** user  
**I want to** automation to recover from errors automatically  
**So that** I don't need to monitor constantly

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Automatic retry on network failures (1-5 attempts) | ☐ |
| 2 | Proxy failover on proxy failure | ☐ |
| 3 | Tab restart on tab crash | ☐ |
| 4 | Captcha detection and logging | ☐ |
| 5 | Rate limit detection and backoff | ☐ |
| 6 | Timeout handling (30s default) | ☐ |
| 7 | Resource threshold throttling | ☐ |
| 8 | Error categorization and reporting | ☐ |
| 9 | Recovery success rate > 95% | ☐ |
| 10 | All errors logged with context | ☐ |

**Technical Notes:**
- Implement circuit breaker pattern
- Exponential backoff for retries
- Error classification for appropriate handling

---

#### User Story AE-003: Resource Monitoring
**As a** user  
**I want to** automation to respect system resources  
**So that** my computer remains usable

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | CPU usage monitoring (threshold: 80%) | ☐ |
| 2 | Memory usage monitoring (threshold: 80%) | ☐ |
| 3 | Automatic throttling when thresholds exceeded | ☐ |
| 4 | Tab count reduction on high memory | ☐ |
| 5 | Delay increase on high CPU | ☐ |
| 6 | Resource usage graphs in dashboard | ☐ |
| 7 | Configurable thresholds | ☐ |
| 8 | Alert notifications on high usage | ☐ |
| 9 | Automatic resume when resources free | ☐ |
| 10 | Resource usage logging | ☐ |

**Technical Notes:**
- Use `os` module for system metrics
- Poll every 5 seconds
- Implement smooth throttling curve

---

### 5.8 Epic EP-007: Creator Support

#### User Story CS-001: Creator Management
**As a** creator supporter  
**I want to** manage a list of creators to support  
**So that** I can help my favorite content creators

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Add creator by URL | ☐ |
| 2 | Auto-detect platform (YouTube, Twitch, Blog, Website) | ☐ |
| 3 | Auto-fetch creator name and thumbnail | ☐ |
| 4 | Select support methods (ads, visits, content) | ☐ |
| 5 | Enable/disable individual creators | ☐ |
| 6 | Priority setting per creator | ☐ |
| 7 | View support history per creator | ☐ |
| 8 | Delete creator option | ☐ |
| 9 | Maximum 100 creators | ☐ |
| 10 | Creator list persists | ☐ |

**Technical Notes:**
- Parse URLs to detect platform
- Use platform APIs for metadata
- Store creator data in SQLite

---

#### User Story CS-002: Ad Viewing Automation
**As a** creator supporter  
**I want to** automatically view ads on creator content  
**So that** creators earn ad revenue from my views

**Acceptance Criteria:**
| # | Criteria | Status |
|---|----------|--------|
| 1 | Navigate to creator content automatically | ☐ |
| 2 | Detect ad presence on page | ☐ |
| 3 | Wait for video ads to complete (no skip) | ☐ |
| 4 | View display ads for appropriate duration | ☐ |
| 5 | Simulate natural engagement (scroll, hover) | ☐ |
| 6 | Respect platform rate limits | ☐ |
| 7 | Rotate between creators | ☐ |
| 8 | Log all support activities | ☐ |
| 9 | Track total ads viewed per creator | ☐ |
| 10 | Handle ad blockers detection | ☐ |

**Technical Notes:**
- Detect ads via DOM observers
- Implement platform-specific handlers
- Natural timing between interactions

---

## 6. Core Features - Detailed Specifications

### 6.1 Proxy Management System

#### 6.1.1 System Overview
The Proxy Management System provides comprehensive proxy lifecycle management including adding, validating, rotating, and assigning proxies to browser tabs.

#### 6.1.2 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ProxyManager                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ ProxyStore  │  │ Validator   │  │ Rotator     │     │
│  │ (Database)  │  │ (Health)    │  │ (Strategy)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Connection  │  │ Auth        │  │ Metrics     │     │
│  │ Pool        │  │ Handler     │  │ Collector   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

#### 6.1.3 Rotation Strategy Specifications

| Strategy | Algorithm | Use Case | Parameters |
|----------|-----------|----------|------------|
| Round Robin | Sequential index++ | Even distribution | None |
| Random | Math.random() | Unpredictable selection | None |
| Weighted | Priority-based probability | Prefer reliable proxies | Weight per proxy |
| Latency-Based | Sort by latency, select fastest | Speed optimization | Latency threshold |
| Least Used | Track usage count, select minimum | Load balancing | None |
| Geographic | Group by region, rotate within | Location targeting | Region preference |
| Sticky Session | Hash domain to proxy | Session consistency | TTL |
| Failover | Primary/backup chain | Reliability | Fallback order |
| Time-Based | Rotate every N minutes | Regular rotation | Interval (minutes) |
| Custom Rules | User-defined expressions | Advanced use cases | Rule expression |

### 6.2 Privacy Protection Suite

#### 6.2.1 Fingerprint Spoofing Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  FingerprintManager                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Canvas      │  │ WebGL       │  │ Audio       │     │
│  │ Spoofer     │  │ Spoofer     │  │ Spoofer     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Navigator   │  │ Timezone    │  │ Font        │     │
│  │ Spoofer     │  │ Spoofer     │  │ Spoofer     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Seed Generator (per-session)        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 6.2.2 WebRTC Protection Modes

| Mode | Description | ICE Candidates | Local IP | Use Case |
|------|-------------|----------------|----------|----------|
| disable | Block all WebRTC | None | Hidden | Maximum privacy |
| disable_non_proxied | Block non-proxy | Proxy only | Hidden | Proxy users |
| proxy_only | Force through proxy | Filtered | Hidden | VPN users |
| default | Standard + protection | All | mDNS only | Normal browsing |

### 6.3 Tab Isolation System

#### 6.3.1 Isolation Layers

| Layer | Technology | Isolation Scope |
|-------|------------|-----------------|
| Process | Chromium sandbox | Memory, CPU |
| Session | Electron partition | Cookies, Storage |
| Network | Per-tab proxy | IP, Headers |
| Identity | Fingerprint seed | Browser identity |
| Cache | Separate cache dir | Cached resources |

#### 6.3.2 Tab Lifecycle States

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Created │───▶│ Loading │───▶│ Active  │───▶│ Idle    │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                   │              │
                                   │              ▼
                                   │         ┌─────────┐
                                   │         │Suspended│
                                   │         └─────────┘
                                   │              │
                                   ▼              ▼
                              ┌─────────┐    ┌─────────┐
                              │ Closing │───▶│ Closed  │
                              └─────────┘    └─────────┘
```

---

## 7. Technical Architecture

### 7.1 Technology Stack

#### 7.1.1 Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Desktop Framework | Electron | 34.5.8 | Cross-platform desktop application |
| Frontend Framework | React | 19.2.3 | User interface rendering |
| Language | TypeScript | 5.9.3 | Type-safe development |
| Build Tool | Electron-Vite | 2.3.0 | Optimized build system |
| State Management | Zustand | 5.0.10 | Global state management |
| CSS Framework | TailwindCSS | 3.4.19 | Utility-first styling |
| UI Components | Radix UI | Latest | Accessible component primitives |
| Testing (Unit) | Vitest | 2.1.9 | Fast unit testing |
| Testing (E2E) | Playwright | 1.57.0 | End-to-end testing |
| Database | better-sqlite3 | 11.10.0 | Local SQLite database |

### 7.2 Application Architecture

#### 7.2.1 Process Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN PROCESS                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Core Services                           │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │  │
│  │  │ProxyManager │ │PrivacyCore  │ │TabManager   │         │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │  │
│  │  │Automation   │ │Session      │ │Extension    │         │  │
│  │  │Engine       │ │Manager      │ │Loader       │         │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘         │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    IPC Handlers                            │  │
│  │  proxy.ts | privacy.ts | tabs.ts | automation.ts          │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Database Layer                          │  │
│  │  SQLite (better-sqlite3) + electron-store                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ IPC Bridge (contextBridge)
┌─────────────────────────────────────────────────────────────────┐
│                      RENDERER PROCESS                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React Application                       │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │  │
│  │  │ TabBar      │ │ AddressBar  │ │ Panels      │         │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘         │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    State Management                        │  │
│  │  Zustand Stores: tab | proxy | privacy | automation       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSERVIEW PROCESSES                         │
│  Tab 1 (partition:tab-uuid1) ─ Isolated Session + Proxy         │
│  Tab 2 (partition:tab-uuid2) ─ Isolated Session + Proxy         │
│  Tab N (partition:tab-uuidN) ─ Isolated Session + Proxy         │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Module Structure

```
virtual-ip-browser/
├── electron/
│   ├── main/
│   │   ├── index.ts                 # Main entry point
│   │   ├── window.ts                # Window management
│   │   └── preload.ts               # Preload script
│   ├── core/
│   │   ├── proxy-engine/
│   │   │   ├── manager.ts           # ProxyManager class
│   │   │   ├── rotation.ts          # Rotation strategies
│   │   │   ├── validator.ts         # Proxy validation
│   │   │   ├── connection-pool.ts   # Connection pooling
│   │   │   └── types.ts             # TypeScript types
│   │   ├── privacy/
│   │   │   ├── fingerprint/
│   │   │   │   ├── canvas.ts        # Canvas spoofing
│   │   │   │   ├── webgl.ts         # WebGL spoofing
│   │   │   │   ├── audio.ts         # Audio spoofing
│   │   │   │   ├── navigator.ts     # Navigator spoofing
│   │   │   │   └── timezone.ts      # Timezone spoofing
│   │   │   ├── webrtc.ts            # WebRTC protection
│   │   │   ├── tracker-blocker.ts   # Tracker blocking
│   │   │   └── blocklist.ts         # Blocklist management
│   │   ├── tabs/
│   │   │   ├── manager.ts           # Tab lifecycle
│   │   │   ├── pool.ts              # Tab pool
│   │   │   └── isolation.ts         # Session isolation
│   │   ├── automation/
│   │   │   ├── search-engine.ts     # Search automation
│   │   │   ├── domain-targeting.ts  # Domain targeting
│   │   │   ├── scheduler.ts         # Task scheduling
│   │   │   ├── executor.ts          # Task execution
│   │   │   └── creator-support.ts   # Creator support
│   │   └── session/
│   │       ├── manager.ts           # Session management
│   │       └── persistence.ts       # Session persistence
│   ├── ipc/
│   │   ├── handlers/
│   │   │   ├── proxy.ts             # Proxy IPC handlers
│   │   │   ├── privacy.ts           # Privacy IPC handlers
│   │   │   ├── tabs.ts              # Tab IPC handlers
│   │   │   └── automation.ts        # Automation IPC handlers
│   │   └── channels.ts              # IPC channel definitions
│   └── database/
│       ├── index.ts                 # Database initialization
│       ├── migrations/              # Schema migrations
│       └── repositories/            # Data access layer
├── src/
│   ├── App.tsx                      # Root component
│   ├── components/
│   │   ├── browser/
│   │   │   ├── TabBar.tsx           # Tab bar component
│   │   │   ├── AddressBar.tsx       # Address bar
│   │   │   └── BrowserView.tsx      # Browser view wrapper
│   │   ├── panels/
│   │   │   ├── ProxyPanel.tsx       # Proxy management panel
│   │   │   ├── PrivacyPanel.tsx     # Privacy settings panel
│   │   │   ├── AutomationPanel.tsx  # Automation panel
│   │   │   └── TranslatePanel.tsx   # Translation panel
│   │   └── ui/                      # Reusable UI components
│   ├── stores/
│   │   ├── tabStore.ts              # Tab state
│   │   ├── proxyStore.ts            # Proxy state
│   │   ├── privacyStore.ts          # Privacy state
│   │   └── automationStore.ts       # Automation state
│   ├── hooks/                       # Custom React hooks
│   ├── utils/                       # Utility functions
│   └── types/                       # TypeScript types
├── tests/
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── e2e/                         # End-to-end tests
└── resources/
    ├── blocklists/                  # Tracker blocklists
    └── icons/                       # Application icons
```

---

## 8. API Specifications

### 8.1 IPC API Overview

All communication between renderer and main process uses Electron's IPC with type-safe channels.

### 8.2 Proxy Management API

#### 8.2.1 `proxy:add`
Add a new proxy to the system.

**Request:**
```typescript
interface AddProxyRequest {
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
}
```

**Response:**
```typescript
interface AddProxyResponse {
  success: boolean;
  proxy?: Proxy;
  error?: string;
}
```

**Example:**
```typescript
const result = await window.api.proxy.add({
  name: 'US Proxy 1',
  host: '192.168.1.100',
  port: 8080,
  protocol: 'http',
  username: 'user',
  password: 'pass'
});
```

---

#### 8.2.2 `proxy:list`
Get all proxies.

**Request:** None

**Response:**
```typescript
interface ListProxiesResponse {
  proxies: Proxy[];
  total: number;
}
```

---

#### 8.2.3 `proxy:validate`
Validate one or more proxies.

**Request:**
```typescript
interface ValidateProxyRequest {
  proxyIds: string[];  // Empty array validates all
}
```

**Response:**
```typescript
interface ValidateProxyResponse {
  results: {
    proxyId: string;
    status: 'active' | 'failed';
    latency?: number;
    error?: string;
  }[];
}
```

---

#### 8.2.4 `proxy:delete`
Delete a proxy.

**Request:**
```typescript
interface DeleteProxyRequest {
  proxyId: string;
}
```

**Response:**
```typescript
interface DeleteProxyResponse {
  success: boolean;
  error?: string;
}
```

---

#### 8.2.5 `proxy:setRotationStrategy`
Configure rotation strategy.

**Request:**
```typescript
interface SetRotationStrategyRequest {
  strategy: RotationStrategy;
  params?: Record<string, unknown>;
}

type RotationStrategy = 
  | 'round-robin'
  | 'random'
  | 'weighted'
  | 'latency-based'
  | 'least-used'
  | 'geographic'
  | 'sticky-session'
  | 'failover'
  | 'time-based'
  | 'custom';
```

**Response:**
```typescript
interface SetRotationStrategyResponse {
  success: boolean;
  error?: string;
}
```

---

### 8.3 Privacy API

#### 8.3.1 `privacy:setWebRTCPolicy`
Set WebRTC leak protection policy.

**Request:**
```typescript
interface SetWebRTCPolicyRequest {
  policy: 'disable' | 'disable_non_proxied' | 'proxy_only' | 'default';
}
```

**Response:**
```typescript
interface SetWebRTCPolicyResponse {
  success: boolean;
  error?: string;
}
```

---

#### 8.3.2 `privacy:setFingerprintSpoofing`
Configure fingerprint spoofing.

**Request:**
```typescript
interface SetFingerprintSpoofingRequest {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  navigator: boolean;
  timezone: boolean;
  fonts: boolean;
}
```

**Response:**
```typescript
interface SetFingerprintSpoofingResponse {
  success: boolean;
  error?: string;
}
```

---

#### 8.3.3 `privacy:setTrackerBlocking`
Configure tracker blocking.

**Request:**
```typescript
interface SetTrackerBlockingRequest {
  enabled: boolean;
  categories: {
    ads: boolean;
    analytics: boolean;
    social: boolean;
    cryptomining: boolean;
    fingerprinting: boolean;
  };
}
```

**Response:**
```typescript
interface SetTrackerBlockingResponse {
  success: boolean;
  error?: string;
}
```

---

#### 8.3.4 `privacy:getStats`
Get privacy protection statistics.

**Request:**
```typescript
interface GetPrivacyStatsRequest {
  tabId?: string;  // Optional: get stats for specific tab
}
```

**Response:**
```typescript
interface GetPrivacyStatsResponse {
  totalBlocked: number;
  byCategory: {
    ads: number;
    analytics: number;
    social: number;
    cryptomining: number;
    fingerprinting: number;
  };
  webrtcLeaksBlocked: number;
}
```

---

### 8.4 Tab Management API

#### 8.4.1 `tab:create`
Create a new isolated tab.

**Request:**
```typescript
interface CreateTabRequest {
  url?: string;
  proxyId?: string;
  fingerprintSeed?: string;
}
```

**Response:**
```typescript
interface CreateTabResponse {
  success: boolean;
  tab?: Tab;
  error?: string;
}
```

---

#### 8.4.2 `tab:close`
Close a tab.

**Request:**
```typescript
interface CloseTabRequest {
  tabId: string;
}
```

**Response:**
```typescript
interface CloseTabResponse {
  success: boolean;
  error?: string;
}
```

---

#### 8.4.3 `tab:navigate`
Navigate tab to URL.

**Request:**
```typescript
interface NavigateTabRequest {
  tabId: string;
  url: string;
}
```

**Response:**
```typescript
interface NavigateTabResponse {
  success: boolean;
  error?: string;
}
```

---

#### 8.4.4 `tab:assignProxy`
Assign proxy to tab.

**Request:**
```typescript
interface AssignProxyRequest {
  tabId: string;
  proxyId: string | null;  // null for direct connection
}
```

**Response:**
```typescript
interface AssignProxyResponse {
  success: boolean;
  error?: string;
}
```

---

### 8.5 Automation API

#### 8.5.1 `automation:startSearch`
Start search automation.

**Request:**
```typescript
interface StartSearchRequest {
  keywords: string[];
  engine: 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';
  maxConcurrentTabs: number;
  targetDomains?: string[];
  options?: {
    dwellTime: number;
    clickTargets: boolean;
    extractResults: boolean;
  };
}
```

**Response:**
```typescript
interface StartSearchResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}
```

---

#### 8.5.2 `automation:stop`
Stop automation session.

**Request:**
```typescript
interface StopAutomationRequest {
  sessionId: string;
}
```

**Response:**
```typescript
interface StopAutomationResponse {
  success: boolean;
  error?: string;
}
```

---

#### 8.5.3 `automation:getStatus`
Get automation status.

**Request:**
```typescript
interface GetAutomationStatusRequest {
  sessionId: string;
}
```

**Response:**
```typescript
interface GetAutomationStatusResponse {
  status: 'running' | 'paused' | 'stopped' | 'completed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  activeTabs: number;
  startTime: Date;
  estimatedCompletion?: Date;
}
```

---

#### 8.5.4 `automation:schedule`
Schedule automation task.

**Request:**
```typescript
interface ScheduleAutomationRequest {
  type: 'one-time' | 'recurring' | 'continuous' | 'custom';
  startTime?: Date;
  endTime?: Date;
  interval?: number;
  daysOfWeek?: number[];
  cronExpression?: string;
  task: StartSearchRequest;
}
```

**Response:**
```typescript
interface ScheduleAutomationResponse {
  success: boolean;
  scheduleId?: string;
  nextRunTime?: Date;
  error?: string;
}
```

---

## 9. Data Models and Database Schema

### 9.1 Core Data Models

#### 9.1.1 Proxy Model

```typescript
interface Proxy {
  id: string;                    // UUID v4
  name: string;                  // User-friendly name
  host: string;                  // IP or hostname
  port: number;                  // 1-65535
  protocol: ProxyProtocol;       // http, https, socks4, socks5
  username?: string;             // Optional auth
  password?: string;             // Optional auth (encrypted)
  status: ProxyStatus;           // active, failed, checking
  latency?: number;              // Last measured latency (ms)
  lastChecked?: Date;            // Last validation timestamp
  failureCount: number;          // Consecutive failures
  totalRequests: number;         // Lifetime request count
  successRate: number;           // Success percentage
  region?: string;               // Geographic region
  tags: string[];                // User tags
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
}

type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';
type ProxyStatus = 'active' | 'failed' | 'checking' | 'disabled';
```

#### 9.1.2 Tab Model

```typescript
interface Tab {
  id: string;                    // UUID v4
  title: string;                 // Page title
  url: string;                   // Current URL
  favicon?: string;              // Favicon URL or data URI
  partition: string;             // Session partition ID
  proxyId?: string;              // Assigned proxy ID
  fingerprintSeed: string;       // Fingerprint generation seed
  status: TabStatus;             // Tab state
  isActive: boolean;             // Currently focused
  isPinned: boolean;             // Pinned tab
  isLoading: boolean;            // Loading state
  canGoBack: boolean;            // Navigation state
  canGoForward: boolean;         // Navigation state
  memoryUsage?: number;          // Memory in bytes
  createdAt: Date;               // Creation timestamp
  lastActiveAt: Date;            // Last interaction
}

type TabStatus = 'created' | 'loading' | 'active' | 'idle' | 'suspended' | 'closing' | 'closed';
```

#### 9.1.3 Search Task Model

```typescript
interface SearchTask {
  id: string;                    // UUID v4
  sessionId: string;             // Automation session ID
  keyword: string;               // Search keyword
  engine: SearchEngine;          // Search engine
  status: TaskStatus;            // Task state
  proxyId?: string;              // Proxy used
  tabId?: string;                // Tab used
  position?: number;             // Target domain position
  results: SearchResult[];       // Extracted results
  error?: string;                // Error message if failed
  retryCount: number;            // Retry attempts
  startTime?: Date;              // Execution start
  endTime?: Date;                // Execution end
  duration?: number;             // Duration in ms
  createdAt: Date;               // Creation timestamp
}

type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';
type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

interface SearchResult {
  position: number;              // SERP position (1-100)
  title: string;                 // Result title
  url: string;                   // Result URL
  description: string;           // Result snippet
  isTargetDomain: boolean;       // Matches target domain
}
```

#### 9.1.4 Creator Model

```typescript
interface Creator {
  id: string;                    // UUID v4
  name: string;                  // Creator name
  url: string;                   // Creator URL
  platform: Platform;            // Detected platform
  thumbnailUrl?: string;         // Profile image
  supportMethods: SupportMethod[];// Enabled support methods
  enabled: boolean;              // Active status
  priority: number;              // Support priority
  lastSupported?: Date;          // Last support timestamp
  totalSupports: number;         // Total support sessions
  totalAdsViewed: number;        // Total ads viewed
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
}

type Platform = 'youtube' | 'twitch' | 'blog' | 'website';
type SupportMethod = 'ads' | 'visits' | 'content';
```

#### 9.1.5 Activity Log Model

```typescript
interface ActivityLog {
  id: string;                    // UUID v4
  timestamp: Date;               // Log timestamp
  level: LogLevel;               // Log level
  category: LogCategory;         // Log category
  message: string;               // Log message
  metadata?: Record<string, unknown>;// Additional data
  sessionId?: string;            // Related session
  tabId?: string;                // Related tab
  proxyId?: string;              // Related proxy
}

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'success';
type LogCategory = 'proxy' | 'privacy' | 'tab' | 'search' | 'domain' | 'creator' | 'system';
```

### 9.2 Database Schema (SQLite)

#### 9.2.1 Proxies Table

```sql
CREATE TABLE proxies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
  protocol TEXT NOT NULL CHECK (protocol IN ('http', 'https', 'socks4', 'socks5')),
  username TEXT,
  password TEXT,  -- Encrypted
  status TEXT DEFAULT 'checking' CHECK (status IN ('active', 'failed', 'checking', 'disabled')),
  latency INTEGER,
  last_checked DATETIME,
  failure_count INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,
  region TEXT,
  tags TEXT,  -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(host, port, protocol)
);

CREATE INDEX idx_proxies_status ON proxies(status);
CREATE INDEX idx_proxies_region ON proxies(region);
```

#### 9.2.2 Search Tasks Table

```sql
CREATE TABLE search_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  engine TEXT NOT NULL CHECK (engine IN ('google', 'bing', 'duckduckgo', 'yahoo', 'brave')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  proxy_id TEXT,
  tab_id TEXT,
  position INTEGER,
  results TEXT,  -- JSON array
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  start_time DATETIME,
  end_time DATETIME,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE INDEX idx_search_tasks_session ON search_tasks(session_id);
CREATE INDEX idx_search_tasks_status ON search_tasks(status);
CREATE INDEX idx_search_tasks_keyword ON search_tasks(keyword);
```

#### 9.2.3 Target Domains Table

```sql
CREATE TABLE target_domains (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  pattern TEXT,  -- Regex pattern
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_visited DATETIME,
  visit_count INTEGER DEFAULT 0,
  avg_position REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_target_domains_enabled ON target_domains(enabled);
CREATE INDEX idx_target_domains_priority ON target_domains(priority DESC);
```

#### 9.2.4 Creators Table

```sql
CREATE TABLE creators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'twitch', 'blog', 'website')),
  thumbnail_url TEXT,
  support_methods TEXT,  -- JSON array
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_supported DATETIME,
  total_supports INTEGER DEFAULT 0,
  total_ads_viewed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_creators_enabled ON creators(enabled);
CREATE INDEX idx_creators_platform ON creators(platform);
```

#### 9.2.5 Activity Logs Table

```sql
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'success')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,  -- JSON
  session_id TEXT,
  tab_id TEXT,
  proxy_id TEXT
);

CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_level ON activity_logs(level);
CREATE INDEX idx_activity_logs_category ON activity_logs(category);
CREATE INDEX idx_activity_logs_session ON activity_logs(session_id);
```

#### 9.2.6 Sessions Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tabs TEXT,  -- JSON array of tab configurations
  window_bounds TEXT,  -- JSON {x, y, width, height}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 9.2.7 Schedules Table

```sql
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('one-time', 'recurring', 'continuous', 'custom')),
  task_config TEXT NOT NULL,  -- JSON
  start_time DATETIME,
  end_time DATETIME,
  interval_minutes INTEGER,
  days_of_week TEXT,  -- JSON array
  cron_expression TEXT,
  enabled INTEGER DEFAULT 1,
  last_run DATETIME,
  next_run DATETIME,
  run_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedules_enabled ON schedules(enabled);
CREATE INDEX idx_schedules_next_run ON schedules(next_run);
```

---

## 10. User Interface Specifications

### 10.1 Design System

#### 10.1.1 Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--bg-primary` | #FFFFFF | #1E1E1E | Main background |
| `--bg-secondary` | #F5F5F5 | #2A2A2A | Secondary surfaces |
| `--bg-tertiary` | #E5E5E5 | #3A3A3A | Tertiary surfaces |
| `--text-primary` | #1A1A1A | #FFFFFF | Primary text |
| `--text-secondary` | #666666 | #A0A0A0 | Secondary text |
| `--text-muted` | #999999 | #666666 | Muted text |
| `--accent-primary` | #3B82F6 | #3B82F6 | Primary actions |
| `--accent-success` | #10B981 | #10B981 | Success states |
| `--accent-warning` | #F59E0B | #F59E0B | Warning states |
| `--accent-error` | #EF4444 | #EF4444 | Error states |
| `--border-default` | #E5E5E5 | #404040 | Default borders |

#### 10.1.2 Typography

| Token | Font | Size | Weight | Line Height |
|-------|------|------|--------|-------------|
| `--text-h1` | System | 24px | 700 | 1.2 |
| `--text-h2` | System | 20px | 600 | 1.25 |
| `--text-h3` | System | 16px | 600 | 1.3 |
| `--text-body` | System | 14px | 400 | 1.5 |
| `--text-small` | System | 12px | 400 | 1.4 |
| `--text-code` | Monospace | 13px | 400 | 1.5 |

#### 10.1.3 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing |
| `--space-2` | 8px | Default spacing |
| `--space-3` | 12px | Medium spacing |
| `--space-4` | 16px | Large spacing |
| `--space-5` | 24px | Section spacing |
| `--space-6` | 32px | Layout spacing |

### 10.2 Component Specifications

#### 10.2.1 Tab Bar

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───┐  │  [🔒] [🌐] [🤖] [⚙️]      │
│ │ 🌐 Tab 1│ │ 📄 Tab 2│ │ 🔒 Tab 3│ │ + │  │                            │
│ │    ×    │ │    ×    │ │    ×    │ └───┘  │                            │
│ └─────────┘ └─────────┘ └─────────┘        │                            │
└──────────────────────────────────────────────────────────────────────────┘

Tab States:
- Default: bg-secondary, text-secondary
- Active: bg-primary, text-primary, border-bottom accent
- Hover: bg-tertiary
- Loading: animated spinner icon

Tab Elements:
- Favicon (16x16)
- Title (truncated at 120px)
- Close button (visible on hover)
- Proxy indicator (colored dot)
```

#### 10.2.2 Address Bar

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [←] [→] [⟳]  │ 🔒 https://example.com/page              │ [⭐] [📥]  │
└──────────────────────────────────────────────────────────────────────────┘

Elements:
- Back button: Disabled when can't go back
- Forward button: Disabled when can't go forward  
- Reload button: Changes to stop when loading
- Security indicator: Lock icon with color
- URL input: Editable, shows full URL on focus
- Bookmark button: Star icon, filled when bookmarked
- Download indicator: Shows active downloads
```

#### 10.2.3 Proxy Panel

```
┌─────────────────────────────────────┐
│ Proxy Management            [×]    │
├─────────────────────────────────────┤
│ [Add Proxy] [Import] [Validate All]│
├─────────────────────────────────────┤
│ Rotation Strategy: [Round Robin ▼] │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐│
│ │ 🟢 US Proxy 1                   ││
│ │    192.168.1.100:8080          ││
│ │    HTTP | 45ms | Active        ││
│ │    [Validate] [Edit] [Delete]  ││
│ └─────────────────────────────────┘│
│ ┌─────────────────────────────────┐│
│ │ 🔴 EU Proxy 2                   ││
│ │    10.0.0.50:3128              ││
│ │    SOCKS5 | - | Failed         ││
│ │    [Validate] [Edit] [Delete]  ││
│ └─────────────────────────────────┘│
│ ┌─────────────────────────────────┐│
│ │ 🟡 Asia Proxy 3                 ││
│ │    proxy.asia.com:1080         ││
│ │    SOCKS4 | Checking...        ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│ Total: 3 | Active: 1 | Failed: 1  │
└─────────────────────────────────────┘
```

#### 10.2.4 Privacy Panel

```
┌─────────────────────────────────────┐
│ Privacy Protection          [×]    │
├─────────────────────────────────────┤
│ 🛡️ Protection Status: STRONG      │
├─────────────────────────────────────┤
│ WebRTC Protection                  │
│ [Disable Non-Proxied         ▼]   │
│ ℹ️ Blocks local IP discovery       │
├─────────────────────────────────────┤
│ Fingerprint Spoofing               │
│ [✓] Canvas    [✓] WebGL           │
│ [✓] Audio     [✓] Navigator       │
│ [✓] Timezone  [ ] Fonts           │
├─────────────────────────────────────┤
│ Tracker Blocking    [Enabled ✓]   │
│ [✓] Ads (1,234 blocked)           │
│ [✓] Analytics (567 blocked)       │
│ [✓] Social (89 blocked)           │
│ [✓] Cryptomining (12 blocked)     │
│ [✓] Fingerprinting (45 blocked)   │
├─────────────────────────────────────┤
│ Total Blocked: 1,947              │
│ [Test Protection] [Reset Stats]   │
└─────────────────────────────────────┘
```

#### 10.2.5 Automation Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│ Automation                                                    [×]  │
├─────────────────────────────────────────────────────────────────────┤
│ [Dashboard] [Search] [Domain] [Analytics] [Logs]                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Status: 🟢 RUNNING                    [⏸️ Pause] [⏹️ Stop]        │
│                                                                     │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐             │
│  │ Completed     │ │ Failed        │ │ Pending       │             │
│  │     127       │ │      3        │ │     70        │             │
│  └───────────────┘ └───────────────┘ └───────────────┘             │
│                                                                     │
│  Progress: ████████████░░░░░░░░ 63.5%                              │
│  Active Tabs: 12/50                                                │
│  Est. Completion: 15 minutes                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Active Tasks                                                 │   │
│  │ • Tab 1: Searching "best coffee shops" on Google            │   │
│  │ • Tab 2: Visiting example.com (45s remaining)               │   │
│  │ • Tab 3: Extracting results for "coffee beans"              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.3 Wireframe Descriptions

#### 10.3.1 Add Proxy Modal

```
┌─────────────────────────────────────┐
│ Add New Proxy               [×]    │
├─────────────────────────────────────┤
│ Name                               │
│ ┌─────────────────────────────────┐│
│ │ My Proxy                        ││
│ └─────────────────────────────────┘│
│                                    │
│ Host *                             │
│ ┌─────────────────────────────────┐│
│ │ 192.168.1.100                   ││
│ └─────────────────────────────────┘│
│                                    │
│ Port *                             │
│ ┌─────────────────────────────────┐│
│ │ 8080                            ││
│ └─────────────────────────────────┘│
│                                    │
│ Protocol *                         │
│ ┌─────────────────────────────────┐│
│ │ HTTP                         ▼ ││
│ └─────────────────────────────────┘│
│                                    │
│ ─── Authentication (Optional) ─── │
│                                    │
│ Username                           │
│ ┌─────────────────────────────────┐│
│ │                                 ││
│ └─────────────────────────────────┘│
│                                    │
│ Password                           │
│ ┌─────────────────────────────────┐│
│ │ ••••••••                    👁️ ││
│ └─────────────────────────────────┘│
│                                    │
│ [✓] Validate after saving          │
│                                    │
│        [Cancel]  [Save Proxy]      │
└─────────────────────────────────────┘
```

### 10.4 Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl/Cmd + T` | New tab | Global |
| `Ctrl/Cmd + W` | Close tab | Global |
| `Ctrl/Cmd + Tab` | Next tab | Global |
| `Ctrl/Cmd + Shift + Tab` | Previous tab | Global |
| `Ctrl/Cmd + L` | Focus address bar | Global |
| `Ctrl/Cmd + R` | Reload | Global |
| `Ctrl/Cmd + Shift + R` | Hard reload | Global |
| `Ctrl/Cmd + P` | Toggle proxy panel | Global |
| `Ctrl/Cmd + Shift + P` | Toggle privacy panel | Global |
| `Ctrl/Cmd + Shift + A` | Toggle automation panel | Global |
| `Ctrl/Cmd + ,` | Open settings | Global |
| `Escape` | Close panel / Stop loading | Context |
| `F5` | Reload | Global |
| `F12` | Toggle DevTools | Global |

---

## 11. Functional Requirements

### 11.1 Requirements Summary

| Category | Must Have | Should Have | Could Have | Total |
|----------|-----------|-------------|------------|-------|
| Proxy Management | 6 | 4 | 0 | 10 |
| Privacy Protection | 7 | 4 | 0 | 11 |
| Tab Management | 5 | 3 | 2 | 10 |
| Search Automation | 6 | 4 | 0 | 10 |
| Domain Targeting | 5 | 4 | 1 | 10 |
| Autonomous Execution | 6 | 4 | 0 | 10 |
| Creator Support | 6 | 4 | 0 | 10 |
| **Total** | **41** | **27** | **3** | **71** |

### 11.2 Detailed Requirements

See Section 5 (User Stories) for detailed functional requirements with acceptance criteria.

---

## 12. Non-Functional Requirements

### 12.1 Performance Requirements

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR-P-001 | Application launch time | < 3 seconds | P0 |
| NFR-P-002 | Tab creation time | < 500ms | P0 |
| NFR-P-003 | UI response time | < 100ms | P0 |
| NFR-P-004 | Memory per tab (average) | < 200MB | P1 |
| NFR-P-005 | CPU usage (idle) | < 5% | P1 |
| NFR-P-006 | Proxy rotation time | < 100ms | P0 |
| NFR-P-007 | Tracker blocking latency | < 1ms | P0 |
| NFR-P-008 | Database query time | < 10ms | P1 |
| NFR-P-009 | Maximum concurrent tabs | 50 | P0 |
| NFR-P-010 | Memory cleanup on tab close | < 1 second | P1 |

### 12.2 Reliability Requirements

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR-R-001 | Application uptime | > 99.9% | P0 |
| NFR-R-002 | Automation success rate | > 98% | P0 |
| NFR-R-003 | Error recovery rate | > 95% | P1 |
| NFR-R-004 | Data persistence reliability | 100% | P0 |
| NFR-R-005 | WebRTC leak prevention | 100% | P0 |
| NFR-R-006 | Tab isolation effectiveness | 100% | P0 |
| NFR-R-007 | Crash recovery | > 90% state recovery | P1 |

### 12.3 Security Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-S-001 | Encrypt proxy credentials at rest | P0 |
| NFR-S-002 | Context isolation for IPC | P0 |
| NFR-S-003 | Sandbox BrowserViews | P0 |
| NFR-S-004 | Input validation and sanitization | P0 |
| NFR-S-005 | TLS certificate validation | P0 |
| NFR-S-006 | CSP headers for renderer | P1 |
| NFR-S-007 | Secure credential storage (OS keychain) | P1 |

### 12.4 Compatibility Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-C-001 | Windows 10/11 (64-bit) | P0 |
| NFR-C-002 | macOS 11+ (Intel & Apple Silicon) | P0 |
| NFR-C-003 | Linux (Ubuntu 20.04+, Debian, Fedora) | P1 |
| NFR-C-004 | Screen resolution 1280x720 minimum | P0 |
| NFR-C-005 | Chrome extensions (Manifest v2/v3) | P2 |

---

## 13. Security Requirements

### 13.1 Threat Model

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| Credential theft | High | Medium | Encryption at rest, OS keychain |
| Session hijacking | High | Low | Process isolation, session partitioning |
| WebRTC leak | High | High | Multiple protection layers |
| XSS in renderer | High | Low | CSP headers, input sanitization |
| Malicious extension | Medium | Medium | Manifest validation, sandboxing |
| Data exfiltration | High | Low | Network monitoring, IPC validation |

### 13.2 Security Controls

| Control | Implementation | Status |
|---------|----------------|--------|
| Encryption at Rest | AES-256 for sensitive data | Planned |
| Process Isolation | Electron sandbox + partitions | Planned |
| Input Validation | Zod schemas for all inputs | Planned |
| Secure IPC | contextBridge with validation | Planned |
| CSP Headers | Strict policy for renderer | Planned |
| Audit Logging | All security events logged | Planned |

---

## 14. Testing Requirements

### 14.1 Testing Strategy

#### 14.1.1 Testing Pyramid

```
                    ┌─────────┐
                    │   E2E   │  10%
                   ─┴─────────┴─
                  ┌─────────────┐
                  │ Integration │  20%
                 ─┴─────────────┴─
                ┌─────────────────┐
                │      Unit       │  70%
               ─┴─────────────────┴─
```

#### 14.1.2 Coverage Targets

| Test Type | Coverage Target | Tools |
|-----------|-----------------|-------|
| Unit Tests | > 80% | Vitest |
| Integration Tests | > 60% | Vitest + Testing Library |
| E2E Tests | Critical paths | Playwright |
| Performance Tests | All NFRs | Custom benchmarks |
| Security Tests | All controls | Manual + automated |

### 14.2 Unit Test Cases

#### 14.2.1 Proxy Manager Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| PM-UT-001 | Add valid proxy | Proxy added to database |
| PM-UT-002 | Add proxy with invalid port | Validation error |
| PM-UT-003 | Delete existing proxy | Proxy removed |
| PM-UT-004 | Validate active proxy | Status: active, latency recorded |
| PM-UT-005 | Validate failed proxy | Status: failed, error recorded |
| PM-UT-006 | Round robin rotation | Proxies selected sequentially |
| PM-UT-007 | Random rotation | Different proxy each call |
| PM-UT-008 | Failover on failure | Next proxy selected |
| PM-UT-009 | Bulk import valid format | All proxies imported |
| PM-UT-010 | Bulk import invalid format | Errors reported per line |

#### 14.2.2 Privacy Protection Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| PP-UT-001 | WebRTC disable policy | No RTCPeerConnection |
| PP-UT-002 | Canvas spoofing enabled | Different hash per session |
| PP-UT-003 | Canvas spoofing consistency | Same hash within session |
| PP-UT-004 | Navigator spoofing | Properties match config |
| PP-UT-005 | Tracker blocked | Request intercepted |
| PP-UT-006 | Whitelisted domain passes | Request allowed |
| PP-UT-007 | Block counter increments | Stats updated |
| PP-UT-008 | WebGL spoofing | Renderer info modified |
| PP-UT-009 | Audio spoofing | Audio context modified |
| PP-UT-010 | Timezone spoofing | Date APIs return spoofed TZ |

#### 14.2.3 Tab Management Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| TM-UT-001 | Create isolated tab | Unique partition assigned |
| TM-UT-002 | Close tab | Resources released |
| TM-UT-003 | Navigate tab | URL updated |
| TM-UT-004 | Assign proxy to tab | Proxy applied |
| TM-UT-005 | Tab limit enforced | Error at 51st tab |
| TM-UT-006 | Tab isolation verified | No shared cookies |
| TM-UT-007 | Tab recycle | Partition cleared |
| TM-UT-008 | Memory monitoring | Usage tracked |
| TM-UT-009 | Tab suspension | State preserved |
| TM-UT-010 | Tab restoration | State restored |

### 14.3 Integration Test Cases

| Test ID | Description | Components | Expected Result |
|---------|-------------|------------|-----------------|
| INT-001 | Proxy + Tab integration | ProxyManager, TabManager | Tab uses assigned proxy |
| INT-002 | Privacy + Tab integration | PrivacyCore, TabManager | Fingerprint applied to tab |
| INT-003 | Search automation flow | Automation, Tab, Proxy | Search completes with results |
| INT-004 | Domain click simulation | Automation, Tab | Target domain visited |
| INT-005 | Creator support flow | Creator, Tab, Automation | Ads viewed and logged |
| INT-006 | Schedule execution | Scheduler, Automation | Task runs at scheduled time |
| INT-007 | Error recovery | Automation, Proxy | Recovers from proxy failure |
| INT-008 | Session persistence | Session, Database | Session restored correctly |
| INT-009 | IPC communication | Main, Renderer | Messages delivered |
| INT-010 | Database operations | All modules, Database | CRUD operations succeed |

### 14.4 E2E Test Cases

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| E2E-001 | First launch experience | Launch app, accept defaults | App ready to use |
| E2E-002 | Add and use proxy | Add proxy, assign to tab, browse | Pages load through proxy |
| E2E-003 | Privacy protection | Enable all protections, verify | All tests pass on privacy sites |
| E2E-004 | Search automation | Add keywords, run search | Results extracted |
| E2E-005 | Domain targeting | Configure domain, run search | Domain clicked and visited |
| E2E-006 | Creator support | Add creator, enable support | Ads viewed |
| E2E-007 | Session save/restore | Create tabs, save, restore | All tabs restored |
| E2E-008 | Bulk proxy import | Import 100 proxies | All valid proxies added |
| E2E-009 | Concurrent tabs | Open 50 tabs | All tabs functional |
| E2E-010 | Full automation cycle | Configure all, run 1 hour | Completes without errors |

### 14.5 Performance Test Cases

| Test ID | Metric | Method | Target |
|---------|--------|--------|--------|
| PERF-001 | Launch time | Time to ready state | < 3s |
| PERF-002 | Tab creation | Time to create 10 tabs | < 5s |
| PERF-003 | Memory usage | 50 tabs memory | < 10GB |
| PERF-004 | CPU idle | Idle with 10 tabs | < 5% |
| PERF-005 | Proxy rotation | 1000 rotations | < 100ms avg |
| PERF-006 | Tracker blocking | 10000 requests | < 1ms avg |
| PERF-007 | Database queries | 1000 queries | < 10ms avg |
| PERF-008 | UI responsiveness | User interaction | < 100ms |

---

## 15. Development Roadmap

### 15.1 Phase Overview

| Phase | Duration | Focus | Deliverables |
|-------|----------|-------|--------------|
| Phase 1 | Weeks 1-4 | Core Foundation | Electron shell, tabs, basic UI |
| Phase 2 | Weeks 5-8 | Proxy System | Full proxy management |
| Phase 3 | Weeks 9-12 | Privacy Suite | All privacy features |
| Phase 4 | Weeks 13-18 | Automation | Search, domain, autonomous |
| Phase 5 | Weeks 19-22 | Polish & Release | Testing, optimization, launch |

### 15.2 Detailed Timeline

#### Phase 1: Core Foundation (Weeks 1-4)

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 1 | Project setup, Electron scaffold | Build system, basic window |
| 2 | Tab system, BrowserView integration | Tab creation, navigation |
| 3 | UI framework, component library | Design system, core components |
| 4 | IPC architecture, state management | IPC handlers, Zustand stores |

#### Phase 2: Proxy System (Weeks 5-8)

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 5 | Proxy CRUD, database schema | Add/edit/delete proxies |
| 6 | Proxy validation, health monitoring | Real-time status |
| 7 | Rotation strategies | All 10 strategies |
| 8 | Per-tab proxy assignment | Proxy isolation |

#### Phase 3: Privacy Suite (Weeks 9-12)

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 9 | WebRTC protection | All 4 policies |
| 10 | Fingerprint spoofing | Canvas, WebGL, Audio |
| 11 | Navigator, timezone spoofing | Full fingerprint suite |
| 12 | Tracker blocking | Category blocking, stats |

#### Phase 4: Automation Engine (Weeks 13-18)

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 13 | Search automation core | Keyword queue, execution |
| 14 | Result extraction | SERP parsing, position tracking |
| 15 | Domain targeting | Click simulation, dwell time |
| 16 | Autonomous engine | Self-healing, scheduling |
| 17 | Creator support | Platform detection, ad viewing |
| 18 | Integration, refinement | Full automation flow |

#### Phase 5: Polish & Release (Weeks 19-22)

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 19 | Performance optimization | Meet all NFRs |
| 20 | Security hardening | All security controls |
| 21 | E2E testing, bug fixes | Release candidate |
| 22 | Documentation, launch | v1.0.0 release |

### 15.3 Milestones

| Milestone | Date | Criteria |
|-----------|------|----------|
| M1: Core Complete | Week 4 | Tabs, navigation, UI working |
| M2: Proxy Complete | Week 8 | Full proxy functionality |
| M3: Privacy Complete | Week 12 | All privacy features |
| M4: Automation Complete | Week 18 | Full automation suite |
| M5: Release Candidate | Week 21 | All tests passing |
| M6: v1.0.0 Release | Week 22 | Public release |

---

## 16. Risk Assessment and Mitigation

### 16.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Electron memory leaks | Medium | High | Regular profiling, proper cleanup |
| WebRTC bypass discovery | Low | High | Multiple protection layers |
| Search engine detection | High | Medium | Human-like behavior, proxy rotation |
| Performance degradation | Medium | Medium | Continuous benchmarking |
| Cross-platform issues | Medium | Medium | CI/CD testing on all platforms |

### 16.2 Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | High | Medium | Strict prioritization |
| Timeline slippage | Medium | Medium | Buffer time, MVP focus |
| Resource constraints | Medium | High | Clear task allocation |
| Technical debt | Medium | Medium | Code reviews, refactoring sprints |
| Dependency issues | Low | Medium | Lock versions, audit regularly |

### 16.3 Legal/Compliance Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Terms of service violations | Medium | High | Ethical guidelines, rate limiting |
| Privacy regulations | Low | High | GDPR compliance, no data collection |
| Copyright issues | Low | Medium | License audits, original code |

---

## 17. Success Metrics and KPIs

### 17.1 Launch Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| All P0 requirements | 100% complete | Requirement tracking |
| Unit test coverage | > 80% | Coverage reports |
| E2E tests passing | 100% | Test results |
| No P0/P1 bugs | 0 open | Bug tracking |
| Performance targets | All met | Benchmark results |
| Security audit | Pass | Audit report |

### 17.2 Post-Launch KPIs

| KPI | Target (Month 1) | Target (Month 6) |
|-----|------------------|------------------|
| Active Users | 1,000 | 10,000 |
| Daily Active Users | 200 | 3,000 |
| Crash-free rate | > 99% | > 99.5% |
| User satisfaction | > 4.0/5 | > 4.5/5 |
| Feature adoption | > 50% | > 70% |

---

## 18. Appendices

### 18.1 Glossary

| Term | Definition |
|------|------------|
| BrowserView | Electron's embedded browser component |
| Fingerprint | Unique browser/device identifier |
| ICE Candidate | WebRTC connection candidate |
| IPC | Inter-Process Communication |
| Partition | Isolated session storage in Electron |
| SERP | Search Engine Results Page |
| WebRTC | Web Real-Time Communication |

### 18.2 References

1. Electron Documentation: https://www.electronjs.org/docs
2. React Documentation: https://react.dev/
3. Zustand Documentation: https://github.com/pmndrs/zustand
4. WebRTC Leak Test: https://browserleaks.com/webrtc
5. Fingerprint Test: https://amiunique.org/

### 18.3 Document Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-27 | 1.0.0 | Initial draft |
| 2026-01-27 | 2.0.0 | Detailed specification with user stories, API specs, wireframes, test cases |

---

**END OF DOCUMENT**

