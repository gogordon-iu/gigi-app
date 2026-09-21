import {
  sha256,
  encrypt,
  decrypt,
  getAdminPasscode,
  setAdminPasscode,
  getTokenSalt,
  setTokenSalt,
} from '../src/utils/crypto';

describe('Crypto Utilities', () => {
  test('sha256 generates consistent SHA-256 hex digest', () => {
    const hash1 = sha256('hello-gigi');
    const hash2 = sha256('hello-gigi');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
  });

  test('encrypt and decrypt roundtrip matches plaintext', () => {
    const secret = 'AdminUser|2026-12-31|azure-api-key-test|sig12345';
    const password = 'my-super-secret-salt';

    const ciphertext = encrypt(secret, password);
    expect(ciphertext).not.toBe(secret);

    const decrypted = decrypt(ciphertext, password);
    expect(decrypted).toBe(secret);
  });

  test('admin passcode defaults and updates correctly', () => {
    expect(getAdminPasscode()).toBeTruthy();

    setAdminPasscode('custom-passcode-test');
    expect(getAdminPasscode()).toBe('custom-passcode-test');
  });

  test('token salt defaults and updates correctly', () => {
    expect(getTokenSalt()).toBeTruthy();

    setTokenSalt('custom-salt-test');
    expect(getTokenSalt()).toBe('custom-salt-test');
  });
});
