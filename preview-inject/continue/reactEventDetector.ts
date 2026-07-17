/**
 * React Event Detector
 * Detects interaction events on React components via Fiber tree traversal
 *
 * Usage:
 * 1. Inject this code into the iframe's React app (via build script or script tag)
 * 2. Call iframe.contentWindow.hasReactInteractionEvents(element) from the parent app
 */

interface ReactFiberNode {
  return?: ReactFiberNode;
  memoizedProps?: Record<string, any>;
  stateNode?: any;
  child?: ReactFiberNode;
  sibling?: ReactFiberNode;
  alternate?: ReactFiberNode;
  type?: any;
  elementType?: any;
}

/**
 * Core interaction event props (only obvious user interactions)
 */
const REACT_EVENT_PROPS = [
  // Click events (most common interactions)
  "onClick",
  "onDoubleClick",
  "onContextMenu",

  // Press/release (buttons, drag interactions)
  "onMouseDown",
  "onMouseUp",
  "onPointerDown",
  "onPointerUp",
  "onTouchStart",
  "onTouchEnd",

  // Drag interactions
  "onDragStart",
  "onDrop",

  // Form interactions
  "onChange",
  "onSubmit",

  // Keyboard interactions
  "onKeyDown",
  "onKeyUp",
] as const;

/**
 * Get React Fiber node from DOM element
 */
function getFiberNode(element: HTMLElement): ReactFiberNode | null {
  // React 17+
  const key = Object.keys(element).find(
    (key) =>
      key.startsWith("__reactFiber$") ||
      key.startsWith("__reactInternalInstance$"),
  );

  if (key) {
    return (element as any)[key] as ReactFiberNode;
  }

  return null;
}

/**
 * Check if props object contains interaction events
 */
function hasInteractionPropsInObject(props: Record<string, any>): boolean {
  if (!props || typeof props !== "object") return false;

  return REACT_EVENT_PROPS.some((eventProp) => {
    const value = props[eventProp];
    return typeof value === "function";
  });
}

/**
 * Get all interaction events from props
 */
function getInteractionEvents(props: Record<string, any>): string[] {
  if (!props || typeof props !== "object") return [];

  return REACT_EVENT_PROPS.filter((eventProp) => {
    const value = props[eventProp];
    return typeof value === "function";
  });
}

/**
 * Check if React element has interaction events (checks self and all parent components)
 */
export function hasReactInteractionEvents(element: HTMLElement): boolean {
  let fiber = getFiberNode(element);

  while (fiber) {
    // Check current Fiber's props
    if (
      fiber.memoizedProps &&
      hasInteractionPropsInObject(fiber.memoizedProps)
    ) {
      return true;
    }

    // Traverse up the Fiber tree
    fiber = fiber.return || null;
  }

  return false;
}

/**
 * Get detailed interaction events info for element and its parent components
 */
export function getReactInteractionEventsDetail(element: HTMLElement): {
  hasEvents: boolean;
  events: Array<{
    componentName: string;
    eventNames: string[];
    props: Record<string, any>;
  }>;
} {
  const result: {
    hasEvents: boolean;
    events: Array<{
      componentName: string;
      eventNames: string[];
      props: Record<string, any>;
    }>;
  } = {
    hasEvents: false,
    events: [],
  };

  let fiber = getFiberNode(element);

  while (fiber) {
    if (fiber.memoizedProps) {
      const eventNames = getInteractionEvents(fiber.memoizedProps);

      if (eventNames.length > 0) {
        result.hasEvents = true;

        // Get component name
        const componentName =
          fiber.type?.displayName ||
          fiber.type?.name ||
          fiber.elementType?.name ||
          "Unknown";

        result.events.push({
          componentName,
          eventNames,
          props: fiber.memoizedProps,
        });
      }
    }

    fiber = fiber.return || null;
  }

  return result;
}

/**
 * Check if element itself (excluding parents) has interaction events
 */
export function hasReactInteractionEventsOnSelf(element: HTMLElement): boolean {
  const fiber = getFiberNode(element);

  if (!fiber || !fiber.memoizedProps) {
    return false;
  }

  return hasInteractionPropsInObject(fiber.memoizedProps);
}

/**
 * Inject detector to iframe's global object
 */
export function injectReactEventDetector(targetWindow: Window = window): void {
  (targetWindow as any).__reactEventDetector__ = {
    hasReactInteractionEvents,
    getReactInteractionEventsDetail,
    hasReactInteractionEventsOnSelf,
    REACT_EVENT_PROPS,
  };

  console.log("[ReactEventDetector] Injected to window.__reactEventDetector__");
}

// Auto-inject in browser environment
if (typeof window !== "undefined" && !import.meta.env?.SSR) {
  injectReactEventDetector(window);
}
