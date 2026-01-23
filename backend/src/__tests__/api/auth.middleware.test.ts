import request from 'supertest';

const buildUser = () => ({
  _id: 'user-id',
  telegramId: 123,
  username: 'devuser',
  firstName: 'Dev',
  lastName: 'User',
  balance: 0,
  reservedBalance: 0,
});

describe('authMiddleware integration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.AUTH_JWT_SECRET = 'test-secret';
    process.env.AUTH_JWT_TTL_SECONDS = '3600';
  });

  it('allows bearer token in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const { issueAuthToken } = await import('../../utils/auth.util');
    const { UserService } = await import('../../services/UserService');

    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue(buildUser() as any);

    const token = issueAuthToken({ sub: 'user-id', login: 'dev' });
    const app = createApp();

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('rejects missing auth headers in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const app = createApp();

    const response = await request(app).get('/api/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing Authorization header');
  });

  it('allows bearer token in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const { UserService } = await import('../../services/UserService');
    const { issueAuthToken } = await import('../../utils/auth.util');

    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue(buildUser() as any);

    const token = issueAuthToken({ sub: 'user-id', login: 'dev' });
    const app = createApp();

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('rejects non-bearer authorization header', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const app = createApp();

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', 'Token abc');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing Authorization header');
  });
});
