/**
 * Automation Constants
 * Named constants for automation, scheduling, and behavior simulation
 * 
 * @module electron/core/automation/constants
 */

// =============================================================================
// Scheduler Constants
// =============================================================================

/**
 * Interval in ms for checking cron schedules (1 minute)
 */
export const CRON_CHECK_INTERVAL_MS = 60000;

/**
 * Minimum delay in ms for continuous schedule type
 * Prevents CPU spinning by adding small delay between executions
 */
export const CONTINUOUS_SCHEDULE_DELAY_MS = 1000;

/**
 * Maximum iterations when searching for next valid day in recurring schedules
 * Checks up to one week ahead
 */
export const MAX_DAY_SEARCH_ITERATIONS = 7;

// =============================================================================
// Cron Parser Constants
// =============================================================================

/**
 * Maximum iterations when calculating next cron execution
 * Equivalent to 1 year worth of minutes (365 * 24 * 60)
 * Prevents infinite loops when searching for next execution time
 */
export const MAX_CRON_ITERATIONS = 525600;

/**
 * Number of fields in a standard cron expression
 * Format: minute hour dayOfMonth month dayOfWeek
 */
export const CRON_FIELD_COUNT = 5;

// =============================================================================
// Behavior Simulator Constants
// =============================================================================

/** Default minimum typing speed in ms per character */
export const DEFAULT_TYPING_SPEED_MIN_MS = 50;

/** Default maximum typing speed in ms per character */
export const DEFAULT_TYPING_SPEED_MAX_MS = 200;

/** Default variance percentage for human-like delays */
export const DEFAULT_VARIANCE_PERCENT = 0.3;

/**
 * Probability of occasional longer pause while typing (simulating thinking)
 */
export const TYPING_PAUSE_PROBABILITY = 0.05;

/** Minimum additional pause duration in ms */
export const TYPING_PAUSE_MIN_MS = 100;

/** Maximum additional pause duration in ms */
export const TYPING_PAUSE_MAX_MS = 400;

// =============================================================================
// Action Sequence Generation Constants
// =============================================================================

/** Maximum initial scroll time in ms */
export const MAX_INITIAL_SCROLL_TIME_MS = 2000;

/** Initial scroll time as fraction of total duration */
export const INITIAL_SCROLL_TIME_FRACTION = 0.1;

/** Minimum remaining time to continue generating actions in ms */
export const MIN_REMAINING_TIME_MS = 5000;

/** Mean reading time in ms for gaussian distribution */
export const READING_TIME_MEAN_MS = 8000;

/** Standard deviation for reading time in ms */
export const READING_TIME_STD_DEV_MS = 3000;

/** Maximum fraction of remaining time for reading phase */
export const READING_TIME_MAX_FRACTION = 0.4;

/** Minimum reading time in ms */
export const MIN_READING_TIME_MS = 1000;

/** Minimum remaining time to add scroll in ms */
export const MIN_TIME_FOR_SCROLL_MS = 3000;

/** Minimum scroll duration in ms */
export const SCROLL_DURATION_MIN_MS = 500;

/** Maximum additional scroll duration in ms */
export const SCROLL_DURATION_RANGE_MS = 1500;

/** Maximum fraction of remaining time for scroll */
export const SCROLL_TIME_MAX_FRACTION = 0.1;

/** Probability of mouse movement action */
export const MOUSE_MOVE_PROBABILITY = 0.3;

/** Minimum remaining time to add mouse movement in ms */
export const MIN_TIME_FOR_MOUSE_MOVE_MS = 2000;

/** Minimum mouse move duration in ms */
export const MOUSE_MOVE_DURATION_MIN_MS = 200;

/** Maximum additional mouse move duration in ms */
export const MOUSE_MOVE_DURATION_RANGE_MS = 500;

/** Maximum fraction of remaining time for mouse movement */
export const MOUSE_MOVE_TIME_MAX_FRACTION = 0.05;

/** Probability of pause action (simulating distraction) */
export const PAUSE_PROBABILITY = 0.2;

/** Minimum remaining time to add pause in ms */
export const MIN_TIME_FOR_PAUSE_MS = 3000;

/** Minimum pause duration in ms */
export const PAUSE_DURATION_MIN_MS = 500;

/** Maximum additional pause duration in ms */
export const PAUSE_DURATION_RANGE_MS = 2000;

/** Maximum fraction of remaining time for pause */
export const PAUSE_TIME_MAX_FRACTION = 0.1;

// =============================================================================
// Scroll Behavior Constants
// =============================================================================

/** Minimum number of scroll segments */
export const MIN_SCROLL_SEGMENTS = 3;

/** Maximum additional scroll segments */
export const SCROLL_SEGMENTS_RANGE = 4;

