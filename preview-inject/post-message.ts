type MessageData<T> = {
  type: string;
  data: T;
  id: number;
};

type PostMessageOptions = {
  timeout?: number;
};

const DEFAULT_TIMEOUT = 1000;
const timeoutTag = Symbol('postMessageResponseTimeout');

let id = 0;

const DEFAULT_ORIGIN = '*';

export class PostMessageClient {
  private client: Window;
  private baseTimeout: number;
  private waitRes: Map<number, (h: unknown) => unknown> = new Map();
  private removeListeners: Set<() => void> = new Set();
  private clear: () => void;
  constructor(client: Window, options?: PostMessageOptions) {
    this.client = client;
    this.baseTimeout = options?.timeout || DEFAULT_TIMEOUT;
    const msCb = this.emitResponse.bind(this);
    this.clear = () => {
      window.removeEventListener('message', msCb);
    };
    window.addEventListener('message', msCb);
  }
  destroy() {
    this.clear();
    this.removeListeners.forEach((fn) => fn());
  }
  isTimeout(data: unknown): data is typeof timeoutTag {
    return data === timeoutTag;
  }
  post<T>(
    name: string,
    data?: unknown,
    options?: {
      timeout?: number;
      origin?: string;
    }
  ): Promise<T | typeof timeoutTag> {
    id++;
    const { timeout, origin = DEFAULT_ORIGIN } = options || {};
    this.client.postMessage({ data, id, type: name }, origin);
    return new Promise((resolve) => {
      this.waitRes.set(id, (d: unknown) => {
        resolve(d as T);
      });
      setTimeout(() => {
        this.waitRes.delete(id);
        resolve(timeoutTag);
      }, timeout || this.baseTimeout);
    });
  }

  on<T, V>(name: string, callback: (h: T) => V, options?: { once?: boolean; origin?: string }) {
    const { once, origin = DEFAULT_ORIGIN } = options || {};
    const msCb = async (e: MessageEvent) => {
      const { id, type, data } = e.data;
      let res;
      if (type === name) {
        res = await callback(data);
        console.log(name, once,res, data)
        if ((id && origin === e.origin) || origin === DEFAULT_ORIGIN) {
          e.source?.postMessage(
            {
              fromType: name,
              id,
              data: res
            },
            e.origin as WindowPostMessageOptions
          );
        }
        if (once) {
          removeCb();
        }
      }
    };

    window.addEventListener('message', msCb);
    const removeCb = () => {
      window.removeEventListener('message', msCb);
      this.removeListeners.delete(removeCb);
    };
    this.removeListeners.add(removeCb);
    return removeCb;
  }
  private emitResponse<T>(e: MessageEvent) {
    const message: MessageData<T> = e.data;
    const { id, data } = message;
    const resCb = this.waitRes.get(id);
    if (resCb) {
      resCb(data);
    }
  }
}
