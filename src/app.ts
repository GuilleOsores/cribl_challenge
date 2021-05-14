import { Server, ServerResponse, IncomingMessage } from 'http';

const app = new Server();
app.on('request', async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/') {
        res.write('hello');
    } else {
        res.statusCode = 404;
    }
    res.end();
});

export default app;
