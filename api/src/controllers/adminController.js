const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const {
  User, ActivityLog, Group, GroupActivity, Streak,
  PrayerTracking, DhikrTracking, FastingDay, QuranReading,
  DuaMemorization, QuranMemorization, QuranProgress,
  Dua, DuaCategory, DhikrCategory, DhikrType, FastingType,
  QuranReadingContent, QuranMemorizationContent, Tasbeeh,
  VerseImportance, DhikrImportance, DuaImportance,
  DailyQuote,
  FridayQuote,
  Hadees, HadeesCategory, NameOfAllah,
  LiveLink,
  RamadanDua,
  Banner,
} = require('../models');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_fallback_secret';

/** Returns conflicting doc if order is already taken, null otherwise. Pass excludeId for updates. */
async function checkOrderUnique(Model, orderNum, excludeId = null, scope = {}) {
  if (orderNum === null || orderNum === undefined) return null;
  const query = { ...scope, order: orderNum };
  if (excludeId) query._id = { $ne: excludeId };
  return Model.findOne(query);
}

/** Malayalam required; English and Urdu optional (null when empty). */
function normalizeTrilingualDescription(desc) {
  if (!desc || typeof desc !== 'object') {
    return { malayalam: '', english: null, urdu: null };
  }
  const malayalam = String(desc.malayalam ?? '').trim();
  const englishRaw = String(desc.english ?? '').trim();
  const urduRaw = String(desc.urdu ?? '').trim();
  return {
    malayalam,
    english: englishRaw.length ? englishRaw : null,
    urdu: urduRaw.length ? urduRaw : null,
  };
}

/** Same normalization for trilingual title fields. Malayalam is the primary language; English and Urdu are optional. */
function normalizeTrilingualTitle(raw) {
  if (!raw || typeof raw !== 'object') {
    const fallback = typeof raw === 'string' ? raw.trim() : '';
    return { malayalam: fallback, english: null, urdu: null };
  }
  const malayalam = String(raw.malayalam ?? '').trim();
  const englishRaw = String(raw.english ?? '').trim();
  const urduRaw = String(raw.urdu ?? '').trim();
  return {
    malayalam,
    english: englishRaw.length ? englishRaw : null,
    urdu: urduRaw.length ? urduRaw : null,
  };
}

