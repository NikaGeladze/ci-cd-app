const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('GET /api/greet/:name', () => {
  it('returns a greeting for a valid name', async () => {
    const res = await request(app).get('/api/greet/Alice');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Hello, Alice! Deployed via CI/CD.');
  });

  it('returns 400 if name is too long', async () => {
    const longName = 'A'.repeat(51);
    const res = await request(app).get(`/api/greet/${longName}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/add', () => {
  it('adds two numbers correctly', async () => {
    const res = await request(app).get('/api/add?a=5&b=3');
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(8);
  });

  it('handles negative numbers', async () => {
    const res = await request(app).get('/api/add?a=-2&b=10');
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(8);
  });

  it('returns 400 for non-numeric params', async () => {
    const res = await request(app).get('/api/add?a=foo&b=3');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 if params are missing', async () => {
    const res = await request(app).get('/api/add?a=5');
    expect(res.statusCode).toBe(400);
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unregistered routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.statusCode).toBe(404);
  });
});
