import pino from 'pino';
import path from 'path';
import fs from 'fs';

export function createLogger(options = {}) {
  const logLevel = options.level || process.env.LOG_LEVEL || 'info';

  if (options.file) {
    const dir = path.dirname(options.file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return pino({ level: logLevel }, pino.destination(options.file));
  }

  return pino({
    level: logLevel,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  });
}

export function getDefaultLogger() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const logDir = path.join(homeDir, '.xswarm', 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  return createLogger({ file: path.join(logDir, 'xswarm.log') });
}

export function createSilentLogger() {
  return pino({ level: 'silent' });
}