// POST /api/admin/login
async function adminLogin(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ username, isAdmin: true }, ADMIN_JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token, username });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/stats
async function getStats(req, res, next) {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers, totalGroups, totalActivityLogs, todayActivity,
      recentUsers, newUsersThisMonth, maleUsers, femaleUsers,
      activityBreakdown, streaks,
    ] = await Promise.all([
      User.countDocuments(),
      Group.countDocuments(),
      ActivityLog.countDocuments(),
      ActivityLog.countDocuments({ date: today }),
      User.countDocuments({ created_at: { $gte: weekAgo } }),
      User.countDocuments({ created_at: { $gte: monthStart } }),
      User.countDocuments({ gender: 'm' }),
      User.countDocuments({ gender: 'f' }),
      ActivityLog.aggregate([
        { $match: { created_at: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$activity_type', count: { $sum: 1 } } },
      ]),
      Streak.aggregate([
        { $group: { _id: '$streak_type', avg_current: { $avg: '$current_streak' }, avg_longest: { $avg: '$longest_streak' } } },
      ]),
    ]);

    const streakStats = {};
    for (const s of streaks) {
      streakStats[s._id] = {
        avg_current: Math.round(s.avg_current * 10) / 10,
        avg_longest: Math.round(s.avg_longest * 10) / 10,
      };
    }

    const activityBreakdownMap = {};
    for (const a of activityBreakdown) activityBreakdownMap[a._id] = a.count;

    return res.status(200).json({
      total_users: totalUsers,
      total_groups: totalGroups,
      total_activity_logs: totalActivityLogs,
      today_activity_count: todayActivity,
      new_users_last_7_days: recentUsers,
      new_users_this_month: newUsersThisMonth,
      male_users: maleUsers,
      female_users: femaleUsers,
      activity_breakdown: activityBreakdownMap,
      streak_averages: streakStats,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
async function getUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = search
      ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
      : {};

    const [users, total] = await Promise.all([
      User.find(query).select('-settings').sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      users,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id
async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [streaks, recentActivity] = await Promise.all([
      Streak.find({ user_id: id }),
      ActivityLog.find({ user_id: id }).sort({ created_at: -1 }).limit(20).select('-user_id'),
    ]);

    return res.status(200).json({ user, streaks, recent_activity: recentActivity });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:id
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.deleteOne();
    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/groups
async function getGroups(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [groups, total] = await Promise.all([
      Group.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)).populate('admin_id', 'name email'),
      Group.countDocuments(),
    ]);

    return res.status(200).json({
      groups,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/groups/:id
async function getGroupDetail(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id).populate('admin_id', 'name email uid').populate('co_admins', 'name email uid');
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const memberIds = group.users || [];
    const [members, activities] = await Promise.all([
      User.find({ _id: { $in: memberIds } }).select('name email uid gender created_at'),
      GroupActivity.find({ group_id: id }).sort({ date: -1 }),
    ]);

    return res.status(200).json({ group, members, activities });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/groups/:id
async function deleteGroup(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    await group.deleteOne(); // cascade deletes group activities
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/activity-logs
async function getActivityLogs(req, res, next) {
  try {
    const { page = 1, limit = 50, user_id, activity_type, start_date, end_date } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (user_id) query.user_id = user_id;
    if (activity_type) query.activity_type = activity_type;
    if (start_date || end_date) {
      query.date = {};
      if (start_date) query.date.$gte = start_date;
      if (end_date) query.date.$lte = end_date;
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)).populate('user_id', 'name email'),
      ActivityLog.countDocuments(query),
    ]);

    return res.status(200).json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Content Management: Duas ────────────────────────────────────────────────

async function getDuas(req, res, next) {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (category && search) {
      // Both filters: match category (primary or additional) AND search text
      filter.$and = [
        { $or: [{ category }, { additional_categories: category }] },
        { $or: [{ title: { $regex: search, $options: 'i' } }, { arabic_text: { $regex: search, $options: 'i' } }] },
      ];
    } else if (category) {
      filter.$or = [{ category }, { additional_categories: category }];
    } else if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { arabic_text: { $regex: search, $options: 'i' } },
      ];
    }

    const allDuas = await Dua.find(filter).populate('category').populate('additional_categories').sort({ created_at: -1 });
    const total = allDuas.length;
    const _duasOrdered = allDuas.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _duasUnordered = allDuas.filter(d => d.order == null);
    const duas = [..._duasOrdered, ..._duasUnordered].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      duas,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createDua(req, res, next) {
  try {
    const { title, title_malayalam, title_urdu, arabic_text, category, count, isCountless, malayalam, english, urdu, description, additional_categories, isQuranicFont, order } = req.body;
    const countless = !!isCountless;
    if (!title || !arabic_text || !category || (!countless && count === undefined)) {
      return res.status(400).json({ error: 'title, arabic_text, category, and count (or isCountless) are required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(Dua, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another dua` });
    }
    const created = await Dua.create({ title, title_malayalam, title_urdu, arabic_text, category, count: countless ? null : count, isCountless: countless, malayalam, english, urdu, description, additional_categories: additional_categories || [], isQuranicFont: !!isQuranicFont, order: orderNum });
    const dua = await Dua.findById(created._id).populate('category').populate('additional_categories');
    return res.status(201).json(dua);
  } catch (err) { next(err); }
}

async function updateDua(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['title', 'title_malayalam', 'title_urdu', 'arabic_text', 'category', 'count', 'isCountless', 'malayalam', 'english', 'urdu', 'description', 'additional_categories', 'isQuranicFont', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (updates.isCountless) updates.count = null;
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(Dua, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another dua` });
    }
    const dua = await Dua.findByIdAndUpdate(id, updates, { new: true }).populate('category').populate('additional_categories');
    if (!dua) return res.status(404).json({ error: 'Dua not found' });
    return res.status(200).json(dua);
  } catch (err) { next(err); }
}

async function deleteDua(req, res, next) {
  try {
    const { id } = req.params;
    const dua = await Dua.findByIdAndDelete(id);
    if (!dua) return res.status(404).json({ error: 'Dua not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: DuaCategories ──────────────────────────────────────

async function getDuaCategories(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const allDuaCats = await DuaCategory.find().populate('parent').sort({ name: 1 });
    const total = allDuaCats.length;
    const _dcOrd = allDuaCats.filter(c => c.order != null).sort((a, b) => a.order - b.order);
    const _dcUn = allDuaCats.filter(c => c.order == null);
    const categories = [..._dcOrd, ..._dcUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      dua_categories: categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createDuaCategory(req, res, next) {
  try {
    const { name, name_malayalam, name_urdu, description, parent, order } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(DuaCategory, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another dua category` });
    }
    const category = await DuaCategory.create({ name, name_malayalam, name_urdu, description, parent: parent || null, order: orderNum });
    await category.populate('parent');
    return res.status(201).json(category);
  } catch (err) { next(err); }
}

async function updateDuaCategory(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['name', 'name_malayalam', 'name_urdu', 'description', 'parent', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (req.body.parent === null || req.body.parent === '') updates.parent = null;
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(DuaCategory, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another dua category` });
    }
    const category = await DuaCategory.findByIdAndUpdate(id, updates, { new: true }).populate('parent');
    if (!category) return res.status(404).json({ error: 'DuaCategory not found' });
    return res.status(200).json(category);
  } catch (err) { next(err); }
}

async function deleteDuaCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await DuaCategory.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ error: 'DuaCategory not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: DhikrTypes ─────────────────────────────────────────

async function getDhikrTypes(req, res, next) {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { arabic_text: { $regex: search, $options: 'i' } },
    ];

    const allDhikrTypes = await DhikrType.find(filter).populate('category').sort({ created_at: -1 });
    const total = allDhikrTypes.length;
    const _dtOrd = allDhikrTypes.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _dtUn = allDhikrTypes.filter(d => d.order == null);
    const types = [..._dtOrd, ..._dtUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      dhikr_types: types,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createDhikrType(req, res, next) {
  try {
    const { name, name_malayalam, name_urdu, category, count, isCountless, arabic_text, malayalam, english, urdu, isQuranicFont, order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const countless = !!isCountless;
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(DhikrType, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another dhikr type` });
    }
    const type = await (await DhikrType.create({ name, name_malayalam, name_urdu, category: category || null, count: countless ? null : (count ?? null), isCountless: countless, arabic_text, malayalam, english, urdu, isQuranicFont: !!isQuranicFont, order: orderNum })).populate('category');
    return res.status(201).json(type);
  } catch (err) { next(err); }
}

async function updateDhikrType(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['name', 'name_malayalam', 'name_urdu', 'category', 'count', 'isCountless', 'arabic_text', 'malayalam', 'english', 'urdu', 'isQuranicFont', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (updates.isCountless) updates.count = null;
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(DhikrType, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another dhikr type` });
    }
    const type = await DhikrType.findByIdAndUpdate(id, updates, { new: true }).populate('category');
    if (!type) return res.status(404).json({ error: 'DhikrType not found' });
    return res.status(200).json(type);
  } catch (err) { next(err); }
}

async function deleteDhikrType(req, res, next) {
  try {
    const { id } = req.params;
    const type = await DhikrType.findByIdAndDelete(id);
    if (!type) return res.status(404).json({ error: 'DhikrType not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: DhikrCategories ────────────────────────────────────

async function getDhikrCategories(req, res, next) {
  try {
    const { page = 1, limit = 500, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } },
      ],
    } : {};

    const allDhikrCats = await DhikrCategory.find(filter).populate('parent').sort({ display_name: 1 });
    const total = allDhikrCats.length;
    const _dkcOrd = allDhikrCats.filter(c => c.order != null).sort((a, b) => a.order - b.order);
    const _dkcUn = allDhikrCats.filter(c => c.order == null);
    const categories = [..._dkcOrd, ..._dkcUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      dhikr_categories: categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createDhikrCategory(req, res, next) {
  try {
    const { name, display_name, display_name_malayalam, display_name_urdu, description, parent, order } = req.body;
    if (!name || !display_name) {
      return res.status(400).json({ error: 'name and display_name are required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(DhikrCategory, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another dhikr category` });
    }
    const category = await DhikrCategory.create({ name, display_name, display_name_malayalam, display_name_urdu, description, parent: parent || null, order: orderNum });
    await category.populate('parent');
    return res.status(201).json(category);
  } catch (err) { next(err); }
}

async function updateDhikrCategory(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['name', 'display_name', 'display_name_malayalam', 'display_name_urdu', 'description', 'parent', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (req.body.parent === null || req.body.parent === '') updates.parent = null;
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(DhikrCategory, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another dhikr category` });
    }
    const category = await DhikrCategory.findByIdAndUpdate(id, updates, { new: true }).populate('parent');
    if (!category) return res.status(404).json({ error: 'DhikrCategory not found' });
    return res.status(200).json(category);
  } catch (err) { next(err); }
}

async function deleteDhikrCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await DhikrCategory.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ error: 'DhikrCategory not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: Thasbeehs ──────────────────────────────────────────

async function getThasbeehs(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { arabic_text: { $regex: search, $options: 'i' } },
    ];

    const allThasbeehs = await Tasbeeh.find(filter).sort({ created_at: -1 });
    const total = allThasbeehs.length;
    const _tbOrd = allThasbeehs.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _tbUn = allThasbeehs.filter(d => d.order == null);
    const thasbeehs = [..._tbOrd, ..._tbUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      thasbeehs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createTasbeeh(req, res, next) {
  try {
    const { title, title_malayalam, title_urdu, arabic_text, count, isCountless, malayalam, english, urdu, description, isQuranicFont, order } = req.body;
    const countless = !!isCountless;
    if (!title || !arabic_text || (!countless && count === undefined)) {
      return res.status(400).json({ error: 'title, arabic_text, and count (or isCountless) are required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(Tasbeeh, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another tasbeeh` });
    }
    const tasbeeh = await Tasbeeh.create({ title, title_malayalam, title_urdu, arabic_text, count: countless ? null : count, isCountless: countless, malayalam, english, urdu, description, isQuranicFont: !!isQuranicFont, order: orderNum });
    return res.status(201).json(tasbeeh);
  } catch (err) { next(err); }
}

