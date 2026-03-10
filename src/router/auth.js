// :arch: auth middleware — hash-based API key lookup with network restriction for non-localhost
// :deps: jsonwebtoken, hashApiKey, appKeyRepo | consumed by app.js via Fastify onRequest hook
// :rules: non-loopback without key → 401; local without key → anonymous (null app); hash lookup first, plaintext fallback
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../utils/errors.js';
import { hashApiKey } from '../utils/crypto.js';
//
const JWT_SECRET = process.env.XSWARM_JWT_SECRET || 'xswarm-dev-secret-change-in-production';
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);
//
function isLoopback(request) {
  const ip = request.ip || request.socket?.remoteAddress || '';
  return LOOPBACK.has(ip);
}
//
export function authenticateApiKey(appRepo, appKeyRepo) {
  return async (request, reply) => {
    if (request.url === '/v1/health' || request.url === '/api/auth/login') return;
    if (request.url.startsWith('/api/')) return authenticateJwt(request, reply);
    //
    const apiKey = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
    const local = isLoopback(request);
    //
    if (!apiKey) {
      if (local) { request.app = null; return; } // Anonymous local access
      throw new AuthenticationError('Missing API key. Use x-api-key header or Bearer token.');
    }
    //
    // Hash-based lookup first (app_keys table)
    if (appKeyRepo) {
      const keyHash = hashApiKey(apiKey);
      const keyRecord = appKeyRepo.getByHash(keyHash);
      if (keyRecord) {
        const app = appRepo.get(keyRecord.app_id);
        if (app) {
          request.app = app;
          request.appKey = keyRecord;
          appKeyRepo.touchLastUsed(keyRecord.id);
          return;
        }
      }
    }
    //
    // Fallback: plaintext lookup (backward compat during migration)
    const app = appRepo.getByApiKey(apiKey);
    if (!app) throw new AuthenticationError('Invalid API key');
    request.app = app;
  };
}

function authenticateJwt(request, reply) {
  const token = request.headers['authorization']?.replace('Bearer ', '') ||
    request.cookies?.token;

  if (!token) {
    throw new AuthenticationError('Missing authentication token');
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    request.dashboardUser = payload;
  } catch {
    throw new AuthenticationError('Invalid or expired token');
  }
}

export function createDashboardToken(data = {}) {
  return jwt.sign({ dashboard: true, ...data }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyDashboardToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