/** Minimum segment height multiplier */
export const SEGMENT_HEIGHT_MIN_MULTIPLIER = 0.8;

/** Segment height variance range */
export const SEGMENT_HEIGHT_VARIANCE = 0.4;

/** Minimum scroll animation duration in ms */
export const SCROLL_ANIMATION_MIN_MS = 400;

/** Maximum additional scroll animation duration in ms */
export const SCROLL_ANIMATION_RANGE_MS = 800;

/** Probability of pause after scroll */
export const SCROLL_PAUSE_PROBABILITY = 0.6;

/** Minimum pause after scroll in ms */
export const SCROLL_PAUSE_MIN_MS = 500;

/** Maximum additional pause after scroll in ms */
export const SCROLL_PAUSE_RANGE_MS = 2000;

/** Scroll depth options for weighted selection */
export const SCROLL_DEPTHS = [0.4, 0.6, 0.75, 0.9, 1.0];

/** Weights for scroll depth selection */
export const SCROLL_DEPTH_WEIGHTS = [0.15, 0.3, 0.3, 0.15, 0.1];

// =============================================================================
// Mouse Movement Constants
// =============================================================================

/** Base delay between mouse movement points in ms */
export const MOUSE_BASE_DELAY_MS = 15;

/** Minimum speed factor for mouse movement (at start/end) */
export const MOUSE_MIN_SPEED_FACTOR = 0.3;

/** Maximum jitter in pixels for mouse movement */
export const MOUSE_MAX_JITTER_PX = 8;

/** Default jitter amount for point positioning */
export const DEFAULT_JITTER_PX = 3;

// =============================================================================
// Reading Behavior Constants
// =============================================================================

/** Mean words per minute for reading speed calculation */
export const READING_WPM_MEAN = 200;

/** Standard deviation for words per minute */
export const READING_WPM_STD_DEV = 50;

/** Average word length in characters */
export const AVERAGE_WORD_LENGTH = 5;

/** Minimum reading time variance multiplier */
export const READING_TIME_MIN_VARIANCE = 0.8;

/** Maximum reading time variance multiplier */
export const READING_TIME_VARIANCE_RANGE = 0.4;

/** Interval for scroll events during reading in ms */
export const READING_SCROLL_INTERVAL_MS = 8000;

/** Interval for mouse movements during reading in ms */
export const READING_MOUSE_INTERVAL_MS = 15000;

// =============================================================================
// Navigation and Click Constants
// =============================================================================

/** Mean navigation delay between pages in ms */
export const NAVIGATION_DELAY_MEAN_MS = 4000;

/** Standard deviation for navigation delay in ms */
export const NAVIGATION_DELAY_STD_DEV_MS = 1500;

/** Minimum hover time before click in ms */
export const HOVER_DELAY_MIN_MS = 100;

/** Maximum additional hover time in ms */
export const HOVER_DELAY_RANGE_MS = 300;

/** Minimum click initiation time in ms */
export const CLICK_DELAY_MIN_MS = 20;

/** Maximum additional click initiation time in ms */
export const CLICK_DELAY_RANGE_MS = 50;

/** Minimum mouse button hold duration in ms */
export const CLICK_HOLD_MIN_MS = 40;

/** Maximum additional mouse button hold duration in ms */
export const CLICK_HOLD_RANGE_MS = 80;

// =============================================================================
// Task Executor Constants
// =============================================================================

/** Default maximum concurrent tasks */
export const DEFAULT_MAX_CONCURRENT_TASKS = 3;

/** Minimum concurrent tasks (cannot be lower) */
export const MIN_CONCURRENT_TASKS = 1;

// =============================================================================
// Proxy Validation Constants
// =============================================================================

/** Proxy connection timeout in ms */
export const PROXY_VALIDATION_TIMEOUT_MS = 10000;

/** Default number of latency test attempts */
export const DEFAULT_LATENCY_TEST_ATTEMPTS = 3;

/** Minimum latency test attempts */
export const MIN_LATENCY_TEST_ATTEMPTS = 1;

/** Maximum latency test attempts */
export const MAX_LATENCY_TEST_ATTEMPTS = 10;

// =============================================================================
// Input Validation Constants
// =============================================================================

/** Maximum proxy name length */
export const MAX_PROXY_NAME_LENGTH = 100;

/** Maximum proxy tag length */
export const MAX_PROXY_TAG_LENGTH = 50;

/** Maximum hostname length (RFC 1123) */
export const MAX_HOSTNAME_LENGTH = 253;

/** Maximum credential (username/password) length */
export const MAX_CREDENTIAL_LENGTH = 256;

/** Minimum valid port number */
export const MIN_PORT = 1;

/** Maximum valid port number */
export const MAX_PORT = 65535;

/** Default maximum proxies in pool */
export const DEFAULT_MAX_PROXIES = 100;
