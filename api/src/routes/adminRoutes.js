const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const { uploadBannerFiles } = require('../middleware/uploadMiddleware');
const {
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
  // Leaderboards
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
} = require('../controllers/adminController');

const {
  getLibraryCategories, createLibraryCategory, updateLibraryCategory, deleteLibraryCategory,
  getLibraryEntries, createLibraryEntry, updateLibraryEntry, deleteLibraryEntry,
} = require('../controllers/libraryController');

const {
  getSpecialCategories, createSpecialCategory, updateSpecialCategory, deleteSpecialCategory,
  getSpecialEntries, createSpecialEntry, updateSpecialEntry, deleteSpecialEntry,
} = require('../controllers/specialController');

// Public admin login (no auth needed)
router.post('/login', adminLogin);

// All routes below require admin JWT
router.use(authenticateAdmin);
router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.delete('/users/:id', deleteUser);
router.get('/groups', getGroups);
router.get('/groups/:id', getGroupDetail);
router.patch('/groups/:id/transfer-admin', transferGroupAdmin);
router.get('/groups/:id/export-activities', exportAdminGroupActivities);
router.delete('/groups/:id', deleteGroup);
router.get('/activity-logs', getActivityLogs);

// ── Group Activities (admin) ──────────────────────────────────────────
router.get('/group-activities', getAdminGroupActivities);
router.delete('/group-activities/:id', deleteAdminGroupActivity);

// ── Content Management ────────────────────────────────────────────────
router.get('/duas', getDuas);
router.post('/duas', createDua);
router.put('/duas/:id', updateDua);
router.delete('/duas/:id', deleteDua);

router.get('/dua-categories', getDuaCategories);
router.post('/dua-categories', createDuaCategory);
router.put('/dua-categories/:id', updateDuaCategory);
router.delete('/dua-categories/:id', deleteDuaCategory);

router.get('/dhikr-categories', getDhikrCategories);
router.post('/dhikr-categories', createDhikrCategory);
router.put('/dhikr-categories/:id', updateDhikrCategory);
router.delete('/dhikr-categories/:id', deleteDhikrCategory);

router.get('/dhikr-types', getDhikrTypes);
router.post('/dhikr-types', createDhikrType);
router.put('/dhikr-types/:id', updateDhikrType);
router.delete('/dhikr-types/:id', deleteDhikrType);

router.get('/thasbeehs', getThasbeehs);
router.post('/thasbeehs', createTasbeeh);
router.put('/thasbeehs/:id', updateTasbeeh);
router.delete('/thasbeehs/:id', deleteTasbeeh);

router.get('/fasting-types', getFastingTypes);
router.post('/fasting-types', createFastingType);
router.put('/fasting-types/:id', updateFastingType);
router.delete('/fasting-types/:id', deleteFastingType);

router.get('/quran-reading-content', getQuranReadingContents);
router.post('/quran-reading-content', createQuranReadingContent);
router.put('/quran-reading-content/:id', updateQuranReadingContent);
router.delete('/quran-reading-content/:id', deleteQuranReadingContent);

router.get('/quran-memorization-content', getQuranMemorizationContents);
router.post('/quran-memorization-content', createQuranMemorizationContent);
router.put('/quran-memorization-content/:id', updateQuranMemorizationContent);
router.delete('/quran-memorization-content/:id', deleteQuranMemorizationContent);

router.get('/verse-importance', getVerseImportances);
router.post('/verse-importance', createVerseImportance);
router.put('/verse-importance/:id', updateVerseImportance);
router.delete('/verse-importance/:id', deleteVerseImportance);

router.get('/dhikr-importance', getDhikrImportances);
router.post('/dhikr-importance', createDhikrImportance);
router.put('/dhikr-importance/:id', updateDhikrImportance);
router.delete('/dhikr-importance/:id', deleteDhikrImportance);

router.get('/dua-importance', getDuaImportances);
router.post('/dua-importance', createDuaImportance);
router.put('/dua-importance/:id', updateDuaImportance);
router.delete('/dua-importance/:id', deleteDuaImportance);

