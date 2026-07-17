/**
 * Continue Module Entry
 * Provides interaction event detection with two calling modes:
 *
 * 1. Same-origin: Direct call via window.__interactionDetector__
 * 2. Cross-origin: Via postMessage communication
 */

import { PostMessageClient } from "../post-message";
import { initEnhancedEventDetector } from "./enhancedEventDetector";
import { injectReactEventDetector } from "./reactEventDetector";
import {
  hasInteractionEvents,
  hasInteractionEventsOnSelf,
  getInteractionEventsDetail,
  checkBySelector,
  checkByPoint,
  checkMultiple,
  checkMultipleSelectors,
} from "./interactionDetector";

const VERSION = "1.0.0";

/**
 * Global API type exposed to window
 */
export interface InteractionDetectorAPI {
  // Core detection methods
  hasInteractionEvents: typeof hasInteractionEvents;
  hasInteractionEventsOnSelf: typeof hasInteractionEventsOnSelf;
  getDetail: typeof getInteractionEventsDetail;

  // Convenience methods
  checkBySelector: typeof checkBySelector;
  checkByPoint: typeof checkByPoint;
  checkMultiple: typeof checkMultiple;
  checkMultipleSelectors: typeof checkMultipleSelectors;

  // Meta info
  version: string;
}

// Declare global type
declare global {
  interface Window {
    __interactionDetector__?: InteractionDetectorAPI;
  }
}

/**
 * Initialize global API
 * In same-origin scenarios, parent window can call via iframe.contentWindow.__interactionDetector__
 */
function initGlobalAPI(): void {
  window.__interactionDetector__ = {
    // Core detection methods
    hasInteractionEvents,
    hasInteractionEventsOnSelf,
    getDetail: getInteractionEventsDetail,

    // Convenience methods
    checkBySelector,
    checkByPoint,
    checkMultiple,
    checkMultipleSelectors,

    // Meta info
    version: VERSION,
  };

  console.log(`[InteractionDetector] Global API initialized (v${VERSION})`);
}

/**
 * Initialize PostMessage listener
 * In cross-origin scenarios, parent window communicates via postMessage
 */
function initPostMessageListener(): void {
  const client = new PostMessageClient(window.parent);

  // Listen: check interaction events
  client.on(
    "checkInteraction",
    (data: { selector?: string; x?: number; y?: number }) => {
      const { selector, x, y } = data || {};

      // Check by selector
      if (selector) {
        return checkBySelector(selector);
      }

      // Check by coordinates
      if (typeof x === "number" && typeof y === "number") {
        return checkByPoint(x, y);
      }

      return { error: "Invalid params: need selector or (x, y)" };
    },
  );

  // Listen: batch check selectors
  client.on("checkMultipleSelectors", (data: { selectors?: string[] }) => {
    const { selectors } = data || {};

    if (!selectors || !Array.isArray(selectors)) {
      return { error: "selectors array is required" };
    }

    return checkMultipleSelectors(selectors);
  });

  console.log("[InteractionDetector] PostMessage listener initialized");
}

/**
 * Initialize Continue module
 *
 * ⚠️ Note: Must be called before React app starts
 * Because enhancedEventDetector needs to intercept addEventListener
 */
export function initContinueModule(): void {
  // 1. Initialize addEventListener interception (must run first)
  initEnhancedEventDetector();

  // 2. Initialize React event detector
  injectReactEventDetector();

  // 3. Initialize global API (same-origin mode)
  initGlobalAPI();

  // 4. Initialize PostMessage listener (cross-origin mode)
  initPostMessageListener();

  console.log("[Continue] Module fully initialized");
}

// Export all detection functions for other modules
export {
  hasInteractionEvents,
  hasInteractionEventsOnSelf,
  getInteractionEventsDetail,
  checkBySelector,
  checkByPoint,
  checkMultiple,
  checkMultipleSelectors,
};
