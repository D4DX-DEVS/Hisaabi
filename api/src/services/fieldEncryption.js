/**
 * Encrypts free-text fields at rest — specifically Personal Cycle notes,
 * the one field in that feature that can hold whatever personal detail a
 * user chooses to write, unlike the start/end dates next to it.
 *
 * Dates are deliberately left alone: they're queried directly (range
 * queries for eligible-day/exemption math run across the whole app), and
 * encrypting them would break every one of those without adding much —
 * a date range narrows things down regardless of encryption, while free
 * text is where someone might actually write something sensitive.
 *
 * AES-256-GCM with a server-held key (ENCRYPTION_KEY, 32 bytes as base64).
 * Without that env var set, encryption is a no-op and fields are stored as
 * plain text exactly as before — callers should treat that as "not yet
 * configured", not silently pretend data is protected when it isn't.
 */
const crypto = require('crypto');

const KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'base64') : null;
const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:'; // marks a value as our own ciphertext, not legacy plaintext

const configured = !!(KEY && KEY.length === 32);
if (process.env.ENCRYPTION_KEY && !configured) {
  console.warn('[fieldEncryption] ENCRYPTION_KEY is set but is not 32 bytes of base64 — encryption disabled.');
} else if (!configured) {
  console.warn('[fieldEncryption] ENCRYPTION_KEY not set — sensitive fields are stored as plain text.');
}

/**
 * Encrypts a string for storage. Returns the input unchanged if encryption
 * isn't configured, or if the input is empty/not a string.
 */
function encryptField(text) {
  if (!configured || typeof text !== 'string' || text === '') return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/**
 * Decrypts a value stored by encryptField. Values without our prefix are
 * returned as-is — either encryption was never configured, or the record
 * predates it, and either way that's the plain text, not ciphertext.
 */
function decryptField(stored) {
  if (typeof stored !== 'string' || !stored.startsWith(PREFIX)) return stored;
  if (!configured) return stored; // can't decrypt without the key; don't crash the request over it

  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (err) {
    console.warn('[fieldEncryption] Failed to decrypt a field:', err.message);
    return null;
  }
}

module.exports = { encryptField, decryptField, isConfigured: () => configured };
