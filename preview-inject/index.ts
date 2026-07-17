import "./pre-error-catch";
import { initContinueModule } from "./continue";
import { initRuntimeErrorCollector } from "./runtime-error";
import { initEventHandler } from "./event-handler";
import { initLinkManager } from "./link-manager";
import { initRouteManager } from "./router-manager";
import { initDebugSource } from "./debug-source";
import { initAnimationPreview } from "./animation-preview";

const isPreviewBuild = __IS_PREVIEW__;

console.log("Is preview build:", isPreviewBuild);

async function init() {
  if (!isPreviewBuild) {
    return;
  }

  // Must init first - intercept addEventListener before React starts
  initContinueModule();

  initRuntimeErrorCollector();
  initLinkManager();
  initEventHandler();
  initRouteManager();
  initDebugSource();
  initAnimationPreview();
}

init();
