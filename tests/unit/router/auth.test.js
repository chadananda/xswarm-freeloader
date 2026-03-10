import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateApiKey, createDashboardToken, verifyDashboardToken } from '../../../src/router/auth.js';
import { hashApiKey } from '../../../src/utils/crypto.js';
import { AuthenticationError } from '../../../src/utils/errors.js';
// Factories
const mockRequest = (overrides = {}) => ({
  url: '/v1/models',
  headers: {},
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
  ...overrides
});
const mockReply = () => ({});
// Repo factories
const makeAppRepo = (app = null) => ({
  get: vi.fn(() => app),
  getByApiKey: vi.fn(() => app)
});
const makeAppKeyRepo = (keyRecord = null) => ({
  getByHash: vi.fn(() => keyRecord),
  touchLastUsed: vi.fn()
});

describe('authenticateApiKey — skip routes', () => {
  it('skips auth for /v1/health and returns without error', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ url: '/v1/health' });
    await expect(middleware(req, mockReply())).resolves.toBeUndefined();
  });
  it('skips auth for /api/auth/login and returns without error', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ url: '/api/auth/login' });
    await expect(middleware(req, mockReply())).resolves.toBeUndefined();
  });
});

describe('authenticateApiKey — JWT auth for /api/ routes', () => {
  it('sets request.dashboardUser for valid JWT', async () => {
    const token = createDashboardToken({ userId: 42 });
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ url: '/api/settings', headers: { authorization: `Bearer ${token}` } });
    await middleware(req, mockReply());
    expect(req.dashboardUser).toBeDefined();
    expect(req.dashboardUser.userId).toBe(42);
  });
  it('throws AuthenticationError for missing JWT on /api/ route', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ url: '/api/settings', headers: {} });
    await expect(middleware(req, mockReply())).rejects.toThrow(AuthenticationError);
  });
  it('throws AuthenticationError for invalid/expired JWT on /api/ route', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ url: '/api/settings', headers: { authorization: 'Bearer invalid.token.here' } });
    await expect(middleware(req, mockReply())).rejects.toThrow(AuthenticationError);
  });
  it('throws AuthenticationError for tampered JWT on /api/ route', async () => {
    const token = createDashboardToken({ userId: 1 });
    const [header, , sig] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: 99, dashboard: true })).toString('base64url');
    const tampered = `${header}.${tamperedPayload}.${sig}`;
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ url: '/api/data', headers: { authorization: `Bearer ${tampered}` } });
    await expect(middleware(req, mockReply())).rejects.toThrow(AuthenticationError);
  });
});

describe('authenticateApiKey — hash-based lookup', () => {
  it('sets request.app and request.appKey on valid key', async () => {
    const app = { id: 'app1', name: 'test' };
    const apiKey = 'xsw_abc123';
    const keyHash = hashApiKey(apiKey);
    const keyRecord = { id: 'key1', app_id: 'app1', key_hash: keyHash };
    const appRepo = makeAppRepo(app);
    const appKeyRepo = makeAppKeyRepo(keyRecord);
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ headers: { 'x-api-key': apiKey } });
    await middleware(req, mockReply());
    expect(req.app).toBe(app);
    expect(req.appKey).toBe(keyRecord);
  });
  it('calls touchLastUsed on successful hash-based auth', async () => {
    const app = { id: 'app1' };
    const apiKey = 'xsw_abc123';
    const keyRecord = { id: 'key1', app_id: 'app1', key_hash: hashApiKey(apiKey) };
    const appRepo = makeAppRepo(app);
    const appKeyRepo = makeAppKeyRepo(keyRecord);
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ headers: { 'x-api-key': apiKey } });
    await middleware(req, mockReply());
    expect(appKeyRepo.touchLastUsed).toHaveBeenCalledWith('key1');
  });
  it('looks up hash before falling back to plaintext', async () => {
    const app = { id: 'app1' };
    const apiKey = 'xsw_abc123';
    const keyRecord = { id: 'key1', app_id: 'app1' };
    const appRepo = makeAppRepo(app);
    const appKeyRepo = makeAppKeyRepo(keyRecord);
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ headers: { 'x-api-key': apiKey } });
    await middleware(req, mockReply());
    expect(appKeyRepo.getByHash).toHaveBeenCalledWith(hashApiKey(apiKey));
    expect(appRepo.getByApiKey).not.toHaveBeenCalled();
  });
});

