type PreCatchConsoleError = {
  type: "console.error";
  args: Error;
};
type PreCatchRuntimeError = {
  type: "runtime";
  args: ErrorEvent;
};
type PreCatchError = PreCatchConsoleError | PreCatchRuntimeError;
const preCatchErrors: PreCatchError[] = [];
let preCatchFlag = true;
export const originalConsoleError = console.error;

function pushPreCatchError(error: PreCatchError) {
  if (preCatchErrors.length > 5 || !preCatchFlag) return;
  preCatchErrors.push(error);
}

function pushRuntimeError(error: ErrorEvent) {
  preCatchErrors.push({
    type: "runtime",
    args: error,
  });
}

function catchPromiseRejection(event: PromiseRejectionEvent) {
    event.preventDefault();
}

function pushConsoleError(args: any[]) {
  try {
    const errorArg = args.find((arg) => arg instanceof Error);
    if (errorArg && errorArg.stack) {
      pushPreCatchError({
        type: "console.error",
        args: errorArg,
      });
    } else if (args.length > 0) {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");
      const syntheticError = new Error(message);
      pushPreCatchError({
        type: "console.error",
        args: syntheticError,
      });
    }
  } catch (error) {
    console.warn(error);
  }
}

window.addEventListener("error", pushRuntimeError);
window.addEventListener("unhandledrejection", catchPromiseRejection);
console.error = function proxyError(...args: any[]) {
  pushConsoleError(args);
  originalConsoleError.apply(this, args);
};



export function getPreCatchErrors() {
  window.removeEventListener("error", pushRuntimeError);
  window.removeEventListener("unhandledrejection", catchPromiseRejection);
  console.error = originalConsoleError;
  preCatchFlag = false;
  return preCatchErrors;
}
