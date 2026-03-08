import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey, generateApiKey, hashPassword, verifyPassword } from '../../../src/utils/crypto.js';

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
