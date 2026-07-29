const SpecialCategory = require('../models/SpecialCategory');
const SpecialEntry    = require('../models/SpecialEntry');
const { VALID_FIELD_KEYS } = require('../models/SpecialCategory');

// ─── Admin: Special Categories ───────────────────────────────────────────────

async function getSpecialCategories(req, res, next) {
  try {
    const categories = await SpecialCategory.find()
      .populate('parentId', 'name slug')
      .sort({ order: 1, created_at: 1 });
    return res.status(200).json({ categories });
  } catch (err) { next(err); }
}

async function createSpecialCategory(req, res, next) {
  try {
    const { name, name_malayalam = null, name_urdu = null, description = null, icon = null, order, fields = [], parentId = null } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    // Validate field keys
    const invalidFields = fields.filter((f) => !VALID_FIELD_KEYS.includes(f));
    if (invalidFields.length) {
      return res.status(400).json({ error: `Invalid field keys: ${invalidFields.join(', ')}` });
    }

    // Validate parentId — only one level of nesting allowed
    let resolvedParentId = null;
    if (parentId) {
      const parent = await SpecialCategory.findById(parentId);
      if (!parent) return res.status(400).json({ error: 'Parent category not found' });
      if (parent.parentId) return res.status(400).json({ error: 'Cannot create a sub-category of a sub-category' });
      resolvedParentId = parent._id;
    }

    const category = await SpecialCategory.create({
      name: name.trim(),
      name_malayalam,
      name_urdu,
      description,
      icon,
      order: order != null ? parseInt(order) : null,
      fields,
      parentId: resolvedParentId,
    });
    return res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A category with that name already exists' });
    next(err);
  }
}

async function updateSpecialCategory(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await SpecialCategory.findById(id);
    if (!existing) return res.status(404).json({ error: 'Special category not found' });

    const updates = {};
    if (req.body.name        !== undefined) updates.name        = req.body.name.trim();
    if (req.body.name_malayalam !== undefined) updates.name_malayalam = req.body.name_malayalam;
    if (req.body.name_urdu      !== undefined) updates.name_urdu      = req.body.name_urdu;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.icon        !== undefined) updates.icon        = req.body.icon;
    if (req.body.order       !== undefined) updates.order       = req.body.order != null ? parseInt(req.body.order) : null;

    if (req.body.parentId !== undefined) {
      if (req.body.parentId) {
        const parent = await SpecialCategory.findById(req.body.parentId);
        if (!parent) return res.status(400).json({ error: 'Parent category not found' });
        if (parent.parentId) return res.status(400).json({ error: 'Cannot nest a sub-category under another sub-category' });
        // Prevent making a category its own parent
        if (parent._id.toString() === id) return res.status(400).json({ error: 'A category cannot be its own parent' });
        updates.parentId = parent._id;
      } else {
        updates.parentId = null;
      }
    }

    if (req.body.fields !== undefined) {
      const fields = req.body.fields;
      const invalidFields = fields.filter((f) => !VALID_FIELD_KEYS.includes(f));
      if (invalidFields.length) {
        return res.status(400).json({ error: `Invalid field keys: ${invalidFields.join(', ')}` });
      }
      updates.fields = fields;
    }

    // Re-generate slug if name changed
    if (updates.name) {
      updates.slug = updates.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    const category = await SpecialCategory.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A category with that name already exists' });
    next(err);
  }
}

async function deleteSpecialCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await SpecialCategory.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ error: 'Special category not found' });
    // Cascade delete all entries in this category
    await SpecialEntry.deleteMany({ categoryId: id });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Admin: Special Entries ──────────────────────────────────────────────────

