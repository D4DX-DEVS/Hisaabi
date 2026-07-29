import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Admin endpoints ──────────────────────────────────────────────────

export const adminApi = {
  login: (credentials) => api.post('/admin/login', credentials),

  getStats: () => api.get('/admin/stats'),

  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  getGroups: (params) => api.get('/admin/groups', { params }),
  getGroupDetail: (id) => api.get(`/admin/groups/${id}`),
  deleteGroup: (id) => api.delete(`/admin/groups/${id}`),
  transferGroupAdmin: (id, newAdminId) => api.patch(`/admin/groups/${id}/transfer-admin`, { new_admin_id: newAdminId }),
  exportGroupActivities: (id) => api.get(`/admin/groups/${id}/export-activities`, { responseType: 'blob' }),

  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),

  // ── Group Activities (admin) ────────────────────────────────────────
  getGroupActivities: (params) => api.get('/admin/group-activities', { params }),
  deleteGroupActivity: (id) => api.delete(`/admin/group-activities/${id}`),

  // ── Content Management: Duas ───────────────────────────────────────
  getDuas: (params) => api.get('/admin/duas', { params }),
  createDua: (data) => api.post('/admin/duas', data),
  updateDua: (id, data) => api.put(`/admin/duas/${id}`, data),
  deleteDua: (id) => api.delete(`/admin/duas/${id}`),

  // ── Content Management: Dua Categories ────────────────────────────
  getDuaCategories: (params) => api.get('/admin/dua-categories', { params }),
  createDuaCategory: (data) => api.post('/admin/dua-categories', data),
  updateDuaCategory: (id, data) => api.put(`/admin/dua-categories/${id}`, data),
  deleteDuaCategory: (id) => api.delete(`/admin/dua-categories/${id}`),

  // ── Content Management: Dhikr Categories ──────────────────────────
  getDhikrCategories: (params) => api.get('/admin/dhikr-categories', { params }),
  createDhikrCategory: (data) => api.post('/admin/dhikr-categories', data),
  updateDhikrCategory: (id, data) => api.put(`/admin/dhikr-categories/${id}`, data),
  deleteDhikrCategory: (id) => api.delete(`/admin/dhikr-categories/${id}`),

  // ── Content Management: Dhikr Types ───────────────────────────────
  getDhikrTypes: (params) => api.get('/admin/dhikr-types', { params }),
  createDhikrType: (data) => api.post('/admin/dhikr-types', data),
  updateDhikrType: (id, data) => api.put(`/admin/dhikr-types/${id}`, data),
  deleteDhikrType: (id) => api.delete(`/admin/dhikr-types/${id}`),

  // ── Content Management: Thasbeehs ─────────────────────────────────
  getThasbeehs: (params) => api.get('/admin/thasbeehs', { params }),
  createTasbeeh: (data) => api.post('/admin/thasbeehs', data),
  updateTasbeeh: (id, data) => api.put(`/admin/thasbeehs/${id}`, data),
  deleteTasbeeh: (id) => api.delete(`/admin/thasbeehs/${id}`),

  // ── Content Management: Fasting Types ─────────────────────────────
  getFastingTypes: (params) => api.get('/admin/fasting-types', { params }),
  createFastingType: (data) => api.post('/admin/fasting-types', data),
  updateFastingType: (id, data) => api.put(`/admin/fasting-types/${id}`, data),
  deleteFastingType: (id) => api.delete(`/admin/fasting-types/${id}`),

  // ── Content Management: Quran Reading Portions ────────────────────
  getQuranReadingContents: (params) => api.get('/admin/quran-reading-content', { params }),
  createQuranReadingContent: (data) => api.post('/admin/quran-reading-content', data),
  updateQuranReadingContent: (id, data) => api.put(`/admin/quran-reading-content/${id}`, data),
  deleteQuranReadingContent: (id) => api.delete(`/admin/quran-reading-content/${id}`),

  // ── Content Management: Quran Memorization Portions ───────────────
  getQuranMemorizationContents: (params) => api.get('/admin/quran-memorization-content', { params }),
  createQuranMemorizationContent: (data) => api.post('/admin/quran-memorization-content', data),
  updateQuranMemorizationContent: (id, data) => api.put(`/admin/quran-memorization-content/${id}`, data),
  deleteQuranMemorizationContent: (id) => api.delete(`/admin/quran-memorization-content/${id}`),

  // ── Content Management: Verse Importance ──────────────────────────
  getVerseImportances: (params) => api.get('/admin/verse-importance', { params }),
  createVerseImportance: (data) => api.post('/admin/verse-importance', data),
  updateVerseImportance: (id, data) => api.put(`/admin/verse-importance/${id}`, data),
  deleteVerseImportance: (id) => api.delete(`/admin/verse-importance/${id}`),

  // ── Content Management: Dhikr Importance ──────────────────────────
  getDhikrImportances: (params) => api.get('/admin/dhikr-importance', { params }),
  createDhikrImportance: (data) => api.post('/admin/dhikr-importance', data),
  updateDhikrImportance: (id, data) => api.put(`/admin/dhikr-importance/${id}`, data),
  deleteDhikrImportance: (id) => api.delete(`/admin/dhikr-importance/${id}`),

  // ── Content Management: Dua Importance ────────────────────────────
  getDuaImportances: (params) => api.get('/admin/dua-importance', { params }),
  createDuaImportance: (data) => api.post('/admin/dua-importance', data),
  updateDuaImportance: (id, data) => api.put(`/admin/dua-importance/${id}`, data),
  deleteDuaImportance: (id) => api.delete(`/admin/dua-importance/${id}`),

  // ── Library (unified dynamic categories + entries) ─────────────────
  getLibraryCategories:   ()         => api.get('/admin/library-categories'),
  createLibraryCategory:  (data)     => api.post('/admin/library-categories', data),
  updateLibraryCategory:  (id, data) => api.put(`/admin/library-categories/${id}`, data),
  deleteLibraryCategory:  (id)       => api.delete(`/admin/library-categories/${id}`),
  getLibraryEntries:      (categoryId, params) => api.get(`/admin/library-categories/${categoryId}/entries`, { params }),
  createLibraryEntry:     (categoryId, data)   => api.post(`/admin/library-categories/${categoryId}/entries`, data),
  updateLibraryEntry:     (id, data) => api.put(`/admin/library-entries/${id}`, data),
  deleteLibraryEntry:     (id)       => api.delete(`/admin/library-entries/${id}`),

  // ── Special Models (dynamic schema categories + entries) ───────────
  getSpecialCategories:   ()         => api.get('/admin/special-categories'),
  createSpecialCategory:  (data)     => api.post('/admin/special-categories', data),
  updateSpecialCategory:  (id, data) => api.put(`/admin/special-categories/${id}`, data),
  deleteSpecialCategory:  (id)       => api.delete(`/admin/special-categories/${id}`),
  getSpecialEntries:      (categoryId, params) => api.get(`/admin/special-categories/${categoryId}/entries`, { params }),
  createSpecialEntry:     (categoryId, data)   => api.post(`/admin/special-categories/${categoryId}/entries`, data),
  updateSpecialEntry:     (id, data) => api.put(`/admin/special-entries/${id}`, data),
  deleteSpecialEntry:     (id)       => api.delete(`/admin/special-entries/${id}`),

  // ── Content Management: Daily Quotes ───────────────────────────────
  getDailyQuotes: (params) => api.get('/admin/daily-quotes', { params }),
  createDailyQuote: (data) => api.post('/admin/daily-quotes', data),
  updateDailyQuote: (id, data) => api.put(`/admin/daily-quotes/${id}`, data),
  deleteDailyQuote: (id) => api.delete(`/admin/daily-quotes/${id}`),

  // ── Content Management: Friday Quotes ──────────────────────────────
  getFridayQuotes: (params) => api.get('/admin/friday-quotes', { params }),
  createFridayQuote: (data) => api.post('/admin/friday-quotes', data),
  updateFridayQuote: (id, data) => api.put(`/admin/friday-quotes/${id}`, data),
  deleteFridayQuote: (id) => api.delete(`/admin/friday-quotes/${id}`),

  // ── Content Management: Hadees ──────────────────────────────────────
  getHadeesList: (params) => api.get('/admin/hadees', { params }),
  createHadees: (data) => api.post('/admin/hadees', data),
  updateHadees: (id, data) => api.put(`/admin/hadees/${id}`, data),
  deleteHadees: (id) => api.delete(`/admin/hadees/${id}`),

  // ── Content Management: Hadees Categories ─────────────────────────
  getHadeesCategories: (params) => api.get('/admin/hadees-categories', { params }),
  createHadeesCategory: (data) => api.post('/admin/hadees-categories', data),
  updateHadeesCategory: (id, data) => api.put(`/admin/hadees-categories/${id}`, data),
  deleteHadeesCategory: (id) => api.delete(`/admin/hadees-categories/${id}`),

  // ── Content Management: Names of Allah ────────────────────────────
  getNamesOfAllah: (params) => api.get('/admin/names-of-allah', { params }),
  createNameOfAllah: (data) => api.post('/admin/names-of-allah', data),
  updateNameOfAllah: (id, data) => api.put(`/admin/names-of-allah/${id}`, data),
  deleteNameOfAllah: (id) => api.delete(`/admin/names-of-allah/${id}`),

  // ── Content Management: Live Links ────────────────────────────────
  getLiveLinks: (params) => api.get('/admin/live-links', { params }),
  createLiveLink: (data) => api.post('/admin/live-links', data),
  updateLiveLink: (id, data) => api.put(`/admin/live-links/${id}`, data),
  deleteLiveLink: (id) => api.delete(`/admin/live-links/${id}`),

  // ── Content Management: Ramadan Duas ──────────────────────────────
  getRamadanDuas: (params) => api.get('/admin/ramadan-duas', { params }),
  createRamadanDua: (data) => api.post('/admin/ramadan-duas', data),
  updateRamadanDua: (id, data) => api.put(`/admin/ramadan-duas/${id}`, data),
  deleteRamadanDua: (id) => api.delete(`/admin/ramadan-duas/${id}`),
  upsertRamadanDay: (dayNumber, duas) => api.put(`/admin/ramadan-duas/day/${dayNumber}`, { duas }),

  // ── Content Management: Banners ────────────────────────────────────
  getBanners: (params) => api.get('/admin/banners', { params }),
  createBanner: (formData) => api.post('/admin/banners', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateBanner: (id, formData) => api.put(`/admin/banners/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteBanner: (id) => api.delete(`/admin/banners/${id}`),

  // ── Leaderboards ───────────────────────────────────────────────────
  getDhikrTrackingStats: () => api.get('/admin/models/dhikr-tracking'),
  getDuaMemorizationStats: () => api.get('/admin/models/dua-memorization'),
  getFastingStats: () => api.get('/admin/models/fasting'),
  getPrayerTrackingStats: () => api.get('/admin/models/prayer-tracking'),
  getQuranReadingStats: () => api.get('/admin/models/quran-reading'),
  getQuranMemorizationStats: () => api.get('/admin/models/quran-memorization'),
  getQuranProgressStats: () => api.get('/admin/models/quran-progress'),
  getStreakStats: (type) => api.get('/admin/models/streaks', { params: type ? { type } : {} }),

  // ── Tracking Records (read-only) ───────────────────────────────────
  getPrayerTrackingRecords: (params) => api.get('/admin/models/prayer-tracking/records', { params }),
  getQuranReadingRecords: (params) => api.get('/admin/models/quran-reading/records', { params }),
  getQuranMemorizationRecords: (params) => api.get('/admin/models/quran-memorization/records', { params }),
  getDhikrTrackingRecords: (params) => api.get('/admin/models/dhikr-tracking/records', { params }),
  getFastingRecords: (params) => api.get('/admin/models/fasting/records', { params }),
  getDuaMemorizationRecords: (params) => api.get('/admin/models/dua-memorization/records', { params }),
};

export default api;