async function updateTasbeeh(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['title', 'title_malayalam', 'title_urdu', 'arabic_text', 'count', 'isCountless', 'malayalam', 'english', 'urdu', 'description', 'isQuranicFont', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (updates.isCountless) updates.count = null;
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(Tasbeeh, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another tasbeeh` });
    }
    const tasbeeh = await Tasbeeh.findByIdAndUpdate(id, updates, { new: true });
    if (!tasbeeh) return res.status(404).json({ error: 'Tasbeeh not found' });
    return res.status(200).json(tasbeeh);
  } catch (err) { next(err); }
}

async function deleteTasbeeh(req, res, next) {
  try {
    const { id } = req.params;
    const tasbeeh = await Tasbeeh.findByIdAndDelete(id);
    if (!tasbeeh) return res.status(404).json({ error: 'Tasbeeh not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: FastingTypes ───────────────────────────────────────

async function getFastingTypes(req, res, next) {
  try {
    const { page = 1, limit = 500, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } },
      ],
    } : {};

    const allFastingTypes = await FastingType.find(filter).populate('parent').sort({ display_name: 1 });
    const total = allFastingTypes.length;
    const _ftOrd = allFastingTypes.filter(t => t.order != null).sort((a, b) => a.order - b.order);
    const _ftUn = allFastingTypes.filter(t => t.order == null);
    const types = [..._ftOrd, ..._ftUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      fasting_types: types,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createFastingType(req, res, next) {
  try {
    const { name, display_name, description, parent, order } = req.body;
    if (!name || !display_name) {
      return res.status(400).json({ error: 'name and display_name are required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(FastingType, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another fasting type` });
    }
    const type = await FastingType.create({ name, display_name, description, parent: parent || null, order: orderNum });
    await type.populate('parent');
    return res.status(201).json(type);
  } catch (err) { next(err); }
}

