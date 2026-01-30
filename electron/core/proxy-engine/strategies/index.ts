/**
 * Proxy Rotation Strategies Index
 * Exports all rotation strategy implementations
 */

export { BaseStrategy, type IRotationStrategy } from './base-strategy';
export { RoundRobinStrategy } from './round-robin';
export { RandomStrategy } from './random';
export { LeastUsedStrategy } from './least-used';
export { FastestStrategy } from './fastest';
export { FailureAwareStrategy } from './failure-aware';
export { WeightedStrategy } from './weighted';
export { GeographicStrategy } from './geographic';
export { StickySessionStrategy } from './sticky-session';
export { TimeBasedStrategy } from './time-based';
export { CustomRulesStrategy } from './custom-rules';
