const { QuranReading, QuranProgress, QuranMemorization, ActivityLog } = require('../models');
const { queueStreakUpdate } = require('../services/streakQueueService');
const { getCurrentDate } = require('../utils/dateUtils');
const surahInfo = require('../data/quran-surah-info.json');

const TOTAL_PAGES = 604;

// Build surah lookup map
const surahMap = {};
for (const s of surahInfo) {
  surahMap[s.surah_number] = s.total_ayahs;
}

function calculateNextAyah(currentKey) {
  const parts = currentKey.split(':');
  const surah = parseInt(parts[0]);
  const ayah = parseInt(parts[1]);
  const totalAyahs = surahMap[surah];
  if (!totalAyahs) return currentKey;

  if (ayah < totalAyahs) {
    return `${surah}:${ayah + 1}`;
  } else if (surah < 114) {
    return `${surah + 1}:1`;
  }
  // End of Quran
  return `${surah}:${ayah}`;
}

// ── Reading endpoints ────────────────────────────────────────────────

async function getReadingProgress(req, res, next) {
  try {
    const userId = req.user._id;

    let progress = await QuranProgress.findOne({ user_id: userId });
    if (!progress) {
      progress = await QuranProgress.create({ user_id: userId });
    }

    // Get all pages read since last reset
    const query = { user_id: userId };
    if (progress.last_reset_date) {
      const resetDate = new Date(progress.last_reset_date);
      const dateStr = resetDate.toISOString().split('T')[0];
      query.date = { $gte: dateStr };
    }

    const readingRecords = await QuranReading.find(query);
    const allPages = new Set();
    let lastReadPage = null;

    for (const r of readingRecords) {
      for (const p of r.pages_read) allPages.add(p);
      if (r.last_read_page) {
        if (!lastReadPage || r.last_read_page > lastReadPage) {
          lastReadPage = r.last_read_page;
        }
      }
    }

    const pagesArray = Array.from(allPages).sort((a, b) => a - b);
    const percentage = Math.round((allPages.size / TOTAL_PAGES) * 100);

    return res.status(200).json({
      khatms_completed: progress.khatms_completed,
      last_reset_date: progress.last_reset_date,
      last_completed_date: progress.last_completed_date,
      last_read_page: lastReadPage,
      pages_read: pagesArray,
      total_pages_read: allPages.size,
      percentage_completed: percentage,
    });
  } catch (err) {
    next(err);
  }
}

async function addReadPage(req, res, next) {
  try {
    const userId = req.user._id;
    const { page } = req.body;

    if (!page || typeof page !== 'number' || page < 1 || page > TOTAL_PAGES) {
      return res.status(400).json({ error: `page must be an integer between 1 and ${TOTAL_PAGES}` });
    }

    const today = getCurrentDate();
    let record = await QuranReading.findOne({ user_id: userId, date: today });
    if (!record) {
      record = new QuranReading({ user_id: userId, date: today, pages_read: [], last_read_page: null });
    }

    if (!record.pages_read.includes(page)) {
      record.pages_read.push(page);
    }
    record.last_read_page = page;
    await record.save();

    ActivityLog.create({
      user_id: userId,
      date: today,
      activity_type: 'quran_reading',
      details: { page },
    }).catch(() => {});

    queueStreakUpdate(userId, 'quran_reading');
    queueStreakUpdate(userId, 'combined');

    return res.status(200).json({
      success: true,
      pages_read: record.pages_read,
      last_read_page: record.last_read_page,
    });
  } catch (err) {
    next(err);
  }
}

async function removeReadPage(req, res, next) {
  try {
    const userId = req.user._id;
    const page = parseInt(req.params.page);
    const today = getCurrentDate();

    const record = await QuranReading.findOne({ user_id: userId, date: today });
    if (!record) return res.status(404).json({ error: 'No reading found for today' });

    const idx = record.pages_read.indexOf(page);
    if (idx === -1) return res.status(404).json({ error: 'Page not found in today\'s reading' });

    record.pages_read.splice(idx, 1);
    record.last_read_page = record.pages_read.length > 0
      ? record.pages_read[record.pages_read.length - 1]
      : null;
    await record.save();

    return res.status(200).json({
      success: true,
      pages_read: record.pages_read,
      last_read_page: record.last_read_page,
    });
  } catch (err) {
    next(err);
  }
}

