const sanitizeHtml     = require('sanitize-html');
const LibraryCategory  = require('../models/LibraryCategory');
const LibraryEntry     = require('../models/LibraryEntry');

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeTrilingualTitle(raw) {
  if (!raw || typeof raw !== 'object') {
    const fallback = typeof raw === 'string' ? raw.trim() : '';
    return { malayalam: fallback, english: null, urdu: null };
  }
  const malayalam  = String(raw.malayalam ?? '').trim();
  const englishRaw = String(raw.english   ?? '').trim();
  const urduRaw    = String(raw.urdu      ?? '').trim();
  return {
    malayalam,
    english: englishRaw.length ? englishRaw : null,
    urdu:    urduRaw.length    ? urduRaw    : null,
  };
}

// Description is authored as HTML via the admin rich-text editor (bold/italic/
// underline/strike, lists, headings, font size, and alignment). Only that formatting
// markup is allowed through — anything else (scripts, arbitrary tags/attributes) is
// stripped since this content is served to the public app.
const RICH_TEXT_SANITIZE_OPTIONS = {
  allowedTags: ['p', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'br', 'span', 'h1', 'h2', 'h3', 'h4'],
  allowedAttributes: { p: ['style'], li: ['style'], h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], span: ['style'] },
  allowedStyles: {
    '*': {
      'text-align': [/^left$|^right$|^center$|^justify$/],
      'font-size':  [/^\d+(\.\d+)?(px|pt|em|rem)$/],
    },
  },
};

function sanitizeRichText(html) {
  return sanitizeHtml(String(html ?? ''), RICH_TEXT_SANITIZE_OPTIONS).trim();
}

// Plain-text length of a rich-text HTML value, used to tell real content apart
// from an "empty" editor state like "<p></p>".
function richTextIsBlank(html) {
  return sanitizeHtml(String(html ?? ''), { allowedTags: [], allowedAttributes: {} }).trim().length === 0;
}

function normalizeTrilingualDescription(raw) {
  if (!raw || typeof raw !== 'object') {
    const fallback = typeof raw === 'string' ? sanitizeRichText(raw) : '';
    return { malayalam: richTextIsBlank(fallback) ? null : fallback, english: null, urdu: null };
  }
  const malayalamRaw = sanitizeRichText(raw.malayalam ?? '');
  const englishRaw   = sanitizeRichText(raw.english   ?? '');
  const urduRaw      = sanitizeRichText(raw.urdu      ?? '');
  return {
    malayalam: richTextIsBlank(malayalamRaw) ? null : malayalamRaw,
    english:   richTextIsBlank(englishRaw)   ? null : englishRaw,
    urdu:      richTextIsBlank(urduRaw)      ? null : urduRaw,
  };
}

// ─── Admin: Library Categories ───────────────────────────────────────────────

async function getLibraryCategories(req, res, next) {
  try {
    const categories = await LibraryCategory.find().sort({ order: 1, created_at: 1 });
    return res.status(200).json({ categories });
  } catch (err) { next(err); }
}

async function createLibraryCategory(req, res, next) {
  try {
    const { name, name_malayalam = null, name_urdu = null, description = null, icon = null, order = 0 } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const category = await LibraryCategory.create({ name: name.trim(), name_malayalam, name_urdu, description, icon, order });
    return res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A category with that name already exists' });
    next(err);
  }
}

async function updateLibraryCategory(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await LibraryCategory.findById(id);
    if (!existing) return res.status(404).json({ error: 'Library category not found' });

    const updates = {};
    if (req.body.name      !== undefined) updates.name      = req.body.name.trim();
    if (req.body.name_malayalam !== undefined) updates.name_malayalam = req.body.name_malayalam;
    if (req.body.name_urdu      !== undefined) updates.name_urdu      = req.body.name_urdu;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.icon      !== undefined) updates.icon      = req.body.icon;
    if (req.body.order     !== undefined) updates.order     = req.body.order;

    // Re-generate slug if name changed
    if (updates.name) {
      updates.slug = updates.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    const category = await LibraryCategory.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A category with that name already exists' });
    next(err);
  }
}

async function deleteLibraryCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await LibraryCategory.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ error: 'Library category not found' });
    // Cascade delete entries belonging to this category
    await LibraryEntry.deleteMany({ categoryId: id });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

// ─── Admin: Library Entries ──────────────────────────────────────────────────