async function updateFastingType(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['name', 'display_name', 'description', 'parent', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (req.body.parent === null || req.body.parent === '') updates.parent = null;
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(FastingType, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another fasting type` });
    }
    const type = await FastingType.findByIdAndUpdate(id, updates, { new: true }).populate('parent');
    if (!type) return res.status(404).json({ error: 'FastingType not found' });
    return res.status(200).json(type);
  } catch (err) { next(err); }
}

async function deleteFastingType(req, res, next) {
  try {
    const { id } = req.params;
    const type = await FastingType.findByIdAndDelete(id);
    if (!type) return res.status(404).json({ error: 'FastingType not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Leaderboard / Model Stats ───────────────────────────────────────────────

async function getDhikrTrackingStats(req, res, next) {
  try {
    const rows = await DhikrTracking.aggregate([
      {
        $project: {
          user_id: 1,
          total: {
            $sum: { $map: { input: { $objectToArray: '$dhikr_counts' }, as: 'k', in: '$$k.v' } },
          },
        },
      },
      { $group: { _id: '$user_id', total_dhikr: { $sum: '$total' } } },
      { $sort: { total_dhikr: -1 } },
      {
        $lookup: {
          from: 'users', localField: '_id', foreignField: '_id', as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);
    return res.status(200).json({ leaderboard: rows });
  } catch (err) { next(err); }
}

async function getDuaMemorizationStats(req, res, next) {
  try {
    const rows = await DuaMemorization.aggregate([
      { $project: { user_id: 1, count: { $size: '$memorized_duas' } } },
      { $sort: { count: -1 } },
      {
        $lookup: {
          from: 'users', localField: 'user_id', foreignField: '_id', as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);
    return res.status(200).json({ leaderboard: rows });
  } catch (err) { next(err); }
}

async function getFastingStats(req, res, next) {
  try {
    const rows = await FastingDay.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$user_id', completed_days: { $sum: 1 } } },
      { $sort: { completed_days: -1 } },
      {
        $lookup: {
          from: 'users', localField: '_id', foreignField: '_id', as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);
    return res.status(200).json({ leaderboard: rows });
  } catch (err) { next(err); }
}

async function getPrayerTrackingStats(req, res, next) {
  try {
    const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const rows = await PrayerTracking.aggregate([
      {
        $project: {
          user_id: 1,
          completed_count: {
            $add: PRAYERS.map((p) => ({
              $cond: [{ $eq: [`$fardh_prayers.${p}`, true] }, 1, 0],
            })),
          },
        },
      },
      { $group: { _id: '$user_id', total_prayers: { $sum: '$completed_count' } } },
      { $sort: { total_prayers: -1 } },
      {
        $lookup: {
          from: 'users', localField: '_id', foreignField: '_id', as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);
    return res.status(200).json({ leaderboard: rows });
  } catch (err) { next(err); }
}

async function getQuranReadingStats(req, res, next) {
  try {
    const rows = await QuranReading.aggregate([
      { $project: { user_id: 1, pages_count: { $size: '$pages_read' } } },
      { $group: { _id: '$user_id', total_pages: { $sum: '$pages_count' } } },
      { $sort: { total_pages: -1 } },
      {
        $lookup: {
          from: 'users', localField: '_id', foreignField: '_id', as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);
    return res.status(200).json({ leaderboard: rows });
  } catch (err) { next(err); }
}

async function getQuranMemorizationStats(req, res, next) {
  try {
    const rows = await QuranMemorization.aggregate([
      { $project: { user_id: 1, count: { $size: '$memorized_ayahs' } } },
      { $sort: { count: -1 } },
      {
        $lookup: {
          from: 'users', localField: 'user_id', foreignField: '_id', as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);
    return res.status(200).json({ leaderboard: rows });
  } catch (err) { next(err); }
}

async function getQuranProgressStats(req, res, next) {
  try {
    const rows = await QuranProgress.aggregate([
      { $sort: { khatms_completed: -1 } },
      {
        $lookup: {
          from: 'users', localField: 'user_id', foreignField: '_id', as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);
    return res.status(200).json({ leaderboard: rows });
  } catch (err) { next(err); }
}

async function getStreakStats(req, res, next) {
  try {
    const { type = 'combined' } = req.query;
    const rows = await Streak.aggregate([
      { $match: { streak_type: type } },
      { $sort: { current_streak: -1, longest_streak: -1 } },
      {
        $lookup: {
          from: 'users', localField: 'user_id', foreignField: '_id', as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);
    return res.status(200).json({ leaderboard: rows, type });
  } catch (err) { next(err); }
}
// ─── Tracking Records (read-only) ───────────────────────────────────────────

async function getPrayerTrackingRecords(req, res, next) {
  try {
    const { user_id, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = user_id ? { user_id } : {};
    const [records, total] = await Promise.all([
      PrayerTracking.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit))
        .populate('user_id', 'name email'),
      PrayerTracking.countDocuments(query),
    ]);
    return res.status(200).json({ records, total, page: parseInt(page), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

async function getQuranReadingRecords(req, res, next) {
  try {
    const { user_id, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = user_id ? { user_id } : {};
    const [records, total] = await Promise.all([
      QuranReading.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit))
        .populate('user_id', 'name email'),
      QuranReading.countDocuments(query),
    ]);
    return res.status(200).json({ records, total, page: parseInt(page), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

async function getQuranMemorizationRecords(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      QuranMemorization.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit))
        .populate('user_id', 'name email'),
      QuranMemorization.countDocuments(),
    ]);
    return res.status(200).json({ records, total, page: parseInt(page), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}
// ─── Content Management: QuranReadingContent ────────────────────────────────

async function getQuranReadingContents(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contents, total] = await Promise.all([
      QuranReadingContent.find().sort({ order: 1, created_at: -1 }).skip(skip).limit(parseInt(limit)),
      QuranReadingContent.countDocuments(),
    ]);

    return res.status(200).json({
      contents,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createQuranReadingContent(req, res, next) {
  try {
    const { title, description, surah_number, juz_number, page_from, page_to, order, is_active } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const content = await QuranReadingContent.create({
      title, description, surah_number, juz_number, page_from, page_to,
      order: order ?? 0,
      is_active: is_active !== undefined ? is_active : true,
    });
    return res.status(201).json(content);
  } catch (err) { next(err); }
}

async function updateQuranReadingContent(req, res, next) {
  try {
    const { id } = req.params;
    const fields = ['title', 'description', 'surah_number', 'juz_number', 'page_from', 'page_to', 'order', 'is_active'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const content = await QuranReadingContent.findByIdAndUpdate(id, updates, { new: true });
    if (!content) return res.status(404).json({ error: 'Content not found' });
    return res.status(200).json(content);
  } catch (err) { next(err); }
}

async function deleteQuranReadingContent(req, res, next) {
  try {
    const { id } = req.params;
    const content = await QuranReadingContent.findByIdAndDelete(id);
    if (!content) return res.status(404).json({ error: 'Content not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: QuranMemorizationContent ───────────────────────────

async function getQuranMemorizationContents(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contents, total] = await Promise.all([
      QuranMemorizationContent.find().sort({ order: 1, surah_number: 1, ayah_from: 1 }).skip(skip).limit(parseInt(limit)),
      QuranMemorizationContent.countDocuments(),
    ]);

    return res.status(200).json({
      contents,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createQuranMemorizationContent(req, res, next) {
  try {
    const { title, title_malayalam, title_urdu, description, surah_number, surah_name, ayah_from, ayah_to, arabic_text, order, is_active, isQuranicFont } = req.body;
    if (!title || !surah_number || !ayah_from || !ayah_to) {
      return res.status(400).json({ error: 'title, surah_number, ayah_from and ayah_to are required' });
    }
    const content = await QuranMemorizationContent.create({
      title, title_malayalam, title_urdu, description, surah_number, surah_name, ayah_from, ayah_to, arabic_text,
      order: order ?? 0,
      is_active: is_active !== undefined ? is_active : true,
      isQuranicFont: !!isQuranicFont,
    });
    return res.status(201).json(content);
  } catch (err) { next(err); }
}

async function updateQuranMemorizationContent(req, res, next) {
  try {
    const { id } = req.params;
    const fields = ['title', 'title_malayalam', 'title_urdu', 'description', 'surah_number', 'surah_name', 'ayah_from', 'ayah_to', 'arabic_text', 'order', 'is_active', 'isQuranicFont'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const content = await QuranMemorizationContent.findByIdAndUpdate(id, updates, { new: true });
    if (!content) return res.status(404).json({ error: 'Content not found' });
    return res.status(200).json(content);
  } catch (err) { next(err); }
}

async function deleteQuranMemorizationContent(req, res, next) {
  try {
    const { id } = req.params;
    const content = await QuranMemorizationContent.findByIdAndDelete(id);
    if (!content) return res.status(404).json({ error: 'Content not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: VerseImportance ────────────────────────────────────

async function getVerseImportances(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      VerseImportance.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      VerseImportance.countDocuments(),
    ]);
    return res.status(200).json({ verse_importances: items, total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

async function createVerseImportance(req, res, next) {
  try {
    const { verse = '', source = '', title: rawTitle, description: rawDesc } = req.body;
    const title = normalizeTrilingualTitle(rawTitle);
    const description = normalizeTrilingualDescription(rawDesc);
    if (!description.malayalam) return res.status(400).json({ error: 'description.malayalam is required' });
    const item = await VerseImportance.create({ verse, source, title, description });
    return res.status(201).json(item);
  } catch (err) { next(err); }
}

async function updateVerseImportance(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await VerseImportance.findById(id);
    if (!existing) return res.status(404).json({ error: 'VerseImportance not found' });
    const updates = {};
    if (req.body.verse !== undefined) updates.verse = req.body.verse;
    if (req.body.source !== undefined) updates.source = req.body.source;
    if (req.body.title !== undefined) {
      const prevTitle = existing.title && typeof existing.title === 'object'
        ? { malayalam: existing.title.malayalam, english: existing.title.english, urdu: existing.title.urdu }
        : {};
      updates.title = normalizeTrilingualTitle({ ...prevTitle, ...req.body.title });
    }
    if (req.body.description !== undefined) {
      const raw = existing.description;
      const prev =
        raw && typeof raw === 'object'
          ? { malayalam: raw.malayalam, english: raw.english, urdu: raw.urdu }
          : {};
      const description = normalizeTrilingualDescription({ ...prev, ...req.body.description });
      if (!description.malayalam) return res.status(400).json({ error: 'description.malayalam is required' });
      updates.description = description;
    }
    const item = await VerseImportance.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

async function deleteVerseImportance(req, res, next) {
  try {
    const { id } = req.params;
    const item = await VerseImportance.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ error: 'VerseImportance not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: DhikrImportance ────────────────────────────────────

async function getDhikrImportances(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      DhikrImportance.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      DhikrImportance.countDocuments(),
    ]);
    return res.status(200).json({ dhikr_importances: items, total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

async function createDhikrImportance(req, res, next) {
  try {
    const { dhikr = '', source = '', title: rawTitle, description: rawDesc } = req.body;
    const title = normalizeTrilingualTitle(rawTitle);
    const description = normalizeTrilingualDescription(rawDesc);
    if (!description.malayalam) return res.status(400).json({ error: 'description.malayalam is required' });
    const item = await DhikrImportance.create({ dhikr, source, title, description });
    return res.status(201).json(item);
  } catch (err) { next(err); }
}

async function updateDhikrImportance(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await DhikrImportance.findById(id);
    if (!existing) return res.status(404).json({ error: 'DhikrImportance not found' });
    const updates = {};
    if (req.body.dhikr !== undefined) updates.dhikr = req.body.dhikr;
    if (req.body.source !== undefined) updates.source = req.body.source;
    if (req.body.title !== undefined) {
      const prevTitle = existing.title && typeof existing.title === 'object'
        ? { malayalam: existing.title.malayalam, english: existing.title.english, urdu: existing.title.urdu }
        : {};
      updates.title = normalizeTrilingualTitle({ ...prevTitle, ...req.body.title });
    }
    if (req.body.description !== undefined) {
      const raw = existing.description;
      const prev =
        raw && typeof raw === 'object'
          ? { malayalam: raw.malayalam, english: raw.english, urdu: raw.urdu }
          : {};
      const description = normalizeTrilingualDescription({ ...prev, ...req.body.description });
      if (!description.malayalam) return res.status(400).json({ error: 'description.malayalam is required' });
      updates.description = description;
    }
    const item = await DhikrImportance.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

async function deleteDhikrImportance(req, res, next) {
  try {
    const { id } = req.params;
    const item = await DhikrImportance.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ error: 'DhikrImportance not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: DuaImportance ──────────────────────────────────────

async function getDuaImportances(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      DuaImportance.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      DuaImportance.countDocuments(),
    ]);
    return res.status(200).json({ dua_importances: items, total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

async function createDuaImportance(req, res, next) {
  try {
    const { dua = '', source = '', title: rawTitle, description: rawDesc } = req.body;
    const title = normalizeTrilingualTitle(rawTitle);
    const description = normalizeTrilingualDescription(rawDesc);
    if (!description.malayalam) return res.status(400).json({ error: 'description.malayalam is required' });
    const item = await DuaImportance.create({ dua, source, title, description });
    return res.status(201).json(item);
  } catch (err) { next(err); }
}

async function updateDuaImportance(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await DuaImportance.findById(id);
    if (!existing) return res.status(404).json({ error: 'DuaImportance not found' });
    const updates = {};
    if (req.body.dua !== undefined) updates.dua = req.body.dua;
    if (req.body.source !== undefined) updates.source = req.body.source;
    if (req.body.title !== undefined) {
      const prevTitle = existing.title && typeof existing.title === 'object'
        ? { malayalam: existing.title.malayalam, english: existing.title.english, urdu: existing.title.urdu }
        : {};
      updates.title = normalizeTrilingualTitle({ ...prevTitle, ...req.body.title });
    }
    if (req.body.description !== undefined) {
      const raw = existing.description;
      const prev =
        raw && typeof raw === 'object'
          ? { malayalam: raw.malayalam, english: raw.english, urdu: raw.urdu }
          : {};
      const description = normalizeTrilingualDescription({ ...prev, ...req.body.description });
      if (!description.malayalam) return res.status(400).json({ error: 'description.malayalam is required' });
      updates.description = description;
    }
    const item = await DuaImportance.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

async function deleteDuaImportance(req, res, next) {
  try {
    const { id } = req.params;
    const item = await DuaImportance.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ error: 'DuaImportance not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: DailyQuotes ────────────────────────────────────────

async function getDailyQuotes(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (search) filter.$or = [
      { text: { $regex: search, $options: 'i' } },
      { english: { $regex: search, $options: 'i' } },
      { malayalam: { $regex: search, $options: 'i' } },
    ];

    const [quotes, total] = await Promise.all([
      DailyQuote.find(filter).sort({ display_date: -1 }).skip(skip).limit(parseInt(limit)),
      DailyQuote.countDocuments(filter),
    ]);

    return res.status(200).json({
      daily_quotes: quotes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function createDailyQuote(req, res, next) {
  try {
    const { text, malayalam, english, urdu, display_date, reference } = req.body;
    if (!text || !display_date) {
      return res.status(400).json({ error: 'text and display_date are required' });
    }
    const quote = await DailyQuote.create({ text, malayalam, english, urdu, display_date, reference });
    return res.status(201).json(quote);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'A quote for this date already exists' });
    next(err);
  }
}

async function updateDailyQuote(req, res, next) {
  try {
    const { id } = req.params;
    const fields = ['text', 'malayalam', 'english', 'urdu', 'display_date', 'reference'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const quote = await DailyQuote.findByIdAndUpdate(id, updates, { new: true });
    if (!quote) return res.status(404).json({ error: 'DailyQuote not found' });
    return res.status(200).json(quote);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'A quote for this date already exists' });
    next(err);
  }
}

async function deleteDailyQuote(req, res, next) {
  try {
    const { id } = req.params;
    const quote = await DailyQuote.findByIdAndDelete(id);
    if (!quote) return res.status(404).json({ error: 'DailyQuote not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: FridayQuotes ──────────────────────

async function getFridayQuotes(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (search) filter.$or = [
      { text: { $regex: search, $options: 'i' } },
      { english: { $regex: search, $options: 'i' } },
      { malayalam: { $regex: search, $options: 'i' } },
    ];

    const [quotes, total] = await Promise.all([
      FridayQuote.find(filter).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      FridayQuote.countDocuments(filter),
    ]);

    return res.status(200).json({
      friday_quotes: quotes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function createFridayQuote(req, res, next) {
  try {
    const { text, malayalam, english, urdu, reference } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const quote = await FridayQuote.create({ text, malayalam, english, urdu, reference });
    return res.status(201).json(quote);
  } catch (err) { next(err); }
}

async function updateFridayQuote(req, res, next) {
  try {
    const { id } = req.params;
    const fields = ['text', 'malayalam', 'english', 'urdu', 'reference'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const quote = await FridayQuote.findByIdAndUpdate(id, updates, { new: true });
    if (!quote) return res.status(404).json({ error: 'FridayQuote not found' });
    return res.status(200).json(quote);
  } catch (err) { next(err); }
}

async function deleteFridayQuote(req, res, next) {
  try {
    const { id } = req.params;
    const quote = await FridayQuote.findByIdAndDelete(id);
    if (!quote) return res.status(404).json({ error: 'FridayQuote not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: Hadees ───────────────────────────────────────────

async function getHadeesList(req, res, next) {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (category && search) {
      filter.$and = [
        { category },
        { $or: [{ arabic_text: { $regex: search, $options: 'i' } }, { english: { $regex: search, $options: 'i' } }, { reported_by: { $regex: search, $options: 'i' } }] },
      ];
    } else if (category) {
      filter.category = category;
    } else if (search) {
      filter.$or = [
        { arabic_text: { $regex: search, $options: 'i' } },
        { english: { $regex: search, $options: 'i' } },
        { reported_by: { $regex: search, $options: 'i' } },
      ];
    }

    const allHadees = await Hadees.find(filter).populate('category').sort({ created_at: -1 });
    const total = allHadees.length;
    const _hOrdered = allHadees.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _hUnordered = allHadees.filter(d => d.order == null);
    const hadees = [..._hOrdered, ..._hUnordered].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      hadees,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createHadees(req, res, next) {
  try {
    const { arabic_text, english, malayalam, urdu, category, reported_by, isQuranicFont, order } = req.body;
    if (!arabic_text || !category) {
      return res.status(400).json({ error: 'arabic_text and category are required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(Hadees, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another hadees` });
    }
    const created = await Hadees.create({ arabic_text, english, malayalam, urdu, category, reported_by, isQuranicFont: !!isQuranicFont, order: orderNum });
    const hadees = await Hadees.findById(created._id).populate('category');
    return res.status(201).json(hadees);
  } catch (err) { next(err); }
}