// Library (unified dynamic importance/content categories)
router.get('/library-categories', getLibraryCategories);
router.post('/library-categories', createLibraryCategory);
router.put('/library-categories/:id', updateLibraryCategory);
router.delete('/library-categories/:id', deleteLibraryCategory);
router.get('/library-categories/:categoryId/entries', getLibraryEntries);
router.post('/library-categories/:categoryId/entries', createLibraryEntry);
router.put('/library-entries/:id', updateLibraryEntry);
router.delete('/library-entries/:id', deleteLibraryEntry);

// Special Models (dynamic schema categories + entries)
router.get('/special-categories', getSpecialCategories);
router.post('/special-categories', createSpecialCategory);
router.put('/special-categories/:id', updateSpecialCategory);
router.delete('/special-categories/:id', deleteSpecialCategory);
router.get('/special-categories/:categoryId/entries', getSpecialEntries);
router.post('/special-categories/:categoryId/entries', createSpecialEntry);
router.put('/special-entries/:id', updateSpecialEntry);
router.delete('/special-entries/:id', deleteSpecialEntry);

router.get('/daily-quotes', getDailyQuotes);
router.post('/daily-quotes', createDailyQuote);
router.put('/daily-quotes/:id', updateDailyQuote);
router.delete('/daily-quotes/:id', deleteDailyQuote);

router.get('/friday-quotes', getFridayQuotes);
router.post('/friday-quotes', createFridayQuote);
router.put('/friday-quotes/:id', updateFridayQuote);
router.delete('/friday-quotes/:id', deleteFridayQuote);

router.get('/hadees', getHadeesList);
router.post('/hadees', createHadees);
router.put('/hadees/:id', updateHadees);
router.delete('/hadees/:id', deleteHadees);

router.get('/hadees-categories', getHadeesCategories);
router.post('/hadees-categories', createHadeesCategory);
router.put('/hadees-categories/:id', updateHadeesCategory);
router.delete('/hadees-categories/:id', deleteHadeesCategory);

router.get('/names-of-allah', getNamesOfAllah);
router.post('/names-of-allah', createNameOfAllah);
router.put('/names-of-allah/:id', updateNameOfAllah);
router.delete('/names-of-allah/:id', deleteNameOfAllah);

router.get('/live-links', getLiveLinks);
router.post('/live-links', createLiveLink);
router.put('/live-links/:id', updateLiveLink);
router.delete('/live-links/:id', deleteLiveLink);

router.get('/ramadan-duas', getRamadanDuas);
router.post('/ramadan-duas', createRamadanDua);
router.put('/ramadan-duas/day/:dayNumber', upsertRamadanDuasForDay);
router.put('/ramadan-duas/:id', updateRamadanDua);
router.delete('/ramadan-duas/:id', deleteRamadanDua);

// ── Model Leaderboards ────────────────────────────────────────────────
router.get('/models/dhikr-tracking', getDhikrTrackingStats);
router.get('/models/dua-memorization', getDuaMemorizationStats);
router.get('/models/fasting', getFastingStats);
router.get('/models/prayer-tracking', getPrayerTrackingStats);
router.get('/models/quran-reading', getQuranReadingStats);
router.get('/models/quran-memorization', getQuranMemorizationStats);
router.get('/models/quran-progress', getQuranProgressStats);
router.get('/models/streaks', getStreakStats);

// ── Tracking Records (read-only) ───────────────────────────────────────────
router.get('/models/prayer-tracking/records', getPrayerTrackingRecords);
router.get('/models/quran-reading/records', getQuranReadingRecords);
router.get('/models/quran-memorization/records', getQuranMemorizationRecords);
router.get('/models/dhikr-tracking/records', getDhikrTrackingRecords);
router.get('/models/fasting/records', getFastingRecords);
router.get('/models/dua-memorization/records', getDuaMemorizationRecords);

// ── Banners ────────────────────────────────────────────────────────────────────
router.get('/banners', getBanners);
router.post('/banners', uploadBannerFiles, createBanner);
router.put('/banners/:id', uploadBannerFiles, updateBanner);
router.delete('/banners/:id', deleteBanner);

module.exports = router;

