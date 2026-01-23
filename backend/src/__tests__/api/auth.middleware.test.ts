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
    process.env.DEV_AUTH_JWT_SECRET = 'dev-secret';
    process.env.DEV_AUTH_TTL_SECONDS = '3600';
  });

  it('allows dev bearer token in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const { issueDevToken } = await import('../../utils/dev-auth.util');
    const { UserService } = await import('../../services/UserService');

    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue(buildUser() as any);

    const token = issueDevToken({ sub: 'user-id', login: 'dev', role: 'admin' });
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

  it('allows dev bearer token in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { createApp } = await import('../../app');
    const { UserService } = await import('../../services/UserService');
    const { issueDevToken } = await import('../../utils/dev-auth.util');

    jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue(buildUser() as any);

    const token = issueDevToken({ sub: 'user-id', login: 'dev' });
    const app = createApp();

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });
});
