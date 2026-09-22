const { User } = require('../models');
const { generateToken } = require('../utils/jwtUtils');
const { queueAllStreakUpdates } = require('../services/streakQueueService');
const { verifyFirebaseIdToken } = require('../services/firebaseAuth');

async function login(req, res, next) {
  try {
    const { id_token, name: clientName } = req.body;

    // uid/email come only from the verified token from here on — a caller
    // can no longer just assert whose account a login is for. name isn't
    // identity-bearing (Apple's token never carries it, only the client's
    // one-time onAuthorizationCredentialAppleID callback does), so it's the
    // one field still accepted from the request, used only when the token
    // itself has nothing.
    let uid, email, name;
    if (id_token) {
      try {
        const verified = await verifyFirebaseIdToken(id_token);
        uid = verified.uid;
        email = verified.email;
        name = verified.name || clientName || (email ? email.split('@')[0] : 'User');
      } catch (err) {
        return res.status(401).json({ error: `Invalid ID token: ${err.message}` });
      }
      if (!email) {
        return res.status(400).json({ error: 'ID token has no email' });
      }
    } else if (process.env.ALLOW_TEST_LOGIN === 'true') {
      // Local/test-only escape hatch: this backend has no way to mint real
      // Google-signed ID tokens outside an actual device sign-in flow, so
      // test scripts need a path in. Never set ALLOW_TEST_LOGIN in a
      // deployed environment — with it unset (the default), this branch is
      // dead code and id_token is required exactly as above.
      ({ uid, email, name } = req.body);
      if (!uid || !email || !name) {
        return res.status(400).json({ error: 'uid, email, and name are required' });
      }
      console.warn(`[ALLOW_TEST_LOGIN] Unverified login for ${email}`);
    } else {
      return res.status(400).json({ error: 'id_token is required' });
    }

    // Step 1: Check if user exists with this provider's UID
    let user = await User.findOne({ uid });

    if (!user) {
      // Step 2: Check if an account exists with the same email (cross-provider login)
      user = await User.findOne({ email });
    }

    if (!user) {
      // Step 3: No existing account — create new user
      try {
        user = await User.create({ uid, email, name });
      } catch (err) {
        if (err.code === 11000) {
          user = await User.findOne({ uid });
        } else {
          throw err;
        }
      }
    }

    const token = generateToken({ id: user._id, uid: user.uid });

    // Queue streak updates async
    queueAllStreakUpdates(user._id);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        dob: user.dob,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
