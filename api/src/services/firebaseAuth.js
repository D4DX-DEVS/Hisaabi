/**
 * Verifies a Firebase ID token was actually issued by Google for this
 * project, without needing a service-account credential.
 *
 * Login used to trust whatever `uid`/`email`/`name` the client sent, with
 * nothing tying the request to the Firebase account it claimed to be —
 * anyone who knew (or guessed) another user's uid could mint a session
 * token for that account. Verifying the ID token the client already gets
 * back from `signInWithCredential` closes that: it is a JWT signed by
 * Google, and can be checked against Google's published public keys, the
 * same approach Firebase documents for backends that only need to verify
 * tokens rather than mint them — no service-account key required.
 */
const jwt = require('jsonwebtoken');

const PROJECT_ID = 'hisabi-11772';
const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const CERTS_CACHE_MS = 60 * 60 * 1000; // Google rotates these every few hours.

let cachedCerts = null;
let cachedAt = 0;

async function getGoogleCerts() {
  if (cachedCerts && Date.now() - cachedAt < CERTS_CACHE_MS) return cachedCerts;

  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    throw new Error(`Could not fetch Google signing certs: ${res.status}`);
  }
  cachedCerts = await res.json();
  cachedAt = Date.now();
  return cachedCerts;
}

/**
 * Returns { uid, email, name } decoded from a verified token.
 * Throws if the token is missing, malformed, expired, or not actually
 * signed by Google for this project.
 */
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing ID token');
  }

  const unverified = jwt.decode(idToken, { complete: true });
  const kid = unverified?.header?.kid;
  if (!kid) throw new Error('Malformed ID token');

  const certs = await getGoogleCerts();
  const cert = certs[kid];
  if (!cert) throw new Error('ID token signed with an unrecognised key');

  // algorithms is pinned so a token signed some other way (or with 'none')
  // can never be mistaken for one of Google's.
  const decoded = jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience: PROJECT_ID,
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
  });

  if (!decoded.sub) throw new Error('ID token missing subject');

  return { uid: decoded.sub, email: decoded.email, name: decoded.name };
}

module.exports = { verifyFirebaseIdToken };
