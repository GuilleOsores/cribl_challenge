import { ServerResponse, IncomingMessage } from 'http';

declare type handler = ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | ((req: IncomingMessage, res: ServerResponse) => Promise<void>)[]

export class Router {
    router = {
        post: new Map(),
        get: new Map(),
        delete: new Map(),
    };

    post(path: string, handlers: handler) {

        this.router.post.set(path, handlers);
    }

    get(path: string, handlers: handler) {
        this.router.get.set(path, handlers);
    }

    delete(path: string, handlers: handler) {
        this.router.delete.set(path, handlers);
    }

    getHandlers(method: string, url: string) {
        if (method === 'POST' && this.router.post.has(url)) {
            return this.router.post.get(url);
        } else if (method === 'GET' && this.router.get.has(url)) {
            return this.router.get.get(url);
        } else if (method === 'DELETE' && this.router.delete.has(url)) {
            return this.router.delete.get(url);
        }
    }
}

export default new Router();