import { Server, ServerResponse, IncomingMessage } from 'http';
import router from './router';
import addRoutes from './routes';

const app = new Server();
addRoutes(router);

app.on('request', async (req: IncomingMessage, res: ServerResponse) => {
    const { method, url, headers } = req;

    const baseUrl = url.split('?').shift();
    let handlers = router.getHandlers(method, baseUrl);

    if (handlers) {
        handlers = Array.isArray(handlers) ? handlers : [handlers];
        try {
            for (const handler of handlers) {
                await handler(req, res);
            }
        } catch (e) {
            console.log(e);
            res.statusCode = 500;
            res.end();
        }
    } else {
        res.statusCode = 404;
        res.end();
    }
});

export default app;
