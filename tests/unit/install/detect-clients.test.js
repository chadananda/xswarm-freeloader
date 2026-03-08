import { describe, it, expect } from 'vitest';
import { detectClients } from '../../../src/install/detect-clients.js';

describe('detectClients', () => {
  it('should return array of detected clients', () => {
    const clients = detectClients();
    expect(Array.isArray(clients)).toBe(true);
  });

  it('should include instruction for each detected client', () => {
    const clients = detectClients();
    for (const client of clients) {
      expect(client.name).toBeTruthy();
      expect(client.instruction).toBeTruthy();
    }
  });
});
