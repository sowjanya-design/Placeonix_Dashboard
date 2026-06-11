process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const User = require('../models/User');

describe('Auth API', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  describe('POST /api/v1/auth/register', () => {
    it('should register a new student', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'Student',
          email: 'test@example.com',
          password: 'Password123',
          phone: '+919876543210',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      await User.create({
        firstName: 'A', lastName: 'B', email: 'dup@x.com', password: 'Password123',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'C', lastName: 'D', email: 'dup@x.com', password: 'Password123',
        });

      expect(res.statusCode).toBe(409);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'X', lastName: 'Y', email: 'not-an-email', password: 'Password123',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should require minimum password length', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'short',
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        firstName: 'Login',
        lastName: 'Test',
        email: 'login@test.com',
        password: 'Password123',
        status: 'active',
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.com', password: 'Password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.com', password: 'WrongPassword' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nope@test.com', password: 'Password123' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user with valid token', async () => {
      const user = await User.create({
        firstName: 'Me', lastName: 'User', email: 'me@test.com', password: 'Password123',
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'me@test.com', password: 'Password123' });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.email).toBe('me@test.com');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toBe(401);
    });
  });
});
