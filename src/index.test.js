/* eslint-env jest */
const os = require('os');
process.env.DATA_DIR = os.tmpdir();

const request = require('supertest');
const buildApp = require('./index');

let app;
beforeAll(async () => { app = await buildApp(); });

it('GET /healthz returns 200', async () => {
  const res = await request(app).get('/healthz');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});

it('GET /ready returns 200', async () => {
  const res = await request(app).get('/ready');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ready');
});

it('GET /api/slaps returns all 6 members', async () => {
  const res = await request(app).get('/api/slaps');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBe(6);
});

it('POST /api/slap/Maia increments count', async () => {
  const before = await request(app).get('/api/slaps');
  const start = before.body.find(m => m.name === 'Maia').count;
  const res = await request(app).post('/api/slap/Maia');
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Maia');
  expect(res.body.count).toBe(start + 1);
});

it('POST /api/slap/unknown returns 400', async () => {
  const res = await request(app).post('/api/slap/Stranger');
  expect(res.status).toBe(400);
});
