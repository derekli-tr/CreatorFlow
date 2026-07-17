import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import FiberDebugger from "./fibber-debugger";

// Type definitions
type FiberNode = object;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RefCallback = (instance: any) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RefObject = { current: any };
type Ref = RefCallback | RefObject | null | undefined;
type ElementType = string | React.ComponentType<unknown>;

interface JsxProps {
  ref?: Ref;
  [key: string]: unknown;
}

type JsxFunction = (
  type: ElementType,
  props: JsxProps,
  key?: string,
) => React.ReactElement;

type JsxDevFunction = (
  type: ElementType,
  props: JsxProps,
  key?: string,
  isStaticChildren?: boolean,
  source?: unknown,
  self?: unknown,
) => React.ReactElement;

interface JsxRuntime {
  jsx: JsxFunction;
  jsxs: JsxFunction;
}

interface JsxDevRuntime {
  jsxDEV?: JsxDevFunction;
}

export const DEBUG_ERROR_KEY = "debugerror";

// Store debug information for all elements (with Fiber node as key)
const fiberDebugMap = new WeakMap<FiberNode, () => Error>();
// Store debug information for native DOM elements (with DOM element as key, for fast lookup)
const nativeElementDebugMap = new WeakMap<HTMLElement, () => Error>();

// ========== Dual guarantee: Ref stability + correct source location ==========

// Function Ref: cache wrapped ref, use queue to store debugErrorFn (FIFO for correct source mapping)
const wrappedRefCache = new WeakMap<RefCallback, RefCallback>();
const pendingDebugErrors = new WeakMap<RefCallback, Array<() => Error>>();

// RefObject: cache wrapped ref, store latest debugErrorFn (RefObject typically used in one place)
const refObjectCache = new WeakMap<RefObject, RefCallback>();
const refObjectDebugMap = new WeakMap<RefObject, () => Error>();

// Helper function to store debug info with error handling
const storeDebugInfo = (element: HTMLElement, debugErrorFn: () => Error) => {
  try {
    nativeElementDebugMap.set(element, debugErrorFn);
    const fiber = FiberDebugger.getFiberFromDOMNode(element);
    if (fiber) {
      fiberDebugMap.set(fiber, debugErrorFn);
    }
  } catch (e) {
    // Silently fail - don't break the app for debug functionality
    if (process.env.NODE_ENV === "development") {
      console.warn("[Debug Source] Failed to store debug info:", e);
    }
  }
};

// Helper function to create or get cached wrapped ref
const getOrCreateWrappedRef = (
  originalRef: Ref,
  debugErrorFn: () => Error,
): RefCallback | undefined => {
  // No original ref - create a simple wrapper (no caching needed)
  if (!originalRef) {
    return (element: HTMLElement | null) => {
      if (element instanceof HTMLElement) {
        storeDebugInfo(element, debugErrorFn);
      }
    };
  }

  // Function ref - use cache + queue for stable identity and correct source location
  if (typeof originalRef === "function") {
    // Add debugErrorFn to pending queue
    let pending = pendingDebugErrors.get(originalRef);
    if (!pending) {
      pending = [];
      pendingDebugErrors.set(originalRef, pending);
    }
    pending.push(debugErrorFn);

    // Get or create wrapped ref (created only once for stability)
    let wrapped = wrappedRefCache.get(originalRef);
    if (!wrapped) {
      wrapped = (element: HTMLElement | null) => {
        // Only consume queue when element exists (null is cleanup callback)
        if (element instanceof HTMLElement) {
          const queue = pendingDebugErrors.get(originalRef);
          if (queue && queue.length > 0) {
            const fn = queue.shift()!; // FIFO: first in, first out
            storeDebugInfo(element, fn);
          }
        }
        originalRef(element);
      };
      wrappedRefCache.set(originalRef, wrapped);
    }
    return wrapped;
  }

  // RefObject - use cache + latest value (RefObject is typically used in one place)
  if (
    originalRef &&
    typeof originalRef === "object" &&
    "current" in originalRef
  ) {
    // Update with latest debugErrorFn
    refObjectDebugMap.set(originalRef, debugErrorFn);

    // Get or create wrapped ref (created only once for stability)
    let wrapped = refObjectCache.get(originalRef);
    if (!wrapped) {
      wrapped = (element: HTMLElement | null) => {
        if (element instanceof HTMLElement) {
          const fn = refObjectDebugMap.get(originalRef);
          if (fn) {
            storeDebugInfo(element, fn);
          }
        }
        (originalRef as RefObject).current = element;
      };
      refObjectCache.set(originalRef, wrapped);
    }
    return wrapped;
  }

  return undefined;
};

