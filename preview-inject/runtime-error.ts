import { PostMessageClient } from "./post-message";
import { ErrorMappingResult, mapErrorStack } from "./source-map";
import { getPreCatchErrors } from "./pre-error-catch";

export class RuntimeErrorCollector {
  private client: PostMessageClient;
  private originalConsoleError: typeof console.error;

  constructor() {
    const preCatchErrors = getPreCatchErrors();
    if (preCatchErrors.length > 0) {
      preCatchErrors.forEach((error) => {
        if (error.type === "console.error") {
          this.handleConsoleError(error.args);
        } else if (error.type === "runtime") {
          this.handleError(error.args);
        }
      });
    }
    this.client = new PostMessageClient(window.parent);
    this.originalConsoleError = console.error;
    this.initErrorHandlers();
  }

  private initErrorHandlers(): void {
    // 1. JavaScript runtime errors
    window.addEventListener('error', this.handleError.bind(this));
    
    // 2. Unhandled Promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // 3. Intercept console.error to capture manually logged errors
    this.interceptConsoleError();
    
    // Note: React component errors may need to be manually reported at the application level through Error Boundary
    // Modern React applications typically use function components, componentDidCatch hijacking is not very reliable
  }

  private async handleError(event: ErrorEvent): Promise<void> {
    // Ignore resource loading errors
    const target = event.target;
    if (target && target instanceof HTMLElement && target.tagName) {
      // If it's a resource element error, ignore it directly
      const resourceTags = ['IMG', 'SCRIPT', 'LINK', 'VIDEO', 'AUDIO', 'SOURCE', 'IFRAME'];
      if (resourceTags.includes(target.tagName)) {
        return;
      }
    }

    if (event.error && event.error.stack) {
      try {
        const mappingResult = await mapErrorStack(event.error);
        this.sendError(mappingResult);
      } catch (error) {
        console.warn('Failed to map error stack:', error);
      }
    }
  }

  private async handlePromiseRejection(event: PromiseRejectionEvent): Promise<void> {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    if (error.stack) {
      try {
        const mappingResult = await mapErrorStack(error);
        this.sendError(mappingResult);
      } catch (mapError) {
        console.warn('Failed to map promise rejection stack:', mapError);
      }
    }
  }

  private interceptConsoleError(): void {
    console.error = (...args: any[]) => {
      // Call the original console.error
      this.originalConsoleError.apply(console, args);
      
      // Try to extract error object from arguments
      const errorArg = args.find(arg => arg instanceof Error);
      if (errorArg && errorArg.stack) {
        this.handleConsoleError(errorArg);
      } else if (args.length > 0) {
        // If there's no Error object, create one containing the message
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        const syntheticError = new Error(message);
        this.handleConsoleError(syntheticError);
      }
    };
  }

  private async handleConsoleError(error: Error): Promise<void> {
    try {
      const mappingResult = await mapErrorStack(error);
      this.sendError(mappingResult);
    } catch (mapError) {
      console.warn('Failed to map console error stack:', mapError);
    }
  }

  // Provide manual reporting method for React Error Boundary use
  public reportError(error: Error): void {
    this.handleReactError(error);
  }

  private async handleReactError(error: Error): Promise<void> {
    try {
      const mappingResult = await mapErrorStack(error);
      this.sendError(mappingResult);
    } catch (mapError) {
      console.warn('Failed to map React error stack:', mapError);
    }
  }

  private async sendError(errorInfo: ErrorMappingResult | null): Promise<void> {
    if (!errorInfo) {
      console.warn('error is too many');
      return;
    }
    if (errorInfo.sourceContext.length === 0) {
      return;
    }
    try {
      await this.client.post('runtime-error', errorInfo);
    } catch (error) {
      console.warn('Failed to send error to parent:', error);
    }
  }

  public destroy(): void {
    // Restore original console.error
    console.error = this.originalConsoleError;
    this.client.destroy();
  }
}

export function initRuntimeErrorCollector(): RuntimeErrorCollector {
  const collector = new RuntimeErrorCollector();
  // Expose the instance globally for use elsewhere
  (window as any).runtimeErrorCollector = collector;
  return collector;
}
