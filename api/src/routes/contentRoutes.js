const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getDuas, getDuaById,
  getDuaCategories, getDuaCategoryById,
  getDhikrCategories, getDhikrCategoryById,
  getDhikrTypes, getDhikrTypeById,
  getThasbeehs, getTasbeehById,
  getFastingTypes, getFastingTypeById,
  getQuranReadingContents, getQuranReadingContentById,
  getQuranMemorizationContents, getQuranMemorizationContentById,
  getVerseImportances, getVerseImportanceById,
  getDhikrImportances, getDhikrImportanceById,
  getDuaImportances, getDuaImportanceById,
  getDailyQuotes, getDailyQuoteById,
  getFridayQuoteToday, getFridayQuotes, getFridayQuoteById,
  getHadeesList, getHadeesById,
  getHadeesCategories, getHadeesCategoryById,
  getNamesOfAllah, getNameOfAllahById,
  getLiveLinks, getLiveLinkById,
  getRamadanDuas,
  getTodayBanner,
} = require('../controllers/contentController');

const {
  publicGetLibraryCategories,
  publicGetLibraryEntries,
  publicGetLibraryEntryById,
} = require('../controllers/libraryController');

const {
  publicGetSpecialCategories,
  publicGetSpecialEntries,
  publicGetSpecialEntryById,
} = require('../controllers/specialController');

router.use(authenticate);

// Duas
router.get('/duas', getDuas);
router.get('/duas/:id', getDuaById);

// Dua Categories
router.get('/dua-categories', getDuaCategories);
router.get('/dua-categories/:id', getDuaCategoryById);

// Dhikr Categories
router.get('/dhikr-categories', getDhikrCategories);
router.get('/dhikr-categories/:id', getDhikrCategoryById);

// Dhikr Types
router.get('/dhikr-types', getDhikrTypes);
router.get('/dhikr-types/:id', getDhikrTypeById);

// Thasbeehs
router.get('/thasbeehs', getThasbeehs);
router.get('/thasbeehs/:id', getTasbeehById);

// Fasting Types
router.get('/fasting-types', getFastingTypes);
router.get('/fasting-types/:id', getFastingTypeById);

// Quran Reading Content
router.get('/quran-reading-content', getQuranReadingContents);
router.get('/quran-reading-content/:id', getQuranReadingContentById);

// Quran Memorization Content
router.get('/quran-memorization-content', getQuranMemorizationContents);
router.get('/quran-memorization-content/:id', getQuranMemorizationContentById);

// Verse Importance
router.get('/verse-importance', getVerseImportances);
router.get('/verse-importance/:id', getVerseImportanceById);

// Dhikr Importance
router.get('/dhikr-importance', getDhikrImportances);
router.get('/dhikr-importance/:id', getDhikrImportanceById);

// Dua Importance
router.get('/dua-importance', getDuaImportances);
router.get('/dua-importance/:id', getDuaImportanceById);

// Daily Quotes
router.get('/daily-quotes', getDailyQuotes);
router.get('/daily-quotes/:id', getDailyQuoteById);

// Friday Quotes
router.get('/friday-quotes/today', getFridayQuoteToday);
router.get('/friday-quotes', getFridayQuotes);
router.get('/friday-quotes/:id', getFridayQuoteById);

// Hadees
router.get('/hadees', getHadeesList);
router.get('/hadees/:id', getHadeesById);

// Hadees Categories
router.get('/hadees-categories', getHadeesCategories);
router.get('/hadees-categories/:id', getHadeesCategoryById);

// Names of Allah
router.get('/names-of-allah', getNamesOfAllah);
router.get('/names-of-allah/:id', getNameOfAllahById);

// Live Links (authenticated users)
router.get('/live-links', getLiveLinks);
router.get('/live-links/:id', getLiveLinkById);

// Library
router.get('/library-categories', publicGetLibraryCategories);
router.get('/library-categories/:categoryId/entries', publicGetLibraryEntries);
router.get('/library-entries/:id', publicGetLibraryEntryById);

// Special Models
router.get('/special-categories', publicGetSpecialCategories);
router.get('/special-categories/:categoryId/entries', publicGetSpecialEntries);
router.get('/special-entries/:id', publicGetSpecialEntryById);

// Ramadan Duas
router.get('/ramadan-duas', getRamadanDuas);

// Banner — today's active banner
router.get('/banner/today', getTodayBanner);

module.exports = router;