describe('authenticateApiKey — plaintext fallback', () => {
  it('falls back to appRepo.getByApiKey when hash not found', async () => {
    const app = { id: 'app1' };
    const appRepo = makeAppRepo(app);
    const appKeyRepo = makeAppKeyRepo(null); // hash lookup misses
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ headers: { 'x-api-key': 'oldkey123' } });
    await middleware(req, mockReply());
    expect(appRepo.getByApiKey).toHaveBeenCalledWith('oldkey123');
    expect(req.app).toBe(app);
  });
  it('throws AuthenticationError when plaintext fallback also fails', async () => {
    const appRepo = makeAppRepo(null); // no app found
    const appKeyRepo = makeAppKeyRepo(null);
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ headers: { 'x-api-key': 'badkey' } });
    await expect(middleware(req, mockReply())).rejects.toThrow(AuthenticationError);
  });
  it('throws AuthenticationError with correct message on invalid key', async () => {
    const appRepo = makeAppRepo(null);
    const appKeyRepo = makeAppKeyRepo(null);
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ headers: { 'x-api-key': 'badkey' } });
    await expect(middleware(req, mockReply())).rejects.toThrow('Invalid API key');
  });
});

describe('authenticateApiKey — local/anonymous', () => {
  it('sets request.app to null for local request without key', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ ip: '127.0.0.1', headers: {} });
    await middleware(req, mockReply());
    expect(req.app).toBeNull();
  });
  it('throws AuthenticationError for non-local request without key', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ ip: '192.168.1.100', socket: { remoteAddress: '192.168.1.100' }, headers: {} });
    await expect(middleware(req, mockReply())).rejects.toThrow(AuthenticationError);
  });
  it('throws with missing API key message for non-local without key', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ ip: '10.0.0.1', socket: { remoteAddress: '10.0.0.1' }, headers: {} });
    await expect(middleware(req, mockReply())).rejects.toThrow('Missing API key');
  });
  it('treats IPv6 loopback ::1 as local (anonymous)', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ ip: '::1', socket: { remoteAddress: '::1' }, headers: {} });
    await middleware(req, mockReply());
    expect(req.app).toBeNull();
  });
  it('treats IPv6-mapped ::ffff:127.0.0.1 as local (anonymous)', async () => {
    const middleware = authenticateApiKey(makeAppRepo(), makeAppKeyRepo());
    const req = mockRequest({ ip: '::ffff:127.0.0.1', socket: { remoteAddress: '::ffff:127.0.0.1' }, headers: {} });
    await middleware(req, mockReply());
    expect(req.app).toBeNull();
  });
  it('non-local with valid key authenticates normally', async () => {
    const app = { id: 'app1' };
    const appRepo = makeAppRepo(app);
    const appKeyRepo = makeAppKeyRepo(null);
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ ip: '192.168.1.100', socket: { remoteAddress: '192.168.1.100' }, headers: { 'x-api-key': 'validkey' } });
    await middleware(req, mockReply());
    expect(req.app).toBe(app);
  });
});

describe('authenticateApiKey — header formats', () => {
  it('reads key from Authorization: Bearer header', async () => {
    const app = { id: 'app1' };
    const appRepo = makeAppRepo(app);
    const appKeyRepo = makeAppKeyRepo(null);
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ headers: { authorization: 'Bearer xsw_somekey' } });
    await middleware(req, mockReply());
    expect(appRepo.getByApiKey).toHaveBeenCalledWith('xsw_somekey');
  });
  it('x-api-key header takes precedence over Authorization', async () => {
    const app = { id: 'app1' };
    const appRepo = makeAppRepo(app);
    const appKeyRepo = makeAppKeyRepo(null);
    const middleware = authenticateApiKey(appRepo, appKeyRepo);
    const req = mockRequest({ headers: { 'x-api-key': 'primary_key', authorization: 'Bearer other_key' } });
    await middleware(req, mockReply());
    // x-api-key wins: appRepo should be called with primary_key not other_key
    expect(appRepo.getByApiKey).toHaveBeenCalledWith('primary_key');
  });
});

describe('createDashboardToken', () => {
  it('returns a valid JWT string', () => {
    const token = createDashboardToken({ userId: 1 });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
  it('includes provided data in payload', () => {
    const token = createDashboardToken({ userId: 99, role: 'admin' });
    const payload = verifyDashboardToken(token);
    expect(payload.userId).toBe(99);
    expect(payload.role).toBe('admin');
    expect(payload.dashboard).toBe(true);
  });
  it('works with empty data object', () => {
    const token = createDashboardToken();
    const payload = verifyDashboardToken(token);
    expect(payload.dashboard).toBe(true);
  });
});

describe('verifyDashboardToken', () => {
  it('validates a token created by createDashboardToken', () => {
    const token = createDashboardToken({ userId: 5 });
    const payload = verifyDashboardToken(token);
    expect(payload.userId).toBe(5);
  });
  it('throws on tampered token', () => {
    const token = createDashboardToken({ userId: 1 });
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: 999, dashboard: true })).toString('base64url');
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(() => verifyDashboardToken(tampered)).toThrow();
  });
  it('throws on completely invalid token string', () => {
    expect(() => verifyDashboardToken('not.a.token')).toThrow();
  });
  it('throws on empty string', () => {
    expect(() => verifyDashboardToken('')).toThrow();
  });
});
