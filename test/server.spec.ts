import { agent } from 'supertest';
import { expect } from 'chai';
import app from '../src/app';

const server = agent(app);

describe('tests', () => {
    it('404', async () => {
        const res = await server.get('/error');
        expect(res.statusCode).to.equal(404);
    });
    it('listFiles', async () => {
        const res = await server.get('/listFiles');
        expect(res.statusCode).to.equal(200);
    });
    it('getFile', async () => {
        const res = await server.get('/getFile');
        expect(res.statusCode).to.equal(200);
    })
    it('uploadFile', async () => {
        const res = await server.post('/uploadFile');
        expect(res.statusCode).to.equal(200);
    })
});
