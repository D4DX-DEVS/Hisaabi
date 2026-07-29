const {
  Dua, DuaCategory, DhikrCategory, DhikrType, Tasbeeh, FastingType,
  QuranReadingContent, QuranMemorizationContent,
  VerseImportance, DhikrImportance, DuaImportance,
  DailyQuote, FridayQuote, Hadees, HadeesCategory, NameOfAllah,
  LiveLink, RamadanDua, Banner,
} = require('../models');

// ─── Duas ────────────────────────────────────────────────────────────────────

async function getDuas(req, res, next) {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (category && search) {
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

    const allDuasPub = await Dua.find(filter).populate('category').populate('additional_categories').sort({ created_at: -1 });
    const total = allDuasPub.length;
    const _pdOrd = allDuasPub.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _pdUn = allDuasPub.filter(d => d.order == null);
    const duas = [..._pdOrd, ..._pdUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      duas,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getDuaById(req, res, next) {
  try {
    const dua = await Dua.findById(req.params.id).populate('category').populate('additional_categories');
    if (!dua) return res.status(404).json({ error: 'Dua not found' });
    return res.status(200).json(dua);
  } catch (err) { next(err); }
}

// ─── Dua Categories ───────────────────────────────────────────────────────────

async function getDuaCategories(req, res, next) {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

    const allDuaCatsPub = await DuaCategory.find(filter).populate('parent').sort({ name: 1 });
    const total = allDuaCatsPub.length;
    const _pdcOrd = allDuaCatsPub.filter(c => c.order != null).sort((a, b) => a.order - b.order);
    const _pdcUn = allDuaCatsPub.filter(c => c.order == null);
    const categories = [..._pdcOrd, ..._pdcUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      dua_categories: categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getDuaCategoryById(req, res, next) {
  try {
    const category = await DuaCategory.findById(req.params.id).populate('parent');
    if (!category) return res.status(404).json({ error: 'Dua category not found' });
    return res.status(200).json(category);
  } catch (err) { next(err); }
}

// ─── Dhikr Categories ─────────────────────────────────────────────────────────

async function getDhikrCategories(req, res, next) {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } },
      ],
    } : {};

    const allDhikrCatsPub = await DhikrCategory.find(filter).populate('parent').sort({ display_name: 1 });
    const total = allDhikrCatsPub.length;
    const _pDkcOrd = allDhikrCatsPub.filter(c => c.order != null).sort((a, b) => a.order - b.order);
    const _pDkcUn = allDhikrCatsPub.filter(c => c.order == null);
    const categories = [..._pDkcOrd, ..._pDkcUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      dhikr_categories: categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getDhikrCategoryById(req, res, next) {
  try {
    const category = await DhikrCategory.findById(req.params.id).populate('parent');
    if (!category) return res.status(404).json({ error: 'Dhikr category not found' });
    return res.status(200).json(category);
  } catch (err) { next(err); }
}

// ─── Dhikr Types ──────────────────────────────────────────────────────────────

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

    const allDhikrTypesPub = await DhikrType.find(filter).populate('category').sort({ created_at: -1 });
    const total = allDhikrTypesPub.length;
    const _pDtOrd = allDhikrTypesPub.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _pDtUn = allDhikrTypesPub.filter(d => d.order == null);
    const types = [..._pDtOrd, ..._pDtUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      dhikr_types: types,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getDhikrTypeById(req, res, next) {
  try {
    const type = await DhikrType.findById(req.params.id).populate('category');
    if (!type) return res.status(404).json({ error: 'Dhikr type not found' });
    return res.status(200).json(type);
  } catch (err) { next(err); }
}

// ─── Thasbeehs ────────────────────────────────────────────────────────────────

async function getThasbeehs(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { arabic_text: { $regex: search, $options: 'i' } },
    ];

    const allThasbeehsPub = await Tasbeeh.find(filter).sort({ created_at: -1 });
    const total = allThasbeehsPub.length;
    const _pTbOrd = allThasbeehsPub.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _pTbUn = allThasbeehsPub.filter(d => d.order == null);
    const thasbeehs = [..._pTbOrd, ..._pTbUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      thasbeehs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getTasbeehById(req, res, next) {
  try {
    const tasbeeh = await Tasbeeh.findById(req.params.id);
    if (!tasbeeh) return res.status(404).json({ error: 'Tasbeeh not found' });
    return res.status(200).json(tasbeeh);
  } catch (err) { next(err); }
}

// ─── Fasting Types ────────────────────────────────────────────────────────────

async function getFastingTypes(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } },
      ],
    } : {};

    const allFastingTypesPub = await FastingType.find(filter).populate('parent').sort({ display_name: 1 });
    const total = allFastingTypesPub.length;
    const _pFtOrd = allFastingTypesPub.filter(t => t.order != null).sort((a, b) => a.order - b.order);
    const _pFtUn = allFastingTypesPub.filter(t => t.order == null);
    const types = [..._pFtOrd, ..._pFtUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      fasting_types: types,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getFastingTypeById(req, res, next) {
  try {
    const type = await FastingType.findById(req.params.id).populate('parent');
    if (!type) return res.status(404).json({ error: 'Fasting type not found' });
    return res.status(200).json(type);
  } catch (err) { next(err); }
}

// ─── Quran Reading Content ────────────────────────────────────────────────────

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
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getQuranReadingContentById(req, res, next) {
  try {
    const content = await QuranReadingContent.findById(req.params.id);
    if (!content) return res.status(404).json({ error: 'Quran reading content not found' });
    return res.status(200).json(content);
  } catch (err) { next(err); }
}

// ─── Quran Memorization Content ───────────────────────────────────────────────

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
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getQuranMemorizationContentById(req, res, next) {
  try {
    const content = await QuranMemorizationContent.findById(req.params.id);
    if (!content) return res.status(404).json({ error: 'Quran memorization content not found' });
    return res.status(200).json(content);
  } catch (err) { next(err); }
}

// ─── Verse Importance ─────────────────────────────────────────────────────────

async function getVerseImportances(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      VerseImportance.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      VerseImportance.countDocuments(),
    ]);

    return res.status(200).json({
      verse_importances: items,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getVerseImportanceById(req, res, next) {
  try {
    const item = await VerseImportance.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Verse importance not found' });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

// ─── Dhikr Importance ─────────────────────────────────────────────────────────

async function getDhikrImportances(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      DhikrImportance.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      DhikrImportance.countDocuments(),
    ]);

    return res.status(200).json({
      dhikr_importances: items,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getDhikrImportanceById(req, res, next) {
  try {
    const item = await DhikrImportance.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Dhikr importance not found' });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

// ─── Dua Importance ───────────────────────────────────────────────────────────

async function getDuaImportances(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      DuaImportance.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      DuaImportance.countDocuments(),
    ]);

    return res.status(200).json({
      dua_importances: items,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getDuaImportanceById(req, res, next) {
  try {
    const item = await DuaImportance.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Dua importance not found' });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

// ─── Daily Quotes ─────────────────────────────────────────────────────────────

async function getDailyQuotes(req, res, next) {
  try {
    const { page = 1, limit = 20, search, date } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (date) {
      filter.display_date = date;
    } else if (search) {
      filter.$or = [
        { text: { $regex: search, $options: 'i' } },
        { english: { $regex: search, $options: 'i' } },
        { malayalam: { $regex: search, $options: 'i' } },
      ];
    }

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

async function getDailyQuoteById(req, res, next) {
  try {
    const quote = await DailyQuote.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Daily quote not found' });
    return res.status(200).json(quote);
  } catch (err) { next(err); }
}

// ─── Friday Quotes ────────────────────────────────────────────────────────────

// Returns a random Friday quote, but only when it is Friday for the user.
// A fresh random quote is selected on every request (changes on each refresh).
//
// The weekday is determined from the user's own timezone. The mobile app should
// send the user's local calendar date as `?date=YYYY-MM-DD`. As a fallback, the
// app may send `?tz_offset=<minutes>` (minutes ahead of UTC, e.g. 330 for IST).
// If neither is provided, the server falls back to IST (UTC+05:30).
async function getFridayQuoteToday(req, res, next) {
  try {
    const { date, tz_offset } = req.query;

    let weekday; // 0=Sunday ... 5=Friday ... 6=Saturday
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Treat the user's local date as a fixed calendar day (UTC midnight).
      weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    } else {
      // Offset (in minutes) from UTC for the user's timezone; default to IST.
      const offsetMin = tz_offset !== undefined && !Number.isNaN(parseInt(tz_offset))
        ? parseInt(tz_offset)
        : 330; // IST = UTC+05:30
      const localNow = new Date(Date.now() + offsetMin * 60 * 1000);
      weekday = localNow.getUTCDay();
    }

    if (weekday !== 5) return res.status(200).json({ friday_quote: null });

    const [quote] = await FridayQuote.aggregate([{ $sample: { size: 1 } }]);
    return res.status(200).json({ friday_quote: quote || null });
  } catch (err) { next(err); }
}

async function getFridayQuotes(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (search) {
      filter.$or = [
        { text: { $regex: search, $options: 'i' } },
        { english: { $regex: search, $options: 'i' } },
        { malayalam: { $regex: search, $options: 'i' } },
      ];
    }

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

async function getFridayQuoteById(req, res, next) {
  try {
    const quote = await FridayQuote.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Friday quote not found' });
    return res.status(200).json(quote);
  } catch (err) { next(err); }
}

// ─── Hadees ───────────────────────────────────────────────────────────────────

async function getHadeesList(req, res, next) {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (category && search) {
      filter.$and = [
        { category },
        {
          $or: [
            { arabic_text: { $regex: search, $options: 'i' } },
            { english: { $regex: search, $options: 'i' } },
            { reported_by: { $regex: search, $options: 'i' } },
          ],
        },
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

    const allHadeesPub = await Hadees.find(filter).populate('category').sort({ created_at: -1 });
    const total = allHadeesPub.length;
    const _phOrd = allHadeesPub.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _phUn = allHadeesPub.filter(d => d.order == null);
    const hadees = [..._phOrd, ..._phUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      hadees,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getHadeesById(req, res, next) {
  try {
    const hadees = await Hadees.findById(req.params.id).populate('category');
    if (!hadees) return res.status(404).json({ error: 'Hadees not found' });
    return res.status(200).json(hadees);
  } catch (err) { next(err); }
}

// ─── Hadees Categories ────────────────────────────────────────────────────────

async function getHadeesCategories(req, res, next) {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

    const allHadeesCatsPub = await HadeesCategory.find(filter).populate('parent').sort({ name: 1 });
    const total = allHadeesCatsPub.length;
    const _phcOrd = allHadeesCatsPub.filter(c => c.order != null).sort((a, b) => a.order - b.order);
    const _phcUn = allHadeesCatsPub.filter(c => c.order == null);
    const categories = [..._phcOrd, ..._phcUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      hadees_categories: categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getHadeesCategoryById(req, res, next) {
  try {
    const category = await HadeesCategory.findById(req.params.id).populate('parent');
    if (!category) return res.status(404).json({ error: 'Hadees category not found' });
    return res.status(200).json(category);
  } catch (err) { next(err); }
}

// ─── Names of Allah ───────────────────────────────────────────────────────────

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

    const allNamesOfAllah = await NameOfAllah.find(filter).sort({ created_at: -1 });
    const total = allNamesOfAllah.length;
    const _pNoaOrd = allNamesOfAllah.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _pNoaUn = allNamesOfAllah.filter(d => d.order == null);
    const names = [..._pNoaOrd, ..._pNoaUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      names_of_allah: names,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getNameOfAllahById(req, res, next) {
  try {
    const item = await NameOfAllah.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Name of Allah not found' });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

// ─── Live Links (public) ─────────────────────────────────────────────────────

async function getLiveLinks(req, res, next) {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { is_active: true };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const allLinksPub = await LiveLink.find(filter).sort({ created_at: -1 });
    const total = allLinksPub.length;
    const _pllOrd = allLinksPub.filter(d => d.order != null).sort((a, b) => a.order - b.order);
    const _pllUn = allLinksPub.filter(d => d.order == null);
    const links = [..._pllOrd, ..._pllUn].slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      live_links: links,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

async function getLiveLinkById(req, res, next) {
  try {
    const item = await LiveLink.findOne({ _id: req.params.id, is_active: true });
    if (!item) return res.status(404).json({ error: 'LiveLink not found' });
    return res.status(200).json(item);
  } catch (err) { next(err); }
}

// ─── Ramadan Duas ─────────────────────────────────────────────────────────────

async function getRamadanDuas(req, res, next) {
  try {
    const { day, page = 1, limit = 50 } = req.query;
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

// ─── Banners ──────────────────────────────────────────────────────────────────

async function getTodayBanner(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const banner = await Banner.findOne({
      from_date: { $lte: today },
      to_date:   { $gte: today },
      is_active: true,
    });
    if (!banner) return res.status(200).json({ banner: null });
    return res.status(200).json({ banner });
  } catch (err) { next(err); }
}

module.exports = {
  // Duas
  getDuas,
  getDuaById,
  // Dua Categories
  getDuaCategories,
  getDuaCategoryById,
  // Dhikr Categories
  getDhikrCategories,
  getDhikrCategoryById,
  // Dhikr Types
  getDhikrTypes,
  getDhikrTypeById,
  // Thasbeehs
  getThasbeehs,
  getTasbeehById,
  // Fasting Types
  getFastingTypes,
  getFastingTypeById,
  // Quran Reading Content
  getQuranReadingContents,
  getQuranReadingContentById,
  // Quran Memorization Content
  getQuranMemorizationContents,
  getQuranMemorizationContentById,
  // Verse Importance
  getVerseImportances,
  getVerseImportanceById,
  // Dhikr Importance
  getDhikrImportances,
  getDhikrImportanceById,
  // Dua Importance
  getDuaImportances,
  getDuaImportanceById,
  // Daily Quotes
  getDailyQuotes,
  getDailyQuoteById,
  // Friday Quotes
  getFridayQuoteToday,
  getFridayQuotes,
  getFridayQuoteById,
  // Hadees
  getHadeesList,
  getHadeesById,
  // Hadees Categories
  getHadeesCategories,
  getHadeesCategoryById,
  // Names of Allah
  getNamesOfAllah,
  getNameOfAllahById,
  // Live Links
  getLiveLinks,
  getLiveLinkById,
  // Ramadan Duas
  getRamadanDuas,
  // Banners
  getTodayBanner,
};
