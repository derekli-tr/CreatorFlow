import { PostMessageClient } from "./post-message";

export class EventHandler {
    private _client: PostMessageClient;

    constructor() {
        this._client = new PostMessageClient(window.parent);
        this._domContentLoadedListener();
    }

    private _domContentLoadedListener() {
        const domContentLoaded = () => {
            console.log("DOMContentLoaded");
            this._client.post("DOMContentLoaded");
            document.removeEventListener("DOMContentLoaded", domContentLoaded);
        }
        if(document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", domContentLoaded);
        } else {
            console.log("DOMContentLoaded");
            this._client.post("DOMContentLoaded");
        }
    }
}

export function initEventHandler() {
    return new EventHandler();
}