const supertest = require('supertest');
const { app, server, closeServer } = require('../server');

jest.setTimeout(30000);

beforeAll(async () => {
    global.testRequest = supertest(app);
});

afterAll(async () => {
    await closeServer(server);
});