async function updateHadees(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['arabic_text', 'english', 'malayalam', 'urdu', 'category', 'reported_by', 'isQuranicFont', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(Hadees, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another hadees` });
    }
    const hadees = await Hadees.findByIdAndUpdate(id, updates, { new: true }).populate('category');
    if (!hadees) return res.status(404).json({ error: 'Hadees not found' });
    return res.status(200).json(hadees);
  } catch (err) { next(err); }
}

async function deleteHadees(req, res, next) {
  try {
    const { id } = req.params;
    const hadees = await Hadees.findByIdAndDelete(id);
    if (!hadees) return res.status(404).json({ error: 'Hadees not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: HadeesCategories ─────────────────────────────────

async function getHadeesCategories(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const allHadeesCats = await HadeesCategory.find().populate('parent').sort({ name: 1 });
    const total = allHadeesCats.length;
    const _hcOrd = allHadeesCats.filter(c => c.order != null).sort((a, b) => a.order - b.order);
    const _hcUn = allHadeesCats.filter(c => c.order == null);
    const categories = [..._hcOrd, ..._hcUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      hadees_categories: categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createHadeesCategory(req, res, next) {
  try {
    const { name, name_malayalam, name_urdu, description, parent, order } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(HadeesCategory, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another hadees category` });
    }
    const category = await HadeesCategory.create({ name, name_malayalam, name_urdu, description, parent: parent || null, order: orderNum });
    await category.populate('parent');
    return res.status(201).json(category);
  } catch (err) { next(err); }
}

