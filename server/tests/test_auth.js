const request = require('supertest');
const app = require('../server');

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser1',
          email: 'testuser1@example.com',
          password: 'TestPass123',
          first_name: 'Test',
          last_name: 'User'
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully.');
    });

    it('should fail if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser2' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Missing required fields.');
    });

    it('should fail if username or email already exists', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser3',
          email: 'testuser3@example.com',
          password: 'TestPass123',
          first_name: 'Test',
          last_name: 'User'
        });
      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser3',
          email: 'testuser3@example.com',
          password: 'TestPass123',
          first_name: 'Test',
          last_name: 'User'
        });
      expect([409, 500]).toContain(res.statusCode); // 409 for duplicate, 500 for DB error
    });
  });
});
