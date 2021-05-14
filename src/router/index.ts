import { ServerResponse, IncomingMessage } from 'http';

export class Router {
    router = {
        post: new Map(),
        get: new Map()
    };

    post(path: string, handlers: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | ((req: IncomingMessage, res: ServerResponse) => Promise<void>)[]) {

        this.router.post.set(path, handlers);
    }

    get(path: string, handlers: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | ((req: IncomingMessage, res: ServerResponse) => Promise<void>)[]) {
        this.router.post.set(path, handlers);
    }

    getHandlers(method: string, url: string) {
        if (method === 'POST' && this.router.post.has(url)) {
            return this.router.post.get(url);
        } else if (method === 'GET' && this.router.post.has(url)) {
            return this.router.post.get(url);
        }
    }
}

export default new Router();