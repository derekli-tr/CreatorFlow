import type { AnimationTarget } from "./types";

export function resolveTarget(target: AnimationTarget): HTMLElement | null {
  if (!target) {
    return null;
  }

  if (target.selector) {
    try {
      const found = document.querySelector(target.selector);
      if (found instanceof HTMLElement) {
        return found;
      }
    } catch {
      console.warn("Invalid animation target selector", target.selector);
    }
  }

  if (target.nodeId) {
    const found = document.querySelector(
      `[data-node-id="${CSS.escape(target.nodeId)}"]`,
    );
    if (found instanceof HTMLElement) {
      return found;
    }
  }

  return null;
}
