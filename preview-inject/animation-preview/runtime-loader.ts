import {
  ANIMATION_CDN_ORIGIN,
  ANIMATION_FALLBACK_ASSETS,
  ANIMATION_META_PATH,
  RUNTIME_CSS_ID,
  RUNTIME_JS_ID,
} from "./constants";
import type { AnimationRegistry } from "./types";

type AnimationRuntimeMeta = {
  version: string;
  buildTime: string;
  js: string;
  css: string;
};

export class AnimationRuntimeLoader {
  private runtimeLoadPromise: Promise<AnimationRegistry> | null = null;
  private metaPromise: Promise<AnimationRuntimeMeta> | null = null;

  async ensureLoaded(): Promise<AnimationRegistry> {
    if (window.ReaddyAnim) {
      return window.ReaddyAnim;
    }

    if (!this.runtimeLoadPromise) {
      this.runtimeLoadPromise = this.loadRuntimeAssets().catch((error) => {
        this.runtimeLoadPromise = null;
        throw error;
      });
    }

    return this.runtimeLoadPromise;
  }

  private async loadRuntimeAssets(): Promise<AnimationRegistry> {
    const meta = await this.getRuntimeMeta();
    await this.ensureCssLoaded(meta);
    await this.ensureScriptLoaded(meta);

    if (!window.ReaddyAnim) {
      throw new Error("Animation runtime loaded but window.ReaddyAnim is missing");
    }

    return window.ReaddyAnim;
  }

  private getRuntimeMeta(): Promise<AnimationRuntimeMeta> {
    if (!this.metaPromise) {
      this.metaPromise = this.fetchRuntimeMeta().catch((error) => {
        this.metaPromise = null;
        throw error;
      });
    }

    return this.metaPromise;
  }

  private async fetchRuntimeMeta(): Promise<AnimationRuntimeMeta> {
    const metaUrl = `${ANIMATION_CDN_ORIGIN}${ANIMATION_META_PATH}?t=${Date.now()}`;
    try {
      const response = await fetch(metaUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load animation runtime meta: ${response.status}`);
      }

      const meta = (await response.json()) as Partial<AnimationRuntimeMeta>;
      if (!meta.js || !meta.css) {
        throw new Error("Invalid animation runtime meta response");
      }

      return meta as AnimationRuntimeMeta;
    } catch (error) {
      console.warn("Failed to load animation runtime meta, using fallback assets", error);
      return {
        version: "latest",
        buildTime: "",
        js: ANIMATION_FALLBACK_ASSETS.js,
        css: ANIMATION_FALLBACK_ASSETS.css,
      };
    }
  }

  private ensureCssLoaded(meta: AnimationRuntimeMeta): Promise<void> {
    const cssUrl = this.resolveAssetUrl(meta.css);
    const existing = document.getElementById(RUNTIME_CSS_ID) as HTMLLinkElement | null;
    if (existing?.dataset.loaded === "true" && existing.href === cssUrl) {
      return Promise.resolve();
    }

    if (existing) {
      if (existing.href !== cssUrl) {
        existing.remove();
      } else {
        return this.waitForAssetLoad(existing);
      }
    }

    const link = document.createElement("link");
    link.id = RUNTIME_CSS_ID;
    link.rel = "stylesheet";
    link.href = cssUrl;
    document.head.appendChild(link);

    return this.waitForAssetLoad(link);
  }

  private ensureScriptLoaded(meta: AnimationRuntimeMeta): Promise<void> {
    const jsUrl = this.resolveAssetUrl(meta.js);
    const existing = document.getElementById(RUNTIME_JS_ID) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true" && existing.src === jsUrl && window.ReaddyAnim) {
      return Promise.resolve();
    }

    if (existing) {
      if (existing.src !== jsUrl) {
        existing.remove();
      } else {
        return this.waitForAssetLoad(existing);
      }
    }

    const script = document.createElement("script");
    script.id = RUNTIME_JS_ID;
    script.src = jsUrl;
    script.async = true;
    document.head.appendChild(script);

    return this.waitForAssetLoad(script);
  }

  private resolveAssetUrl(pathOrUrl: string): string {
    return new URL(pathOrUrl, ANIMATION_CDN_ORIGIN).toString();
  }

  private waitForAssetLoad(
    element: HTMLLinkElement | HTMLScriptElement,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const currentUrl = "href" in element ? element.href : element.src;
      if (element.dataset.loaded === "true") {
        resolve();
        return;
      }

      const cleanup = () => {
        element.removeEventListener("load", onLoad);
        element.removeEventListener("error", onError);
      };

      const onLoad = () => {
        cleanup();
        element.dataset.loaded = "true";
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(
          new Error(`Failed to load animation runtime asset: ${currentUrl}`),
        );
      };

      element.addEventListener("load", onLoad, { once: true });
      element.addEventListener("error", onError, { once: true });
    });
  }
}