async function handleReadingProgress(req, res, next) {
  try {
    const userId = req.user._id;
    const { action } = req.body;

    let progress = await QuranProgress.findOne({ user_id: userId });
    if (!progress) progress = await QuranProgress.create({ user_id: userId });

    if (action === 'check_completion') {
      const query = { user_id: userId };
      if (progress.last_reset_date) {
        query.date = { $gte: new Date(progress.last_reset_date).toISOString().split('T')[0] };
      }
      const records = await QuranReading.find(query);
      const allPages = new Set();
      for (const r of records) r.pages_read.forEach((p) => allPages.add(p));

      if (allPages.size >= TOTAL_PAGES) {
        return res.status(200).json({ success: true, is_complete: true, message: 'Quran reading complete!' });
      }

      const allPageNumbers = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
      const remaining_pages = allPageNumbers.filter((p) => !allPages.has(p));
      return res.status(200).json({
        success: true,
        is_complete: false,
        remaining_pages,
        remaining_pages_count: remaining_pages.length,
      });
    } else if (action === 'reset') {
      const query = { user_id: userId };
      if (progress.last_reset_date) {
        query.date = { $gte: new Date(progress.last_reset_date).toISOString().split('T')[0] };
      }
      const records = await QuranReading.find(query);
      const allPages = new Set();
      for (const r of records) r.pages_read.forEach((p) => allPages.add(p));

      let is_complete = false;
      if (allPages.size >= TOTAL_PAGES) {
        progress.khatms_completed += 1;
        progress.last_completed_date = new Date();
        is_complete = true;
      }
      progress.last_reset_date = new Date();
      await progress.save();

      return res.status(200).json({
        success: true,
        reset: true,
        is_complete,
        khatms_completed: progress.khatms_completed,
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "check_completion" or "reset"' });
    }
  } catch (err) {
    next(err);
  }
}

// ── Memorization endpoints ───────────────────────────────────────────

async function getMemorization(req, res, next) {
  try {
    const userId = req.user._id;
    let record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) record = await QuranMemorization.create({ user_id: userId });

    return res.status(200).json({
      memorized_ayahs: record.memorized_ayahs,
      next_ayah_to_memorize: record.next_ayah_to_memorize,
    });
  } catch (err) {
    next(err);
  }
}

async function addMemorizedAyah(req, res, next) {
  try {
    const userId = req.user._id;
    const { ayah_key } = req.body;

    if (!ayah_key || !/^\d+:\d+$/.test(ayah_key)) {
      return res.status(400).json({ error: 'Invalid ayah key format. Must be "surah:ayah" e.g. "1:1"' });
    }

    const [surahStr, ayahStr] = ayah_key.split(':');
    const surah = parseInt(surahStr);
    const ayah = parseInt(ayahStr);

    if (!surahMap[surah]) {
      return res.status(400).json({ error: `Invalid surah number: ${surah}` });
    }
    if (ayah < 1 || ayah > surahMap[surah]) {
      return res.status(400).json({ error: `Invalid ayah number ${ayah} for surah ${surah}` });
    }

    let record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) record = new QuranMemorization({ user_id: userId });

    const alreadyExists = record.memorized_ayahs.some((a) => a.ayah_key === ayah_key);
    if (!alreadyExists) {
      const ayahs = [...record.memorized_ayahs, { ayah_key, memorized_at: new Date().toISOString() }];
      record.memorized_ayahs = ayahs;

      // Auto-advance next_ayah_to_memorize if it matches
      if (record.next_ayah_to_memorize === ayah_key) {
        record.next_ayah_to_memorize = calculateNextAyah(ayah_key);
      }

      record.markModified('memorized_ayahs');
      await record.save();

      ActivityLog.create({
        user_id: userId,
        date: getCurrentDate(),
        activity_type: 'quran_memorization',
        details: { ayah_key },
      }).catch(() => {});

      // Async goal completion check
      setImmediate(async () => {
        try {
          const fresh = await QuranMemorization.findOne({ user_id: userId });
          if (!fresh || !fresh.memorization_goals) return;
          const memorizedKeys = new Set(fresh.memorized_ayahs.map((a) => a.ayah_key));
          let changed = false;
          const goals = fresh.memorization_goals.map((g) => {
            if (g.completed) return g;
            let allMem = true;
            for (let a = g.from_ayah; a <= g.to_ayah; a++) {
              if (!memorizedKeys.has(`${g.surah_number}:${a}`)) { allMem = false; break; }
            }
            if (allMem) { changed = true; return { ...g, completed: true }; }
            return g;
          });
          if (changed) {
            fresh.memorization_goals = goals;
            fresh.markModified('memorization_goals');
            await fresh.save();
          }
        } catch (e) {}
      });
    }

    return res.status(200).json({
      success: true,
      memorized_ayahs: record.memorized_ayahs,
      next_ayah_to_memorize: record.next_ayah_to_memorize,
    });
  } catch (err) {
    next(err);
  }
}

async function removeMemorizedAyah(req, res, next) {
  try {
    const userId = req.user._id;
    const ayah_key = req.params.ayah_key;

    const record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) return res.status(404).json({ error: 'No memorization record found' });

    const idx = record.memorized_ayahs.findIndex((a) => a.ayah_key === ayah_key);
    if (idx === -1) return res.status(404).json({ error: 'Ayah not found in memorized list' });

    record.memorized_ayahs.splice(idx, 1);
    record.markModified('memorized_ayahs');
    await record.save();

    return res.status(200).json({ success: true, memorized_ayahs: record.memorized_ayahs });
  } catch (err) {
    next(err);
  }
}

async function setNextAyahToMemorize(req, res, next) {
  try {
    const userId = req.user._id;
    const { ayah_key } = req.body;

    if (!ayah_key || !/^\d+:\d+$/.test(ayah_key)) {
      return res.status(400).json({ error: 'Invalid ayah key format' });
    }

    let record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) record = new QuranMemorization({ user_id: userId });
    record.next_ayah_to_memorize = ayah_key;
    await record.save();

    return res.status(200).json({ success: true, next_ayah_to_memorize: ayah_key });
  } catch (err) {
    next(err);
  }
}

async function resetMemorization(req, res, next) {
  try {
    const userId = req.user._id;
    let record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) record = new QuranMemorization({ user_id: userId });
    record.memorized_ayahs = [];
    record.next_ayah_to_memorize = '1:1';
    record.markModified('memorized_ayahs');
    await record.save();

    return res.status(200).json({ success: true, message: 'Memorization reset successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReadingProgress,
  addReadPage,
  removeReadPage,
  handleReadingProgress,
  getMemorization,
  addMemorizedAyah,
  removeMemorizedAyah,
  setNextAyahToMemorize,
  resetMemorization,
};