async function updateHadeesCategory(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['name', 'name_malayalam', 'name_urdu', 'description', 'parent', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (req.body.parent === null || req.body.parent === '') updates.parent = null;
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(HadeesCategory, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another hadees category` });
    }
    const category = await HadeesCategory.findByIdAndUpdate(id, updates, { new: true }).populate('parent');
    if (!category) return res.status(404).json({ error: 'HadeesCategory not found' });
    return res.status(200).json(category);
  } catch (err) { next(err); }
}

async function deleteHadeesCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await HadeesCategory.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ error: 'HadeesCategory not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: Names of Allah ───────────────────────────────────

async function getNamesOfAllah(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { english_meaning: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const allNamesAdmin = await NameOfAllah.find(filter).sort({ created_at: -1 });
    const total = allNamesAdmin.length;
    const _noaOrd = allNamesAdmin.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _noaUn = allNamesAdmin.filter(d => d.order == null);
    const names = [..._noaOrd, ..._noaUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      names_of_allah: names,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { next(err); }
}

async function createNameOfAllah(req, res, next) {
  try {
    const { name, order, english_meaning, malayalam_meaning, urdu_meaning, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(NameOfAllah, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another name` });
    }
    const created = await NameOfAllah.create({ name, order: orderNum, english_meaning, malayalam_meaning, urdu_meaning, description });
    return res.status(201).json(created);
  } catch (err) { next(err); }
}

async function updateNameOfAllah(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['name', 'order', 'english_meaning', 'malayalam_meaning', 'urdu_meaning', 'description'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(NameOfAllah, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another name` });
    }
    const item = await NameOfAllah.findByIdAndUpdate(id, updates, { new: true });
    if (!item) return res.status(404).json({ error: 'Name of Allah not found' });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

async function deleteNameOfAllah(req, res, next) {
  try {
    const { id } = req.params;
    const item = await NameOfAllah.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ error: 'Name of Allah not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Content Management: Live Links ─────────────────────────────────────────

async function getLiveLinks(req, res, next) {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { link: { $regex: search, $options: 'i' } },
      ];
    }
    if (is_active !== undefined) filter.is_active = is_active === 'true';

    const allLinks = await LiveLink.find(filter).sort({ created_at: -1 });
    const total = allLinks.length;
    const _llOrdered = allLinks.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _llUnordered = allLinks.filter(d => d.order == null);
    const links = [..._llOrdered, ..._llUnordered].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      live_links: links,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function createLiveLink(req, res, next) {
  try {
    const { title, location, link, is_active, order } = req.body;
    if (!title || !link) {
      return res.status(400).json({ error: 'title and link are required' });
    }
    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await checkOrderUnique(LiveLink, orderNum);
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another live link` });
    }
    const created = await LiveLink.create({ title, location, link, is_active, order: orderNum });
    return res.status(201).json(created);
  } catch (err) { next(err); }
}

