import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../utils/errors.js';

const JWT_SECRET = process.env.XSWARM_JWT_SECRET || 'xswarm-dev-secret-change-in-production';

export function authenticateApiKey(appRepo) {
  return async (request, reply) => {
    // Skip auth for health check and dashboard login
    if (request.url === '/v1/health' || request.url === '/api/auth/login') return;

    // Dashboard routes use JWT
    if (request.url.startsWith('/api/')) {
      return authenticateJwt(request, reply);
    }

    // API routes use x-api-key
    const apiKey = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
    if (!apiKey) {
      throw new AuthenticationError('Missing API key. Use x-api-key header or Bearer token.');
    }

    const app = appRepo.getByApiKey(apiKey);
    if (!app) {
      throw new AuthenticationError('Invalid API key');
    }

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