export function interceptReactJSX() {
  // Save original functions
  const originalCreateElement = React.createElement;
  const originalJsx = (jsxRuntime as unknown as JsxRuntime).jsx;
  const originalJsxs = (jsxRuntime as unknown as JsxRuntime).jsxs;
  const originalJsxDEV = (jsxDevRuntime as unknown as JsxDevRuntime).jsxDEV;
  const setKeys = new Map<string, boolean>()
  const overrideRuntimeMethod = <T extends object>(
    runtime: T,
    key: keyof T,
    value: T[keyof T],
  ) => {
    if (!runtime) return;
    const setObj = (runtime as unknown as { default: T }).default;
    try {
      Object.defineProperty(setObj, key, {
        configurable: true,
        writable: true,
        value,
      });
    } catch (e) {
      console.warn(`[Debug Source] Failed to override ${String(key)}:`, e);
    }
  };

  const createElementDebugError = () => {
    const error = new Error();
    return () => error;
  };

  // Check if it's a native DOM element (string type)
  const isNativeDOMElement = (type: ElementType): boolean => {
    return typeof type === "string";
  };

  // Intercept React.createElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (React as { createElement: any }).createElement = function (
    type: ElementType,
    props?: JsxProps | null,
    ...children: React.ReactNode[]
  ) {
    // Only intercept native DOM elements or components that might render DOM
    if (!isNativeDOMElement(type) && typeof type !== "function") {
      return originalCreateElement(
        type as string,
        props as React.Attributes,
        ...children,
      );
    }

    const debugErrorFn = createElementDebugError();

    // Create a shallow copy to avoid mutating original props
    const mutableProps: JsxProps = props ? { ...props } : {};

    const wrappedRef = getOrCreateWrappedRef(mutableProps.ref, debugErrorFn);
    if (wrappedRef) {
      mutableProps.ref = wrappedRef;
    }

    return originalCreateElement(
      type as string,
      mutableProps as React.Attributes,
      ...children,
    );
  };

  // Intercept jsx
  overrideRuntimeMethod(
    jsxRuntime as unknown as JsxRuntime,
    "jsx",
    function (type: ElementType, props: JsxProps, key?: string) {
      // Only intercept native DOM elements or components
      if (!isNativeDOMElement(type) && typeof type !== "function") {
        return originalJsx(type, props, key);
      }

      const debugErrorFn = createElementDebugError();

      // Create a shallow copy to avoid mutating original props
      const mutableProps: JsxProps = props ? { ...props } : {};

      const wrappedRef = getOrCreateWrappedRef(mutableProps.ref, debugErrorFn);
      if (wrappedRef) {
        mutableProps.ref = wrappedRef;
      }

      return originalJsx(type, mutableProps, key);
    },
  );

  // Intercept jsxs
  overrideRuntimeMethod(
    jsxRuntime as unknown as JsxRuntime,
    "jsxs",
    function (type: ElementType, props: JsxProps, key?: string) {
      // Only intercept native DOM elements or components
      if (!isNativeDOMElement(type) && typeof type !== "function") {
        return originalJsxs(type, props, key);
      }

      const debugErrorFn = createElementDebugError();

      // Create a shallow copy to avoid mutating original props
      const mutableProps: JsxProps = props ? { ...props } : {};

      const wrappedRef = getOrCreateWrappedRef(mutableProps.ref, debugErrorFn);
      if (wrappedRef) {
        mutableProps.ref = wrappedRef;
      }

      return originalJsxs(type, mutableProps, key);
    },
  );

  // Intercept jsxDEV
  if (originalJsxDEV) {
    overrideRuntimeMethod(
      jsxDevRuntime as unknown as JsxDevRuntime,
      "jsxDEV",
      function (
        type: ElementType,
        props: JsxProps,
        key?: string,
        isStaticChildren?: boolean,
        source?: unknown,
        self?: unknown,
      ) {
        // Only intercept native DOM elements or components
        if (!isNativeDOMElement(type) && typeof type !== "function") {
          return originalJsxDEV(
            type,
            props,
            key,
            isStaticChildren,
            source,
            self,
          );
        }

        const debugErrorFn = createElementDebugError();

        // Create a shallow copy to avoid mutating original props
        const mutableProps: JsxProps = props ? { ...props } : {};

        const wrappedRef = getOrCreateWrappedRef(
          mutableProps.ref,
          debugErrorFn,
        );
        if (wrappedRef) {
          mutableProps.ref = wrappedRef;
        }

        return originalJsxDEV(
          type,
          mutableProps,
          key,
          isStaticChildren,
          source,
          self,
        );
      },
    );
  }
}

export function getDebugErrorFromSelector(selector: string) {
  const element = document.querySelector(selector);
  if (!element) {
    return null;
  }

  const tagName = element.tagName.toLowerCase();

  // First try to get from WeakMap (native DOM elements)
  const nativeDebugErrorFn = nativeElementDebugMap.get(element as HTMLElement);
  if (nativeDebugErrorFn) {
    return {
      element,
      tagName,
      debugError: nativeDebugErrorFn(),
    };
  }

  // Then try to get via Fiber node
  const fiber = FiberDebugger.getFiberFromDOMNode(element as HTMLElement);
  if (fiber) {
    const fiberDebugErrorFn = fiberDebugMap.get(fiber);
    if (fiberDebugErrorFn) {
      return {
        element,
        tagName,
        debugError: fiberDebugErrorFn(),
      };
    }
  }

  return null;
}
