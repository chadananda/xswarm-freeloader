import crypto from 'crypto';

function getEncryptionKey() {
  const keySource = process.env.XSWARM_ENCRYPTION_KEY ||
    `${process.env.HOME}-${process.platform}-xswarm`;
  return crypto.createHash('sha256').update(keySource).digest();
}

export function encryptApiKey(apiKey) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encrypted: `${encrypted}:${authTag.toString('hex')}`,
    iv: iv.toString('hex')
  };
}

export function decryptApiKey(encryptedData, ivHex) {
  const key = getEncryptionKey();
  const [encrypted, authTagHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function generateApiKey(prefix = 'xsw') {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}
//
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}
//
export function generateAppApiKey(prefix = 'xsw') {
  const key = `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
  const hash = hashApiKey(key);
  const keyPrefix = key.substring(0, prefix.length + 5); // e.g. "xsw_abcd"
  return { key, hash, prefix: keyPrefix };
}
//
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}