async function updateLiveLink(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['title', 'location', 'link', 'is_active', 'order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (updates.order !== undefined) updates.order = (updates.order !== null && updates.order !== '') ? parseInt(updates.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await checkOrderUnique(LiveLink, updates.order, id);
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another live link` });
    }
    const item = await LiveLink.findByIdAndUpdate(id, updates, { new: true });
    if (!item) return res.status(404).json({ error: 'LiveLink not found' });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

async function deleteLiveLink(req, res, next) {
  try {
    const { id } = req.params;
    const item = await LiveLink.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ error: 'LiveLink not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Admin Group Activities ──────────────────────────────────────────────────

async function getAdminGroupActivities(req, res, next) {
  try {
    const { page = 1, limit = 50, group_id, activity_type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    if (group_id) query.group_id = group_id;
    if (activity_type) query.activity_type = activity_type;

    const [activities, total] = await Promise.all([
      GroupActivity.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('group_id', 'name group_id'),
      GroupActivity.countDocuments(query),
    ]);

    return res.status(200).json({
      activities,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function deleteAdminGroupActivity(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await GroupActivity.findByIdAndDelete(id);
    if (!activity) return res.status(404).json({ error: 'GroupActivity not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Additional Tracking Records (read-only) ────────────────────────────────

async function getDhikrTrackingRecords(req, res, next) {
  try {
    const { user_id, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = user_id ? { user_id } : {};
    const [records, total] = await Promise.all([
      DhikrTracking.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit))
        .populate('user_id', 'name email'),
      DhikrTracking.countDocuments(query),
    ]);
    return res.status(200).json({ records, total, page: parseInt(page), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

async function getFastingRecords(req, res, next) {
  try {
    const { user_id, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = user_id ? { user_id } : {};
    const [records, total] = await Promise.all([
      FastingDay.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit))
        .populate('user_id', 'name email'),
      FastingDay.countDocuments(query),
    ]);
    return res.status(200).json({ records, total, page: parseInt(page), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

async function getDuaMemorizationRecords(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      DuaMemorization.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit))
        .populate('user_id', 'name email'),
      DuaMemorization.countDocuments(),
    ]);
    return res.status(200).json({ records, total, page: parseInt(page), total_pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
}

// ─── Admin: Transfer Group Admin ─────────────────────────────────────────────

async function transferGroupAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { new_admin_id } = req.body;

    if (!new_admin_id) return res.status(400).json({ error: 'new_admin_id is required' });

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = group.users.some((u) => u.toString() === new_admin_id);
    if (!isMember) return res.status(400).json({ error: 'Target user is not a member of this group' });

    const isAlreadyAdmin =
      group.admin_id.toString() === new_admin_id ||
      (group.co_admins || []).some((id) => id.toString() === new_admin_id);
    if (isAlreadyAdmin) {
      return res.status(400).json({ error: 'This user is already an admin' });
    }

    group.co_admins = group.co_admins || [];
    group.co_admins.push(new_admin_id);
    await group.save();

    const newAdmin = await User.findById(new_admin_id);
    return res.status(200).json({
      id: group._id,
      name: group.name,
      group_id: group.group_id,
      admin: newAdmin ? { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email } : null,
    });
  } catch (err) { next(err); }
}

// ─── Admin: Export Group Activities as Excel ─────────────────────────────────

async function exportAdminGroupActivities(req, res, next) {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const activities = await GroupActivity.find({ group_id: id }).sort({ date: -1 });
    const memberIds = [...new Set(activities.flatMap((a) => (a.user_status || []).map((s) => s.user?.toString()).filter(Boolean)))];
    const members = await User.find({ _id: { $in: memberIds } }).select('name email');
    const memberMap = {};
    members.forEach((m) => { memberMap[m._id.toString()] = m.name || m.email || 'Unknown'; });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Activity Stats');

    sheet.columns = [
      { header: 'Activity Name', key: 'activity_name', width: 25 },
      { header: 'Type', key: 'activity_type', width: 12 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Member Name', key: 'member_name', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Updated At', key: 'updated_at', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const activity of activities) {
      for (const us of (activity.user_status || [])) {
        sheet.addRow({
          activity_name: activity.activity_name,
          activity_type: activity.activity_type,
          date: activity.date ? new Date(activity.date).toLocaleDateString() : '',
          member_name: memberMap[us.user?.toString()] || 'Unknown',
          status: us.status || 'Not responded',
          updated_at: us.updatedAt ? new Date(us.updatedAt).toLocaleString() : '',
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${group.name}_activities.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

// ─── Content Management: Ramadan Duas ─────────────────────────────────────────

async function getRamadanDuas(req, res, next) {
  try {
    const { page = 1, limit = 100, day } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (day) filter.day_number = parseInt(day);

    const [ramadanDuas, total] = await Promise.all([
      RamadanDua.find(filter).sort({ day_number: 1, order: 1 }).skip(skip).limit(parseInt(limit)),
      RamadanDua.countDocuments(filter),
    ]);

    return res.status(200).json({
      ramadan_duas: ramadanDuas,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function createRamadanDua(req, res, next) {
  try {
    const { day_number, title, arabic_text, isQuranicFont, count, isCountless, malayalam, english, urdu, description } = req.body;
    const countless = !!isCountless;
    if (!day_number || !title || !arabic_text) {
      return res.status(400).json({ error: 'day_number, title, and arabic_text are required' });
    }
    if (day_number < 1 || day_number > 30) {
      return res.status(400).json({ error: 'day_number must be between 1 and 30' });
    }
    const created = await RamadanDua.create({
      day_number, title, arabic_text,
      isQuranicFont: !!isQuranicFont,
      count: countless ? null : count,
      isCountless: countless,
      malayalam, english, urdu, description,
    });
    return res.status(201).json(created);
  } catch (err) { next(err); }
}

async function updateRamadanDua(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['day_number', 'title', 'arabic_text', 'isQuranicFont', 'count', 'isCountless', 'malayalam', 'english', 'urdu', 'description'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (updates.isCountless) updates.count = null;
    if (updates.day_number && (updates.day_number < 1 || updates.day_number > 30)) {
      return res.status(400).json({ error: 'day_number must be between 1 and 30' });
    }
    const dua = await RamadanDua.findByIdAndUpdate(id, updates, { new: true });
    if (!dua) return res.status(404).json({ error: 'Ramadan dua not found' });
    return res.status(200).json(dua);
  } catch (err) { next(err); }
}

async function deleteRamadanDua(req, res, next) {
  try {
    const { id } = req.params;
    const dua = await RamadanDua.findByIdAndDelete(id);
    if (!dua) return res.status(404).json({ error: 'Ramadan dua not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

async function upsertRamadanDuasForDay(req, res, next) {
  try {
    const dayNumber = parseInt(req.params.dayNumber);
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
      return res.status(400).json({ error: 'dayNumber must be between 1 and 30' });
    }
    const { duas } = req.body;
    if (!Array.isArray(duas)) {
      return res.status(400).json({ error: 'duas must be an array' });
    }
    for (let i = 0; i < duas.length; i++) {
      const d = duas[i];
      if (!d.title || !d.arabic_text) {
        return res.status(400).json({ error: `Entry ${i + 1}: title and arabic_text are required` });
      }
    }
    await RamadanDua.deleteMany({ day_number: dayNumber });
    if (duas.length === 0) {
      return res.status(200).json({ ramadan_duas: [] });
    }
    const toInsert = duas.map((d, idx) => {
      const countless = !!d.isCountless;
      return {
        day_number: dayNumber,
        order: idx,
        title: d.title,
        arabic_text: d.arabic_text,
        isQuranicFont: !!d.isQuranicFont,
        count: countless ? null : (d.count != null && d.count !== '' ? Number(d.count) : null),
        isCountless: countless,
        malayalam: d.malayalam || null,
        english: d.english || null,
        urdu: d.urdu || null,
        description: d.description || {},
      };
    });
    const created = await RamadanDua.insertMany(toInsert);
    return res.status(200).json({ ramadan_duas: created });
  } catch (err) { next(err); }
}

// ── Banners ────────────────────────────────────────────────────────────────────

async function getBanners(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [banners, total] = await Promise.all([
      Banner.find().sort({ from_date: -1 }).skip(skip).limit(parseInt(limit)),
      Banner.countDocuments(),
    ]);
    return res.status(200).json({
      banners,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function createBanner(req, res, next) {
  try {
    const { type, link_url, from_date, to_date, is_active } = req.body;
    if (!type || !from_date || !to_date) {
      return res.status(400).json({ error: 'type, from_date and to_date are required' });
    }
    if (!['image', 'slider', 'video'].includes(type)) {
      return res.status(400).json({ error: 'type must be image, slider or video' });
    }

    const imageFilenames = (req.files?.images || []).map(f => f.filename);
    const videoFilename = req.files?.video?.[0]?.filename || null;

    const banner = await Banner.create({
      type,
      images: imageFilenames,
      video: videoFilename,
      link_url: link_url?.trim() || null,
      from_date,
      to_date,
      is_active: is_active !== 'false' && is_active !== false,
    });
    return res.status(201).json(banner);
  } catch (err) { next(err); }
}

async function updateBanner(req, res, next) {
  try {
    const { id } = req.params;
    const { type, link_url, from_date, to_date, is_active } = req.body;
    const update = {};
    if (type !== undefined) {
      if (!['image', 'slider', 'video'].includes(type)) {
        return res.status(400).json({ error: 'type must be image, slider or video' });
      }
      update.type = type;
    }
    if (req.files?.images?.length) update.images = req.files.images.map(f => f.filename);
    if (req.files?.video?.length)  update.video = req.files.video[0].filename;
    if (link_url !== undefined) update.link_url = link_url?.trim() || null;
    if (from_date !== undefined) update.from_date = from_date;
    if (to_date !== undefined)   update.to_date = to_date;
    if (is_active !== undefined) update.is_active = is_active !== 'false' && is_active !== false;
    const banner = await Banner.findByIdAndUpdate(id, update, { new: true });
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    return res.status(200).json(banner);
  } catch (err) { next(err); }
}

async function deleteBanner(req, res, next) {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

module.exports = {
  adminLogin,
  getStats,
  getUsers,
  getUserDetail,
  deleteUser,
  getGroups,
  getGroupDetail,
  deleteGroup,
  getActivityLogs,
  // Group Activities (admin)
  getAdminGroupActivities,
  deleteAdminGroupActivity,
  transferGroupAdmin,
  exportAdminGroupActivities,
  // Content management
  getDuas, createDua, updateDua, deleteDua,
  getDuaCategories, createDuaCategory, updateDuaCategory, deleteDuaCategory,
  getDhikrCategories, createDhikrCategory, updateDhikrCategory, deleteDhikrCategory,
  getDhikrTypes, createDhikrType, updateDhikrType, deleteDhikrType,
  getThasbeehs, createTasbeeh, updateTasbeeh, deleteTasbeeh,
  getFastingTypes, createFastingType, updateFastingType, deleteFastingType,
  getQuranReadingContents, createQuranReadingContent, updateQuranReadingContent, deleteQuranReadingContent,
  getQuranMemorizationContents, createQuranMemorizationContent, updateQuranMemorizationContent, deleteQuranMemorizationContent,
  getVerseImportances, createVerseImportance, updateVerseImportance, deleteVerseImportance,
  getDhikrImportances, createDhikrImportance, updateDhikrImportance, deleteDhikrImportance,
  getDuaImportances, createDuaImportance, updateDuaImportance, deleteDuaImportance,
  getDailyQuotes, createDailyQuote, updateDailyQuote, deleteDailyQuote,
  getFridayQuotes, createFridayQuote, updateFridayQuote, deleteFridayQuote,
  getHadeesList, createHadees, updateHadees, deleteHadees,
  getHadeesCategories, createHadeesCategory, updateHadeesCategory, deleteHadeesCategory,
  getNamesOfAllah, createNameOfAllah, updateNameOfAllah, deleteNameOfAllah,
  getLiveLinks, createLiveLink, updateLiveLink, deleteLiveLink,
  // Ramadan Duas
  getRamadanDuas, createRamadanDua, updateRamadanDua, deleteRamadanDua, upsertRamadanDuasForDay,
  // Banners
  getBanners, createBanner, updateBanner, deleteBanner,
  // Leaderboards / tracking stats
  getDhikrTrackingStats,
  getDuaMemorizationStats,
  getFastingStats,
  getPrayerTrackingStats,
  getQuranReadingStats,
  getQuranMemorizationStats,
  getQuranProgressStats,
  getStreakStats,
  // Tracking records (read-only)
  getPrayerTrackingRecords,
  getQuranReadingRecords,
  getQuranMemorizationRecords,
  getDhikrTrackingRecords,
  getFastingRecords,
  getDuaMemorizationRecords,
};
