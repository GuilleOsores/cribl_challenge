import { agent } from 'supertest';
import { expect } from 'chai';
import app from '../src/app';

const server = agent(app);

describe('tests', () => {
    it('404', async () => {
        const res = await server.get('/error');
        expect(res.statusCode).to.equal(404);
    });
    it('200', async () => {
        const res = await server.get('/');
        expect(res.statusCode).to.equal(200);
    })
});
