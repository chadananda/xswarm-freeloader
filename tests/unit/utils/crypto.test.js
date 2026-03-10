import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey, generateApiKey, hashPassword, verifyPassword, hashApiKey, generateAppApiKey } from '../../../src/utils/crypto.js';

describe('crypto', () => {
  it('should encrypt and decrypt API key', () => {
    const original = 'sk-ant-api03-test-key-12345';
    const { encrypted, iv } = encryptApiKey(original);
    const decrypted = decryptApiKey(encrypted, iv);
    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertext for same input', () => {
    const key = 'test-key';
    const r1 = encryptApiKey(key);
    const r2 = encryptApiKey(key);
    expect(r1.encrypted).not.toBe(r2.encrypted);
    expect(r1.iv).not.toBe(r2.iv);
  });

  it('should fail with wrong iv', () => {
    const { encrypted } = encryptApiKey('test-key');
    expect(() => decryptApiKey(encrypted, 'a'.repeat(32))).toThrow();
  });

  it('should generate API keys with prefix', () => {
    const key = generateApiKey();
    expect(key).toMatch(/^xsw_[a-f0-9]{48}$/);
  });

  it('should generate API keys with custom prefix', () => {
    const key = generateApiKey('app');
    expect(key).toMatch(/^app_[a-f0-9]{48}$/);
  });

  it('should hash and verify password', () => {
    const password = 'my-secret-password';
    const hash = hashPassword(password);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });
});
// hashApiKey tests
describe('hashApiKey', () => {
  it('returns consistent hex string for same input', () => {
    const hash1 = hashApiKey('xsw_abc123');
    const hash2 = hashApiKey('xsw_abc123');
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different input', () => {
    const h1 = hashApiKey('xsw_key_one');
    const h2 = hashApiKey('xsw_key_two');
    expect(h1).not.toBe(h2);
  });

  it('returns 64-char hex string (SHA-256)', () => {
    const hash = hashApiKey('any-key-value');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles empty string without throwing', () => {
    const hash = hashApiKey('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles unicode input', () => {
    const hash = hashApiKey('key-with-unicode-\u00e9\u00e0');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
// generateAppApiKey tests
describe('generateAppApiKey', () => {
  it('returns object with key, hash, prefix', () => {
    const result = generateAppApiKey();
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('hash');
    expect(result).toHaveProperty('prefix');
  });

  it('key starts with "xsw_"', () => {
    const { key } = generateAppApiKey();
    expect(key).toMatch(/^xsw_/);
  });

  it('key matches full format xsw_<48 hex chars>', () => {
    const { key } = generateAppApiKey();
    expect(key).toMatch(/^xsw_[a-f0-9]{48}$/);
  });

  it('hash matches hashApiKey(key)', () => {
    const { key, hash } = generateAppApiKey();
    expect(hash).toBe(hashApiKey(key));
  });

  it('hash is a 64-char hex string', () => {
    const { hash } = generateAppApiKey();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('prefix is a substring of key', () => {
    const { key, prefix } = generateAppApiKey();
    expect(key.startsWith(prefix)).toBe(true);
  });

  it('prefix has correct length (prefix_label + _ + 4 chars = 8 chars for "xsw")', () => {
    // "xsw" (3) + "_" (1) + 4 hex chars = 8 total
    const { prefix } = generateAppApiKey();
    expect(prefix).toHaveLength(8);
  });

  it('generates unique keys each call', () => {
    const r1 = generateAppApiKey();
    const r2 = generateAppApiKey();
    expect(r1.key).not.toBe(r2.key);
    expect(r1.hash).not.toBe(r2.hash);
    expect(r1.prefix).not.toBe(r2.prefix);
  });

  it('respects custom prefix', () => {
    const { key, prefix } = generateAppApiKey('app');
    expect(key).toMatch(/^app_[a-f0-9]{48}$/);
    expect(prefix).toMatch(/^app_/);
  });

  it('custom prefix determines prefix length (label + _ + 4)', () => {
    const { prefix } = generateAppApiKey('myapp');
    // "myapp" (5) + "_" (1) + 4 = 10
    expect(prefix).toHaveLength(10);
    expect(prefix.startsWith('myapp_')).toBe(true);
  });

  it('hash of different keys from same prefix are different', () => {
    const { hash: h1 } = generateAppApiKey('xsw');
    const { hash: h2 } = generateAppApiKey('xsw');
    expect(h1).not.toBe(h2);
  });
});
