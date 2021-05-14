import { Server, ClientRequest, ServerResponse } from 'http';

const server = new Server();
const PORT = process.env.PORT || 8090
server.on('request', async (req: ClientRequest, res: ServerResponse) => {
    res.write('hello');
    res.end();
});

server.listen(PORT, () => {
    console.log('listening on ', PORT);
});
