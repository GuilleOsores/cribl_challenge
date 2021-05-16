import { agent } from 'supertest';
import { expect } from 'chai';
import { createReadStream, readFileSync } from 'fs';
import { join } from 'path';
import app from '../src/app';

const server = agent(app);

describe('tests', () => {
    it('404', async () => {
        const res = await server.get('/error');
        expect(res.statusCode).to.equal(404);
    });

    it('upload no tgz file', async () => {
        try {
            const readStream = createReadStream(join('test', 'server.spec.ts'));
            const res = await server.post('/uploadFile').attach('file', readStream );
            expect(res.statusCode).to.equal(500);
        } catch (e) {
            if (e.code !== 'ECONNABORTED'){
                throw (e);
            }
        }
    });

    it('upload file', async () => {
        const readStream = createReadStream(join('test', 'testFile1.tgz'));
        const res = await server.post('/uploadFile').attach('file', readStream );
        expect(res.statusCode).to.equal(200);
    });

    it('upload multiple files', async () => {
        const readStreams = [
            createReadStream(join('test', 'testFile1.tgz')),
            createReadStream(join('test', 'testFile2.tgz')),
            createReadStream(join('test', 'testFile3.tgz')),
        ];

        await Promise.all(readStreams.map(rs => server.post('/uploadFile').attach('file', rs )));
        
        readStreams.map(rs => rs.close());
    });
    
    it('list files', async () => {
        const res = await server.get('/listFiles');
        expect(res.statusCode).to.equal(200);
        expect(res.text).to.include('testFile1.tgz');
    });

    it('get file', async () => {
        const res = await server.get('/getFile?filename=testFile1.tgz');
        expect(res.statusCode).to.equal(200);
        const file = readFileSync(join('test', 'testFile1.tgz'));
        expect(Buffer.from(res.body).equals(file));
    });

    it('delete file', async () => {
        await Promise.all([
            server.delete('/deleteFile?filename=testFile1.tgz'),
            server.delete('/deleteFile?filename=testFile2.tgz'),
            server.delete('/deleteFile?filename=testFile3.tgz'),
        ]);
    });
});
