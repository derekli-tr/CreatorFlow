/**
 * Unified Interaction Event Detector
 * Combines React Fiber detection + addEventListener interception
 *
 * Usage:
 * - Same-origin: iframe.contentWindow.__interactionDetector__.hasInteractionEvents(element)
 * - Cross-origin: via postMessage with checkInteraction
 */

import {
  hasReactInteractionEvents,
  getReactInteractionEventsDetail,
  hasReactInteractionEventsOnSelf,
} from "./reactEventDetector";
import {
  hasAddEventListenerInteractions,
  getAddEventListenerDetail,
} from "./enhancedEventDetector";

/**
 * Detection result type
 */
export interface InteractionDetail {
  hasEvents: boolean;
  react: ReturnType<typeof getReactInteractionEventsDetail>;
  native: ReturnType<typeof getAddEventListenerDetail>;
}

export interface CheckResult {
  error?: string;
  selector?: string;
  x?: number;
  y?: number;
  hasEvents?: boolean;
  detail?: InteractionDetail;
}

/**
 * Check if element has interaction events
 * Combines React events and native addEventListener events
 */
export function hasInteractionEvents(element: HTMLElement): boolean {
  if (!element) return false;
  return (
    hasReactInteractionEvents(element) ||
    hasAddEventListenerInteractions(element)
  );
}

/**
 * Check if element itself has interaction events (excluding parents)
 */
export function hasInteractionEventsOnSelf(element: HTMLElement): boolean {
  if (!element) return false;
  return (
    hasReactInteractionEventsOnSelf(element) ||
    hasAddEventListenerInteractions(element)
  );
}

/**
 * Get detailed interaction events info for an element
 */
export function getInteractionEventsDetail(
  element: HTMLElement,
): InteractionDetail {
  const reactDetail = getReactInteractionEventsDetail(element);
  const nativeDetail = getAddEventListenerDetail(element);

  return {
    hasEvents: reactDetail.hasEvents || nativeDetail.hasEvents,
    react: reactDetail,
    native: nativeDetail,
  };
}

/**
 * Check if element has interaction events by selector
 */
export function checkBySelector(selector: string): CheckResult {
  if (!selector) {
    return { error: "selector is required" };
  }

  const element = document.querySelector(selector) as HTMLElement;

  if (!element) {
    return { error: "Element not found", selector };
  }

  const detail = getInteractionEventsDetail(element);

  return {
    selector,
    hasEvents: detail.hasEvents,
    // detail,
  };
}

/**
 * Check if element has interaction events by coordinates
 * Used for mouse click position detection
 */
export function checkByPoint(x: number, y: number): CheckResult {
  if (typeof x !== "number" || typeof y !== "number") {
    return { error: "x and y must be numbers" };
  }

  const element = document.elementFromPoint(x, y) as HTMLElement;

  if (!element) {
    return { error: "No element at point", x, y };
  }

  const detail = getInteractionEventsDetail(element);

  return {
    x,
    y,
    hasEvents: detail.hasEvents,
    // detail,
  };
}

/**
 * Batch check multiple elements
 */
export function checkMultiple(
  elements: HTMLElement[],
): Array<{ element: HTMLElement; hasEvents: boolean }> {
  return elements.map((element) => ({
    element,
    hasEvents: hasInteractionEvents(element),
  }));
}

/**
 * Batch check multiple selectors
 */
export function checkMultipleSelectors(
  selectors: string[],
): Array<{ selector: string; result: CheckResult }> {
  return selectors.map((selector) => ({
    selector,
    result: checkBySelector(selector),
  }));
}
