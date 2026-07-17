interface FiberNode {
  return: FiberNode | null;
  child: FiberNode | null;
  sibling: FiberNode | null;
  type: any;
  key: string | null;
  elementType: any;
  stateNode: any;
  _debugSource?: {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
  };
  _debugOwner?: FiberNode;
  tag: number;
  memoizedProps?: any;
  memoizedState?: any;
  _debugStack?: Error;
}

export interface DebugInfo {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  componentName: string;
  componentType: string;
}

export class FiberDebugger {
  /**
   * Get Fiber node from DOM element
   * React stores a reference to the internal Fiber node on the DOM element
   */
  static getFiberFromDOMNode(element: HTMLElement): FiberNode | null {
    if (!element) return null;

    // Find React internal properties
    const key = Object.keys(element).find(
      (key) =>
        key.startsWith("__reactFiber$") ||
        key.startsWith("__reactInternalInstance$")
    );

    return key ? (element as any)[key] : null;
  }
}

export default FiberDebugger;