async function getLibraryEntries(req, res, next) {
  try {
    const { categoryId } = req.params;
    const category = await LibraryCategory.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Library category not found' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const allEntries = await LibraryEntry.find({ categoryId }).sort({ created_at: -1 });
    const total = allEntries.length;
    const _leOrd = allEntries.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _leUn = allEntries.filter(d => d.order == null);
    const items = [..._leOrd, ..._leUn].slice(skip, skip + parseInt(limit));
    return res.status(200).json({
      entries: items,
      category,
      total,
      page:        parseInt(page),
      limit:       parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function createLibraryEntry(req, res, next) {
  try {
    const { categoryId } = req.params;
    const category = await LibraryCategory.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Library category not found' });

    const { content = '', source = '', title: rawTitle, description: rawDesc, order } = req.body;
    const title       = normalizeTrilingualTitle(rawTitle);
    const description = normalizeTrilingualDescription(rawDesc);
    if (!description.malayalam) return res.status(400).json({ error: 'description.malayalam is required' });

    const orderNum = (order != null && order !== '') ? parseInt(order) : null;
    if (orderNum !== null) {
      const dup = await LibraryEntry.findOne({ categoryId, order: orderNum });
      if (dup) return res.status(409).json({ error: `Order ${orderNum} is already in use by another entry in this category` });
    }
    const entry = await LibraryEntry.create({ categoryId, content, source, order: orderNum, title, description });
    return res.status(201).json(entry);
  } catch (err) { next(err); }
}

async function updateLibraryEntry(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await LibraryEntry.findById(id);
    if (!existing) return res.status(404).json({ error: 'Library entry not found' });

    const updates = {};
    if (req.body.content !== undefined) updates.content = req.body.content;
    if (req.body.source  !== undefined) updates.source  = req.body.source;
    if (req.body.order   !== undefined) updates.order   = (req.body.order != null && req.body.order !== '') ? parseInt(req.body.order) : null;
    if (updates.order !== null && updates.order !== undefined) {
      const dup = await LibraryEntry.findOne({ categoryId: existing.categoryId, order: updates.order, _id: { $ne: id } });
      if (dup) return res.status(409).json({ error: `Order ${updates.order} is already in use by another entry in this category` });
    }

    if (req.body.title !== undefined) {
      const prev = existing.title && typeof existing.title === 'object'
        ? { malayalam: existing.title.malayalam, english: existing.title.english, urdu: existing.title.urdu }
        : {};
      updates.title = normalizeTrilingualTitle({ ...prev, ...req.body.title });
    }

    if (req.body.description !== undefined) {
      const raw  = existing.description;
      const prev = raw && typeof raw === 'object'
        ? { malayalam: raw.malayalam, english: raw.english, urdu: raw.urdu }
        : {};
      const description = normalizeTrilingualDescription({ ...prev, ...req.body.description });
      if (!description.malayalam) return res.status(400).json({ error: 'description.malayalam is required' });
      updates.description = description;
    }

    const entry = await LibraryEntry.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(entry);
  } catch (err) { next(err); }
}

async function deleteLibraryEntry(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await LibraryEntry.findByIdAndDelete(id);
    if (!entry) return res.status(404).json({ error: 'Library entry not found' });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

async function getLibraryEntryById(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await LibraryEntry.findById(id).populate('categoryId');
    if (!entry) return res.status(404).json({ error: 'Library entry not found' });
    return res.status(200).json(entry);
  } catch (err) { next(err); }
}

// ─── Public Content: Library ─────────────────────────────────────────────────

async function publicGetLibraryCategories(req, res, next) {
  try {
    const categories = await LibraryCategory.find().sort({ order: 1, created_at: 1 });
    return res.status(200).json({ categories });
  } catch (err) { next(err); }
}

async function publicGetLibraryEntries(req, res, next) {
  try {
    const { categoryId } = req.params;
    const category = await LibraryCategory.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Library category not found' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const allPubEntries = await LibraryEntry.find({ categoryId }).sort({ created_at: -1 });
    const total = allPubEntries.length;
    const _pubOrd = allPubEntries.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _pubUn = allPubEntries.filter(d => d.order == null);
    const items = [..._pubOrd, ..._pubUn].slice(skip, skip + parseInt(limit));
    return res.status(200).json({
      entries: items,
      category,
      total,
      page:        parseInt(page),
      limit:       parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function publicGetLibraryEntryById(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await LibraryEntry.findById(id).populate('categoryId');
    if (!entry) return res.status(404).json({ error: 'Library entry not found' });
    return res.status(200).json(entry);
  } catch (err) { next(err); }
}

module.exports = {
  // Admin — categories
  getLibraryCategories,
  createLibraryCategory,
  updateLibraryCategory,
  deleteLibraryCategory,
  // Admin — entries
  getLibraryEntries,
  createLibraryEntry,
  updateLibraryEntry,
  deleteLibraryEntry,
  getLibraryEntryById,
  // Public content
  publicGetLibraryCategories,
  publicGetLibraryEntries,
  publicGetLibraryEntryById,
};
