import { RESULT_MESSAGE_TYPE } from "./constants";
import type { AnimationPreviewMessage, PreviewAnimationResult } from "./types";

export function createResult(
  message: AnimationPreviewMessage,
  ok: boolean,
  reason?: string,
): PreviewAnimationResult {
  return {
    type: RESULT_MESSAGE_TYPE,
    ok,
    animationId: message.animationId,
    target: message.target,
    reason,
  };
}
