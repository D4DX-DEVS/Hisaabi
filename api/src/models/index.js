const mongoose = require('mongoose');
const dbConfig = require('../config/database');

const User = require('./User');
const ActivityLog = require('./ActivityLog');
const DhikrCategory = require('./DhikrCategory');
const DhikrTracking = require('./DhikrTracking');
const DhikrType = require('./DhikrType');
const Dua = require('./Dua');
const DuaCategory = require('./DuaCategory');
const Tasbeeh = require('./Tasbeeh');
const DuaMemorization = require('./DuaMemorization');
const FastingDay = require('./FastingDay');
const FastingType = require('./FastingType');
const Group = require('./Group');
const GroupActivity = require('./GroupActivity');
const PeriodTracking = require('./PeriodTracking');
const PrayerTracking = require('./PrayerTracking');
const QuranMemorization = require('./QuranMemorization');
const QuranMemorizationContent = require('./QuranMemorizationContent');
const QuranProgress = require('./QuranProgress');
const QuranReading = require('./QuranReading');
const QuranReadingContent = require('./QuranReadingContent');
const Streak = require('./Streak');
const VerseImportance = require('./VerseImportance');
const DhikrImportance = require('./DhikrImportance');
const DuaImportance = require('./DuaImportance');
const DailyQuote = require('./DailyQuote');
const FridayQuote = require('./FridayQuote');
const Hadees = require('./Hadees');
const HadeesCategory = require('./HadeesCategory');
const NameOfAllah = require('./NameOfAllah');
const LiveLink = require('./LiveLink');
const RamadanDua = require('./RamadanDua');
const Banner = require('./Banner');

async function connectDB() {
  try {
    await mongoose.connect(dbConfig.uri);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  User,
  ActivityLog,
  DhikrCategory,
  DhikrTracking,
  DhikrType,
  Dua,
  DuaCategory,
  Tasbeeh,
  DuaMemorization,
  FastingDay,
  FastingType,
  Group,
  GroupActivity,
  PeriodTracking,
  PrayerTracking,
  QuranMemorization,
  QuranMemorizationContent,
  QuranProgress,
  QuranReading,
  QuranReadingContent,
  Streak,
  VerseImportance,
  DhikrImportance,
  DuaImportance,
  DailyQuote,
  FridayQuote,
  Hadees,
  HadeesCategory,
  NameOfAllah,
  LiveLink,
  RamadanDua,
  Banner,
};
