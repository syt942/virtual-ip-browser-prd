/**
 * Privacy Fingerprint Protection Constants
 * Named constants for WebGL, Canvas, and other fingerprint protection modules
 * 
 * @module electron/core/privacy/fingerprint/constants
 */

// =============================================================================
// WebGL Parameter Constants
// These values are defined by the WebGL specification and used for fingerprinting
// Reference: https://www.khronos.org/registry/webgl/specs/latest/1.0/
// =============================================================================

/**
 * WebGL extension parameter for unmasked vendor string
 * Used by WEBGL_debug_renderer_info extension to get GPU vendor
 */
export const WEBGL_UNMASKED_VENDOR = 37445;

/**
 * WebGL extension parameter for unmasked renderer string
 * Used by WEBGL_debug_renderer_info extension to get GPU renderer
 */
export const WEBGL_UNMASKED_RENDERER = 37446;

/**
 * WebGL parameter for version string (gl.VERSION)
 * Returns a version or release number of the form WebGL<space>1.0<space>
 */
export const WEBGL_VERSION = 7938;

/**
 * WebGL parameter for shading language version (gl.SHADING_LANGUAGE_VERSION)
 * Returns the version or release number for the shading language
 */
export const WEBGL_SHADING_LANGUAGE_VERSION = 35724;

// =============================================================================
// Canvas Protection Constants
// =============================================================================

/**
 * Maximum signed 32-bit integer value
 * Used for generating session seeds in canvas fingerprint protection
 */
export const MAX_INT32 = 2147483647;

/**
 * Maximum unsigned 32-bit integer value + 1
 * Used in Mulberry32 PRNG algorithm for normalization
 */
export const UINT32_RANGE = 4294967296;

/**
 * Minimum operation time in milliseconds for canvas operations
 * Prevents timing attacks by ensuring consistent execution time
 */
export const CANVAS_MIN_OPERATION_TIME_MS = 2;

/**
 * Default noise level for canvas fingerprint protection (1%)
 * Higher values provide more protection but may cause visual artifacts
 */
export const DEFAULT_CANVAS_NOISE = 0.01;

// =============================================================================
// Default Fingerprint Configurations
// =============================================================================

/** Default WebGL vendor string for spoofing */
export const DEFAULT_WEBGL_VENDOR = 'Intel Inc.';

/** Default WebGL renderer string for spoofing */
export const DEFAULT_WEBGL_RENDERER = 'Intel Iris OpenGL Engine';

/** Default WebGL version string */
export const DEFAULT_WEBGL_VERSION = 'WebGL 1.0';

/** Default GLSL version string */
export const DEFAULT_GLSL_VERSION = 'WebGL GLSL ES 1.0';

// =============================================================================
// Noise Constants for Canvas/WebGL Protection
// =============================================================================

/**
 * Maximum color channel value (8-bit)
 */
export const MAX_COLOR_CHANNEL_VALUE = 255;

/**
 * Number of color channels to process (RGBA)
 */
export const RGBA_CHANNELS = 4;

/**
 * Number of color channels to modify (RGB, alpha unchanged)
 */
export const RGB_CHANNELS = 3;
