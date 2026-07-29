const { User } = require('../models');
const { generateToken } = require('../utils/jwtUtils');
const { queueAllStreakUpdates } = require('../services/streakQueueService');

async function login(req, res, next) {
  try {
    const { uid, email, name } = req.body;
    if (!uid || !email || !name) {
      return res.status(400).json({ error: 'uid, email, and name are required' });
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
