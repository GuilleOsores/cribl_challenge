import { ServerResponse, IncomingMessage } from 'http';

export async function list(req: IncomingMessage, res: ServerResponse) {
    res.write('all files');
    res.end();
}

export async function get(req: IncomingMessage, res: ServerResponse) {
    res.write('the file');
    res.end();
}

export async function upload(req: IncomingMessage, res: ServerResponse) {
    res.write('upload file');
    res.end();
}