async function getSpecialEntries(req, res, next) {
  try {
    const { categoryId } = req.params;
    const category = await SpecialCategory.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Special category not found' });

    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = { categoryId };
    if (search) {
      // Search across text fields in data
      const textFields = ['title_malayalam', 'title_english', 'title_urdu', 'description_malayalam', 'description_english', 'description_urdu'];
      const searchFilter = textFields
        .filter((f) => category.fields.includes(f))
        .map((f) => ({ [`data.${f}`]: { $regex: search, $options: 'i' } }));
      if (searchFilter.length) filter = { categoryId, $or: searchFilter };
    }

    const [entries, total] = await Promise.all([
      SpecialEntry.find(filter).sort({ order: 1, created_at: -1 }).skip(skip).limit(parseInt(limit)),
      SpecialEntry.countDocuments(filter),
    ]);
    return res.status(200).json({
      entries,
      category,
      total,
      page:        parseInt(page),
      limit:       parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function createSpecialEntry(req, res, next) {
  try {
    const { categoryId } = req.params;
    const category = await SpecialCategory.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Special category not found' });

    const { data = {}, order } = req.body;

    // Only keep data keys that are in the category's configured fields
    const filteredData = {};
    for (const key of category.fields) {
      if (data[key] !== undefined) filteredData[key] = data[key];
    }

    const entry = await SpecialEntry.create({
      categoryId,
      order: order != null ? parseInt(order) : null,
      data: filteredData,
    });
    return res.status(201).json(entry);
  } catch (err) { next(err); }
}

async function updateSpecialEntry(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await SpecialEntry.findById(id);
    if (!existing) return res.status(404).json({ error: 'Special entry not found' });

    const category = await SpecialCategory.findById(existing.categoryId);
    if (!category) return res.status(404).json({ error: 'Special category not found' });

    const updates = {};
    if (req.body.order !== undefined) {
      updates.order = req.body.order != null ? parseInt(req.body.order) : null;
    }
    if (req.body.data !== undefined) {
      // Merge with existing data, only allow keys in category's fields
      const merged = { ...(existing.data || {}) };
      for (const key of category.fields) {
        if (req.body.data[key] !== undefined) merged[key] = req.body.data[key];
      }
      updates.data = merged;
    }

    const entry = await SpecialEntry.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(entry);
  } catch (err) { next(err); }
}

async function deleteSpecialEntry(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await SpecialEntry.findByIdAndDelete(id);
    if (!entry) return res.status(404).json({ error: 'Special entry not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Public Content: Special Models ─────────────────────────────────────────

async function publicGetSpecialCategories(req, res, next) {
  try {
    const { type } = req.query;
    const filter = {};
    if (type === 'main') filter.parentId = null;
    else if (type === 'sub') filter.parentId = { $ne: null };

    const categories = await SpecialCategory.find(filter)
      .populate('parentId', 'name slug')
      .sort({ order: 1, created_at: 1 });
    return res.status(200).json({ categories });
  } catch (err) { next(err); }
}

async function publicGetSpecialEntries(req, res, next) {
  try {
    const { categoryId } = req.params;
    const category = await SpecialCategory.findById(categoryId)
      .populate('parentId', 'name slug');
    if (!category) return res.status(404).json({ error: 'Special category not found' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [entries, total] = await Promise.all([
      SpecialEntry.find({ categoryId }).sort({ order: 1, created_at: -1 }).skip(skip).limit(parseInt(limit)),
      SpecialEntry.countDocuments({ categoryId }),
    ]);
    return res.status(200).json({
      entries,
      category,
      total,
      page:        parseInt(page),
      limit:       parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function publicGetSpecialEntryById(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await SpecialEntry.findById(id).populate({
      path: 'categoryId',
      populate: { path: 'parentId', select: 'name slug' },
    });
    if (!entry) return res.status(404).json({ error: 'Special entry not found' });
    return res.status(200).json(entry);
  } catch (err) { next(err); }
}

module.exports = {
  getSpecialCategories,
  createSpecialCategory,
  updateSpecialCategory,
  deleteSpecialCategory,
  getSpecialEntries,
  createSpecialEntry,
  updateSpecialEntry,
  deleteSpecialEntry,
  publicGetSpecialCategories,
  publicGetSpecialEntries,
  publicGetSpecialEntryById,
};
