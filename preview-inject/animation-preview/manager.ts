import { PostMessageClient } from "../post-message";
import { RESULT_MESSAGE_TYPE } from "./constants";
import { createResult } from "./result";
import { AnimationRuntimeLoader } from "./runtime-loader";
import { resolveTarget } from "./target-resolver";
import type {
  AnimationPreviewMessage,
  AnimationTarget,
  PreviewAnimationResult,
} from "./types";

export class AnimationPreviewManager {
  private client: PostMessageClient;
  private runtimeLoader = new AnimationRuntimeLoader();
  private activeAnimations = new Map<HTMLElement, string>();
  private cleanupCallbacks: Array<() => void> = [];
  private detachObserver: MutationObserver | null = null;

  constructor() {
    this.client = new PostMessageClient(window.parent);
    this.bindMessages();
    this.setupLifecycleCleanup();
  }

  private bindMessages() {
    this.client.on(
      "preload-animation-runtime",
      async () => {
        await this.runtimeLoader.ensureLoaded();
        return { ok: true };
      },
    );

    this.client.on(
      "preview-animation",
      async (message: AnimationPreviewMessage) => {
        const result = await this.previewAnimation(message);
        this.emitResult(result);
        return result;
      },
    );

    this.client.on(
      "clear-animation",
      async (message: { target?: AnimationTarget } | undefined) => {
        const cleared = await this.clearByTarget(message?.target);
        return { ok: true, cleared };
      },
    );
  }

  private setupLifecycleCleanup() {
    const clearAll = () => {
      void this.clearAllAnimations();
    };

    this.addCleanupListener(window, "pagehide", clearAll);
    this.addCleanupListener(window, "beforeunload", clearAll);
    this.addCleanupListener(window, "popstate", clearAll);

    const wrapHistoryMethod = <T extends "pushState" | "replaceState">(
      method: T,
    ) => {
      const original = window.history[method];
      window.history[method] = ((...args: Parameters<History[T]>) => {
        clearAll();
        return original.apply(window.history, args);
      }) as History[T];

      this.cleanupCallbacks.push(() => {
        window.history[method] = original;
      });
    };

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");

    this.detachObserver = new MutationObserver(() => {
      void this.clearDetachedAnimations();
    });

    this.detachObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  private addCleanupListener(
    target: Window,
    eventName: "pagehide" | "beforeunload" | "popstate",
    listener: () => void,
  ) {
    target.addEventListener(eventName, listener);
    this.cleanupCallbacks.push(() => {
      target.removeEventListener(eventName, listener);
    });
  }

  private emitResult(result: PreviewAnimationResult) {
    window.parent.postMessage(
      {
        type: RESULT_MESSAGE_TYPE,
        data: result,
      },
      "*",
    );
  }

  private async previewAnimation(
    message: AnimationPreviewMessage,
  ): Promise<PreviewAnimationResult> {
    const target = resolveTarget(message.target);
    if (!target) {
      return createResult(message, false, "Target element not found");
    }

    try {
      const registry = await this.runtimeLoader.ensureLoaded();
      const animation = registry[message.animationId];
      if (!animation) {
        return createResult(
          message,
          false,
          `Animation not found: ${message.animationId}`,
        );
      }

      const previousAnimationId = await this.clearAnimationOnElement(target);
      if (previousAnimationId) {
        this.forceAnimationRestart(target);
      }
      await animation.init(target, message.options);
      this.activeAnimations.set(target, message.animationId);

      return createResult(message, true);
    } catch (error) {
      return createResult(
        message,
        false,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  private async clearByTarget(target?: AnimationTarget): Promise<number> {
    if (!target) {
      return this.clearAllAnimations();
    }

    const element = resolveTarget(target);
    if (!element) {
      return 0;
    }

    await this.clearAnimationOnElement(element);
    return 1;
  }

  private forceAnimationRestart(element: HTMLElement): void {
    void element.offsetWidth;
  }

  private async clearAnimationOnElement(element: HTMLElement): Promise<string | null> {
    const currentId = this.activeAnimations.get(element);
    if (!currentId) {
      return null;
    }

    const registry = window.ReaddyAnim;
    const currentAnimation = registry?.[currentId];
    this.activeAnimations.delete(element);

    if (!currentAnimation?.destroy) {
      return currentId;
    }

    try {
      await currentAnimation.destroy(element);
    } catch (error) {
      console.warn("Failed to destroy animation", {
        animationId: currentId,
        error,
      });
    }

    return currentId;
  }

  private async clearAllAnimations(): Promise<number> {
    const activeElements = Array.from(this.activeAnimations.keys());
    await Promise.all(
      activeElements.map((element) => this.clearAnimationOnElement(element)),
    );
    return activeElements.length;
  }

  private async clearDetachedAnimations(): Promise<void> {
    const detachedElements = Array.from(this.activeAnimations.keys()).filter(
      (element) => !element.isConnected,
    );
    await Promise.all(
      detachedElements.map((element) => this.clearAnimationOnElement(element)),
    );
  }

  destroy() {
    void this.clearAllAnimations();
    this.client.destroy();
    this.detachObserver?.disconnect();
    this.cleanupCallbacks.forEach((cleanup) => cleanup());
  }
}
