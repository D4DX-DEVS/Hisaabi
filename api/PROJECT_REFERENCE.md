# Hisabi Backend v2 — Complete Project Reference

> Use this as a blueprint to rebuild the project in Node.js + Express.js.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Database & Config](#3-database--config)
4. [Authentication](#4-authentication)
5. [Models](#5-models)
   - [User](#51-user)
   - [ActivityLog](#52-activitylog)
   - [DhikrTracking](#53-dhikrtracking)
   - [DuaMemorization](#54-duamemorization)
   - [FastingDay](#55-fastingday)
   - [Group](#56-group)
   - [GroupActivity](#57-groupactivity)
   - [PeriodTracking](#58-periodtracking)
   - [PrayerTracking](#59-prayertracking)
   - [QuranMemorization](#510-quranmemorization)
   - [QuranProgress](#511-quranprogress)
   - [QuranReading](#512-quranreading)
   - [Streak](#513-streak)
6. [API Endpoints](#6-api-endpoints)
   - [Auth](#61-auth--apiauthz)
   - [User](#62-user--apiuser)
   - [Activity](#63-activity--apiactivity)
   - [Prayers](#64-prayers--apiprayers)
   - [Dhikr](#65-dhikr--apidhikr)
   - [Duas](#66-duas--apiduas)
   - [Fasting](#67-fasting--apifasting)
   - [Quran](#68-quran--apiquran)
   - [Periods](#69-periods--apiperiods)
   - [Streaks](#610-streaks--apistreaks)
   - [Goals](#611-goals--apigoals)
   - [Groups](#612-groups--apigroups)
   - [Group Activities](#613-group-activities--apigroup-activities)
7. [Middleware](#7-middleware)
8. [Settings Structure](#8-settings-structure)
9. [JSONB Field Schemas](#9-jsonb-field-schemas)
10. [Streak Types](#10-streak-types)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 14 |
| Framework | Express.js ^4.21 |
| Database | MongoDB |
| ODM | Mongoose ^8.0 |
| Auth | JWT (`jsonwebtoken` ^9) |
| Password hashing | `bcryptjs` (installed, not used for user passwords — auth is Firebase UID-based) |
| Security | `helmet`, `cors` |
| API Docs | Swagger UI + Scalar |
| Environment | `dotenv` |
| Dev | `nodemon` |

---

## 2. Project Structure

```
src/
├── app.js                        Entry point
├── config/
│   ├── auth.js                   JWT secret & expiry
│   └── database.js               MongoDB URI config (dev + prod)
├── models/
│   ├── index.js                  Connects to MongoDB, exports all models
│   ├── User.js
│   ├── ActivityLog.js
│   ├── DhikrTracking.js
│   ├── DuaMemorization.js
│   ├── FastingDay.js
│   ├── Group.js
│   ├── GroupActivity.js
│   ├── PeriodTracking.js
│   ├── PrayerTracking.js
│   ├── QuranMemorization.js
│   ├── QuranProgress.js
│   ├── QuranReading.js
│   └── Streak.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── activityController.js
│   ├── dhikrController.js
│   ├── duaController.js
│   ├── fastingController.js
│   ├── prayerController.js
│   ├── quranController.js
│   ├── periodController.js
│   ├── groupController.js
│   ├── groupActivityController.js
│   ├── streakController.js
│   └── goalsController.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── activityRoutes.js
│   ├── dhikrRoutes.js
│   ├── duaRoutes.js
│   ├── fastingRoutes.js
│   ├── prayerRoutes.js
│   ├── quranRoutes.js
│   ├── periodRoutes.js
│   ├── groupRoutes.js
│   ├── groupActivityRoutes.js
│   ├── streakRoutes.js
│   └── goalsRoutes.js
├── middleware/
│   ├── auth.js                   JWT authentication middleware
│   └── errorHandler.js           Global error handler
├── services/
│   ├── streakService.js          Streak calculation logic
│   ├── streakQueueService.js     Async streak update queue
│   └── reportService.js
├── utils/
│   ├── dateUtils.js              formatDate, getCurrentDate, etc.
│   ├── jwtUtils.js               generateToken, verifyToken
│   └── swaggerUtils.js
└── data/
    └── quran-surah-info.json     Surah metadata (surah_number, total_ayahs)
```

---

## 3. Database & Config

### Environment Variables (`.env`)

```
PORT=4000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/Hisabi

JWT_SECRET=
JWT_EXPIRATION=30d
```

### Database Config Notes

- `MONGODB_URI` must point to a MongoDB instance (local or Atlas)
- All schemas use `timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }` for snake_case field names
- All schemas use `toJSON: { virtuals: true, versionKey: false }` so the `id` virtual returns `_id` as a string
- Date-only fields (e.g. `date`, `start_date`, `end_date`) are stored as `String` in `YYYY-MM-DD` format for lexicographic comparison
- Mixed-type fields (JSON objects) require `.markModified('fieldName')` before calling `.save()`

---

## 4. Authentication

### How it works

- **No username/password login.** Authentication is Firebase-UID-based.
- On first login, pass `uid` (Firebase UID), `email`, and `name`. The backend does a `findOrCreate` — creating the user if they don't exist.
- A **JWT token** is returned containing `{ id, uid }`.
- All protected routes require the header: `Authorization: Bearer <token>`
- JWT expiry: **30 days**

### Auth Middleware (`src/middleware/auth.js`)

Reads `Authorization` header, verifies JWT, looks up user by `decoded.id`, attaches `req.user` (full User record) to the request.

---

## 5. Models

> All models have auto-managed `created_at` and `updated_at` (TIMESTAMP) columns.

---

### 5.1 User

**Table:** `Hisabi.users`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key, auto-increment |
| `uid` | STRING | **YES** | — | Firebase UID, unique |
| `email` | STRING | **YES** | — | |
| `name` | STRING | **YES** | — | |
| `dob` | DATEONLY | no | null | Date of birth |
| `gender` | STRING | no | null | Enum: `'m'` or `'f'` |
| `settings` | JSONB | **YES** | (see §8) | Nested preferences & goals |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraints:** `uid`

**Associations:**
- `hasMany` QuranReading
- `hasOne` QuranProgress
- `hasOne` QuranMemorization
- `hasMany` PrayerTracking
- `hasMany` DhikrTracking
- `hasMany` FastingDay
- `hasOne` DuaMemorization
- `hasMany` PeriodTracking
- `hasMany` Streak
- `hasMany` ActivityLog
- `hasMany` Group (as `adminGroups`, via `admin_id`)

---

### 5.2 ActivityLog

**Table:** `Hisabi.activity_logs`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id |
| `date` | DATEONLY | **YES** | — | |
| `activity_type` | STRING | **YES** | — | e.g. `'dhikr'`, `'prayer'`, `'quran_reading'`, `'quran_memorization'`, `'dua_memorization'`, `'fasting'` |
| `details` | JSONB | no | `{}` | Activity-specific data |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Associations:**
- `belongsTo` User

**Note:** This table is write-only from controllers. It is used for audit/history. Created automatically whenever any activity is logged.

**`details` shape by activity_type:**
```js
// dhikr
{ dhikr_type: "subhanallah", count: 33 }

// prayer
{ prayer_type: "fardh", prayer_name: "fajr", completed: true }
{ prayer_type: "sunnah", prayer_name: "fajr", count: 2 }

// quran_reading
{ page: 5 }

// quran_memorization
{ ayah_key: "2:255" }

// dua_memorization
{ dua_id: "dua_001" }

// fasting
{ fasting_type: "ramadan", status: "completed" }
```

---

### 5.3 DhikrTracking

**Table:** `Hisabi.dhikr_tracking`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id |
| `date` | DATEONLY | **YES** | — | |
| `dhikr_counts` | JSONB | **YES** | `{}` | Map of `dhikr_type → count` |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `(user_id, date)` — one record per user per day

**`dhikr_counts` shape:**
```json
{
  "subhanallah": 33,
  "alhamdulillah": 33,
  "allahuakbar": 34
}
```

---

### 5.4 DuaMemorization

**Table:** `Hisabi.dua_memorization`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id, unique |
| `memorized_duas` | JSONB | **YES** | `[]` | Array of memorized dua objects |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `user_id` — one record per user (singleton per user)

**`memorized_duas` item shape:**
```json
{
  "dua_id": "dua_001",
  "memorized_at": "2025-01-15T10:30:00.000Z"
}
```

---

### 5.5 FastingDay

**Table:** `Hisabi.fasting_days`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id |
| `date` | DATEONLY | **YES** | — | |
| `fasting_type` | STRING | no | null | e.g. `'ramadan'`, `'monday'`, `'arafah'`, `'ashura'` |
| `status` | STRING | **YES** | `'completed'` | Enum: `'completed'`, `'broken'`, `'in_progress'` |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `(user_id, date)` — one record per user per day

---

### 5.6 Group

**Table:** `Hisabi.groups`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `name` | STRING | **YES** | — | Group display name |
| `users` | ARRAY(INTEGER) | **YES** | `[]` | Array of user IDs (members) |
| `group_id` | STRING(6) | **YES** | — | 6-char alphanumeric invite code, unique |
| `admin_id` | INTEGER | **YES** | — | FK → users.id |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `group_id`

**Associations:**
- `belongsTo` User (as `admin`)
- `hasMany` GroupActivity

---

### 5.7 GroupActivity

**Table:** `Hisabi.group_activities`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `group_id` | INTEGER | **YES** | — | FK → groups.id |
| `activity_type` | STRING | **YES** | — | Enum: `'daily'`, `'weekly'`, `'monthly'`, `'recurring'` |
| `activity_name` | STRING | **YES** | — | |
| `description` | TEXT | no | null | |
| `date` | DATE (TIMESTAMP) | **YES** | — | Activity date/time |
| `user_status` | JSONB | **YES** | `[]` | Array of per-user status objects |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Associations:**
- `belongsTo` Group

**`user_status` item shape:**
```json
{
  "user": 42,
  "status": "completed",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```
> `status` starts as `""` (empty string). Members update it to any string (e.g. `"completed"`, `"missed"`).

---

### 5.8 PeriodTracking

**Table:** `Hisabi.period_tracking`

> Female-only feature. Access is denied with HTTP 403 if `user.gender !== 'f'`.

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id |
| `start_date` | DATEONLY | **YES** | — | |
| `end_date` | DATEONLY | **YES** | — | Must be >= start_date |
| `notes` | TEXT | no | null | |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Business rule:** Overlapping date ranges are rejected (400 error).

---

### 5.9 PrayerTracking

**Table:** `Hisabi.prayer_tracking`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id |
| `date` | DATEONLY | **YES** | — | |
| `fardh_prayers` | JSONB | **YES** | `{}` | Map of prayer name → boolean + mode |
| `sunnah_prayers` | JSONB | **YES** | `{}` | Map of prayer name → count |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `(user_id, date)` — one record per user per day

**`fardh_prayers` shape:**
```json
{
  "fajr": true,
  "fajr_m": "j",
  "dhuhr": true,
  "dhuhr_m": "ot",
  "asr": false,
  "maghrib": true,
  "maghrib_m": "l",
  "isha": false
}
```
> `_m` suffix holds the mode: `"j"` (jamaat), `"ot"` (on time), `"l"` (late). Only set when `completed = true`.

**`sunnah_prayers` shape:**
```json
{
  "fajr": 2,
  "dhuhr": 4,
  "asr": 0,
  "maghrib": 2,
  "isha": 2
}
```

**Standard fardh prayer names:** `fajr`, `dhuhr`, `asr`, `maghrib`, `isha`

---

### 5.10 QuranMemorization

**Table:** `Hisabi.quran_memorization`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id, unique |
| `next_ayah_to_memorize` | STRING | **YES** | `'1:1'` | Format: `"surah:ayah"` |
| `memorized_ayahs` | JSONB | **YES** | `[]` | Array of memorized ayah objects |
| `memorization_goals` | JSONB | **YES** | `[]` | Array of goal objects |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `user_id` — one record per user

**Ayah key format:** `"surah_number:ayah_number"` e.g. `"2:255"` (Ayat al-Kursi)

**`memorized_ayahs` item shape:**
```json
{
  "ayah_key": "1:1",
  "memorized_at": "2025-01-15T10:30:00.000Z"
}
```

**`memorization_goals` item shape:**
```json
{
  "id": "uuid-v4",
  "surah_number": 2,
  "from_ayah": 255,
  "to_ayah": 257,
  "deadline": "2025-03-01T00:00:00.000Z",
  "created_at": "2025-01-15T10:30:00.000Z",
  "completed": false
}
```

---

### 5.11 QuranProgress

**Table:** `Hisabi.quran_progress`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id, unique |
| `khatms_completed` | INTEGER | **YES** | `0` | Number of full Quran completions |
| `last_reset_date` | DATE | no | null | Timestamp of last khatm reset |
| `last_completed_date` | DATE | no | null | Timestamp of last khatm completion |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `user_id` — one record per user

**Note:** The Quran has 604 pages. Reading all 604 unique pages = one khatm. Progress is tracked by reading sessions in `QuranReading` since the last `last_reset_date`.

---

### 5.12 QuranReading

**Table:** `Hisabi.quran_readings`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id |
| `date` | DATEONLY | **YES** | — | |
| `pages_read` | JSONB | **YES** | `[]` | Array of page numbers (integers 1–604) |
| `last_read_page` | INTEGER | no | null | Last page read (1–604) |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `(user_id, date)` — one record per user per day

**`pages_read` shape:**
```json
[1, 2, 3, 15, 16]
```

---

### 5.13 Streak

**Table:** `Hisabi.streaks`

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | auto | — | Primary key |
| `user_id` | INTEGER | **YES** | — | FK → users.id |
| `streak_type` | STRING | **YES** | — | See §10 for valid types |
| `current_streak` | INTEGER | **YES** | `0` | Current active streak (days) |
| `longest_streak` | INTEGER | **YES** | `0` | All-time longest streak (days) |
| `last_activity_date` | DATE | no | null | Last date activity was recorded |
| `streak_broken_date` | DATE | no | null | Date the streak was broken (used as floor for recalculation) |
| `created_at` | TIMESTAMP | auto | — | |
| `updated_at` | TIMESTAMP | auto | — | |

**Unique constraint:** `(user_id, streak_type)` — one streak record per type per user

---

## 6. API Endpoints

**Base URL:** `/api`

> All routes marked 🔒 require `Authorization: Bearer <token>` header.

---

### 6.1 Auth — `/api/auth`

#### `POST /api/auth/login`

No auth required. Creates user if first time, returns JWT.

**Request body:**
```json
{
  "uid": "firebase-uid-string",
  "email": "user@example.com",
  "name": "Abdullah"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "name": "Abdullah",
    "email": "user@example.com",
    "gender": null,
    "dob": null
  }
}
```

**Errors:**
- `400` — Missing required fields (`uid`, `email`, `name`)
- `400` — Account information mismatch (email or name doesn't match existing record for that UID)
- `500` — Server error

---

### 6.2 User — `/api/user`

All routes 🔒

#### `GET /api/user/profile`

Get current user profile.

**Response 200:**
```json
{
  "id": 1,
  "name": "Abdullah",
  "email": "user@example.com",
  "dob": "1995-06-15",
  "gender": "m",
  "settings": { ... }
}
```

---

#### `PUT /api/user/profile`

Update user profile fields. All body fields are optional.

**Request body (all optional):**
```json
{
  "name": "Abdullah Al-Rashid",
  "email": "new@example.com",
  "dob": "1995-06-15",
  "gender": "f"
}
```

**Notes:**
- `gender` must be `"m"` or `"f"` (ignored otherwise)
- Setting `gender` to `"f"` auto-adds `female_settings` to user settings:
  ```json
  {
    "period_tracking": true,
    "maintain_streaks_during_period": true
  }
  ```
- Switching from `"f"` back to `"m"` removes `female_settings`

**Response 200:**
```json
{
  "id": 1,
  "name": "Abdullah Al-Rashid",
  "email": "new@example.com",
  "dob": "1995-06-15",
  "gender": "f"
}
```

---

#### `GET /api/user/settings`

Get user settings object (full JSONB blob).

**Response 200:** Returns the `settings` object directly (see §8).

---

#### `PUT /api/user/settings`

Deep-merge specific settings sections. Only the sections you send are updated.

**Request body:**
```json
{
  "settings": {
    "fasting_preferences": { "weekly_days": [0, 3] },
    "goals": { "quran_pages": 5 },
    "notification_settings": { "prayer_reminders": true },
    "theme_settings": { "dark_mode": true },
    "other_settings": { "timezone": "Asia/Dubai" },
    "female_settings": { "maintain_streaks_during_period": false },
    "prayer_preferences": { "sunnah_prayers": ["fajr", "dhuhr"] }
  }
}
```

> Each section is merged (not replaced) with the existing value.

**Response 200:** Returns updated settings object.

**Errors:**
- `400` — `settings` object is required

---

#### `DELETE /api/user/settings`

Remove specific keys from settings by dot-path.

**Request body:**
```json
{
  "keys": ["goals.quran_pages", "notification_settings.prayer_reminders"]
}
```

**Response 200:** Returns updated settings object.

**Errors:**
- `400` — `keys` array is required

---

#### `DELETE /api/user/account`

Permanently delete user account (cascade deletes all related records).

**Request body:**
```json
{
  "confirmationToken": "firebase-uid-of-user"
}
```

> The `confirmationToken` must match the user's own `uid`.

**Response 200:**
```json
{ "message": "User account deleted successfully" }
```

**Errors:**
- `400` — Confirmation token is required
- `400` — Invalid confirmation token

---

### 6.3 Activity — `/api/activity`

All routes 🔒

#### `GET /api/activity`

Get aggregated today's activity progress across all modules.

**Query params (all optional):**
| Param | Type | Description |
|---|---|---|
| `date` | string (YYYY-MM-DD) | Defaults to today |

**Response 200:**
```json
{
  "date": "2025-01-15",
  "prayers": {
    "fardh": { "fajr": true, "fajr_m": "j", "dhuhr": false },
    "sunnah": { "fajr": 2 }
  },
  "quran": {
    "pages_read": [1, 2, 3],
    "pages_count": 3,
    "memorized_ayahs": ["1:1", "1:2"]
  },
  "dhikr": {
    "counts": { "subhanallah": 33 },
    "total": 33
  },
  "fasting": {
    "type": "monday",
    "status": "completed"
  },
  "duas": ["dua_001", "dua_002"],
  "streaks": {
    "prayer": { "current": 5, "longest": 10 },
    "quran_reading": { "current": 3, "longest": 7 }
  },
  "is_period": false
}
```

> `is_period` is only meaningful for female users (`gender === 'f'`). For males it is always `false`.
> `fasting` is `null` if not fasting that day.

---

#### `GET /api/activity/calendar`

Get boolean activity flags per day for a date range or month.

**Query params (use one set):**

Option A:
| Param | Type | Required |
|---|---|---|
| `start_date` | YYYY-MM-DD | YES |
| `end_date` | YYYY-MM-DD | YES |

Option B:
| Param | Type | Required |
|---|---|---|
| `year` | integer | YES |
| `month` | integer (1–12) | YES |

**Response 200:**
```json
{
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "year": 2025,
  "month": 1,
  "activity_days": {
    "2025-01-01": { "prayer": true, "quran": true, "dhikr": false, "fasting": true },
    "2025-01-02": { "prayer": true, "quran": false, "dhikr": true, "fasting": false }
  }
}
```

**Errors:**
- `400` — Either `start_date` & `end_date`, or `year` & `month` are required

---

### 6.4 Prayers — `/api/prayers`

All routes 🔒

#### `GET /api/prayers`

Get prayer tracking for a date.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `date` | YYYY-MM-DD | Defaults to today |

**Response 200:**
```json
{
  "date": "2025-01-15",
  "fardh_prayers": { "fajr": true, "fajr_m": "j", "dhuhr": false },
  "sunnah_prayers": { "fajr": 2, "dhuhr": 4 }
}
```

> Returns empty objects if no record exists yet for that date.

---

#### `POST /api/prayers/fardh`

Mark a fardh prayer as completed or not.

**Request body:**
```json
{
  "prayer_name": "fajr",
  "completed": true,
  "mode": "j",
  "date": "2025-01-15"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `prayer_name` | string | **YES** | `fajr`, `dhuhr`, `asr`, `maghrib`, `isha` |
| `completed` | boolean | **YES** | |
| `mode` | string | no | `"j"` (jamaat), `"ot"` (on time), `"l"` (late). Ignored if `completed` is false |
| `date` | YYYY-MM-DD | no | Defaults to today |

**Response 200:**
```json
{
  "success": true,
  "date": "2025-01-15",
  "fardh_prayers": { "fajr": true, "fajr_m": "j" }
}
```

**Side effects:** Triggers async streak update for `prayer` and `combined`.

---

#### `POST /api/prayers/sunnah`

Update sunnah prayer count.

**Request body:**
```json
{
  "prayer_name": "fajr",
  "count": 2,
  "date": "2025-01-15"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `prayer_name` | string | **YES** | |
| `count` | integer | **YES** | Must be >= 0 |
| `date` | YYYY-MM-DD | no | Defaults to today |

**Response 200:**
```json
{
  "success": true,
  "date": "2025-01-15",
  "sunnah_prayers": { "fajr": 2 }
}
```

**Side effects:** Triggers async streak update for `prayer` and `combined`.

---

#### `GET /api/prayers/analysis`

Get fardh prayer statistics (completion %, jamaat %, etc.) for a date range.

**Query params (use one set):**

Option A: `start_date` + `end_date` (YYYY-MM-DD)
Option B: `year` + `month` (integers)

**Response 200:**
```json
{
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "year": 2025,
  "month": 1,
  "analysis": {
    "overall": {
      "total_prayers": 155,
      "completed": 120,
      "jamaat": 40,
      "ontime": 60,
      "late": 20,
      "missed": 35,
      "percentages": { "jamaat": 26, "ontime": 39, "late": 13, "missed": 23 }
    },
    "prayers": {
      "fajr": {
        "total": 31,
        "completed": 20,
        "jamaat": 5,
        "ontime": 10,
        "late": 5,
        "missed": 11,
        "percentages": { "jamaat": 16, "ontime": 32, "late": 16, "missed": 35 }
      },
      "dhuhr": { ... },
      "asr": { ... },
      "maghrib": { ... },
      "isha": { ... }
    }
  }
}
```

---

### 6.5 Dhikr — `/api/dhikr`

All routes 🔒

#### `GET /api/dhikr`

Get dhikr counts for a date.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `date` | YYYY-MM-DD | Defaults to today |

**Response 200:**
```json
{
  "date": "2025-01-15",
  "dhikr_counts": { "subhanallah": 33, "alhamdulillah": 33 },
  "total_count": 66
}
```

> Returns `{ date, dhikr_counts: {} }` if no record exists yet.

---

#### `POST /api/dhikr`

Update dhikr counts (merged into existing counts for that day).

**Request body:**
```json
{
  "dhikr_counts": {
    "subhanallah": 33,
    "allahuakbar": 34
  },
  "date": "2025-01-15"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `dhikr_counts` | object | **YES** | Key → positive integer count. All values must be > 0 |
| `date` | YYYY-MM-DD | no | Defaults to today |

**Response 200:**
```json
{
  "success": true,
  "date": "2025-01-15",
  "dhikr_counts": { "subhanallah": 33, "allahuakbar": 34 },
  "total_count": 67
}
```

**Side effects:** Triggers async streak update for `dhikr` and `combined`.

---

### 6.6 Duas — `/api/duas`

All routes 🔒

#### `GET /api/duas/memorization`

Get all memorized duas for current user.

**Response 200:**
```json
{
  "memorized_duas": [
    { "dua_id": "dua_001", "memorized_at": "2025-01-15T10:30:00.000Z" }
  ]
}
```

---

#### `POST /api/duas/memorization`

Add a dua to the memorized list. Duplicate dua_ids are silently ignored.

**Request body:**
```json
{ "dua_id": "dua_001" }
```

| Field | Type | Required |
|---|---|---|
| `dua_id` | string | **YES** |

**Response 200:**
```json
{
  "success": true,
  "memorized_duas": [
    { "dua_id": "dua_001", "memorized_at": "2025-01-15T10:30:00.000Z" }
  ]
}
```

---

#### `DELETE /api/duas/memorization/:dua_id`

Remove a dua from the memorized list.

**Path param:** `dua_id` (string)

**Response 200:**
```json
{
  "success": true,
  "memorized_duas": []
}
```

**Errors:**
- `404` — No memorization record found
- `404` — Dua not found in memorized list

---

#### `POST /api/duas/memorization/reset`

Reset all memorized duas (clears the list).

**Response 200:**
```json
{
  "success": true,
  "message": "Dua memorization reset successfully"
}
```

---

### 6.7 Fasting — `/api/fasting`

All routes 🔒

#### `GET /api/fasting`

Get fasting status for a date.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `date` | YYYY-MM-DD | Defaults to today |

**Response 200 (fasting):**
```json
{
  "date": "2025-01-15",
  "is_fasting": true,
  "fasting_type": "monday",
  "status": "completed"
}
```

**Response 200 (not fasting):**
```json
{
  "date": "2025-01-15",
  "is_fasting": false,
  "fasting_type": null,
  "status": null
}
```

---

#### `POST /api/fasting`

Create or update fasting record for a date.

**Request body:**
```json
{
  "fasting_type": "ramadan",
  "status": "completed",
  "date": "2025-01-15"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `fasting_type` | string | **YES** | Any string — `"ramadan"`, `"monday"`, `"arafah"`, `"ashura"`, etc. |
| `status` | string | **YES** | Enum: `"completed"`, `"broken"`, `"in_progress"` |
| `date` | YYYY-MM-DD | no | Defaults to today |

**Response 200:**
```json
{
  "success": true,
  "date": "2025-01-15",
  "is_fasting": true,
  "fasting_type": "ramadan",
  "status": "completed"
}
```

---

#### `DELETE /api/fasting/:date`

Remove fasting record for a specific date.

**Path param:** `date` (YYYY-MM-DD)

**Response 200:**
```json
{
  "success": true,
  "message": "Fasting record removed successfully"
}
```

**Errors:**
- `404` — No fasting record found for the date

---

#### `GET /api/fasting/history`

Get fasting history (optionally filtered by date range).

**Query params (all optional):**
| Param | Type | Description |
|---|---|---|
| `start_date` | YYYY-MM-DD | Inclusive start |
| `end_date` | YYYY-MM-DD | Inclusive end |

> If neither is provided, returns ALL fasting records (sorted DESC by date).

**Response 200:**
```json
{
  "fasting_days": [
    { "date": "2025-01-15", "fasting_type": "monday", "status": "completed" },
    { "date": "2025-01-12", "fasting_type": "thursday", "status": "broken" }
  ]
}
```

---

### 6.8 Quran — `/api/quran`

All routes 🔒

#### `GET /api/quran/reading`

Get current Quran reading progress (khatm tracker).

**Response 200:**
```json
{
  "khatms_completed": 2,
  "last_reset_date": "2024-12-01T00:00:00.000Z",
  "last_completed_date": "2024-11-30T00:00:00.000Z",
  "last_read_page": 150,
  "pages_read": [1, 2, 3, 150],
  "total_pages_read": 4,
  "percentage_completed": 1
}
```

> `pages_read` is the deduplicated list of all pages read **since** `last_reset_date`.

---

#### `POST /api/quran/reading`

Add a page to today's reading. Duplicate pages (already read today) are silently ignored.

**Request body:**
```json
{ "page": 5 }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `page` | integer | **YES** | 1–604 |

**Response 200:**
```json
{
  "success": true,
  "pages_read": [1, 2, 3, 5],
  "last_read_page": 5
}
```

**Side effects:** Triggers async streak update for `quran_reading` and `combined`.

---

#### `DELETE /api/quran/reading/:page`

Remove a page from today's reading.

**Path param:** `page` (integer, 1–604)

**Response 200:**
```json
{
  "success": true,
  "pages_read": [1, 2, 3],
  "last_read_page": 3
}
```

**Errors:**
- `404` — No reading found for today
- `404` — Page not found in today's reading

---

#### `POST /api/quran/reading/progress`

Manage khatm progress — check completion or reset.

**Request body:**
```json
{ "action": "check_completion" }
```

or

```json
{ "action": "reset" }
```

**`action: "check_completion"` response (complete):**
```json
{
  "success": true,
  "is_complete": true,
  "message": "Quran reading complete!"
}
```

**`action: "check_completion"` response (incomplete):**
```json
{
  "success": true,
  "is_complete": false,
  "remaining_pages": [10, 11, 50, 51],
  "remaining_pages_count": 4
}
```

**`action: "reset"` response:**
```json
{
  "success": true,
  "reset": true,
  "is_complete": true,
  "khatms_completed": 3
}
```

> If all 604 pages are read when `reset` is called, `khatms_completed` is incremented and `last_completed_date` is set.

**Errors:**
- `404` — No progress record found
- `400` — Invalid action specified

---

#### `GET /api/quran/memorization`

Get Quran memorization data.

**Response 200:**
```json
{
  "memorized_ayahs": [
    { "ayah_key": "1:1", "memorized_at": "2025-01-15T10:30:00.000Z" }
  ],
  "next_ayah_to_memorize": "1:2"
}
```

---

#### `POST /api/quran/memorization/memorized`

Add an ayah to the memorized list. Auto-advances `next_ayah_to_memorize`. Duplicate ayahs are silently ignored.

**Request body:**
```json
{ "ayah_key": "1:1" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `ayah_key` | string | **YES** | Format: `"surah:ayah"` e.g. `"2:255"` |

**Response 200:**
```json
{
  "success": true,
  "memorized_ayahs": [{ "ayah_key": "1:1", "memorized_at": "..." }],
  "next_ayah_to_memorize": "1:2"
}
```

**Side effect:** Async check & update of memorization goals completion status.

**Errors:**
- `400` — Invalid ayah key format (must match `/^\d+:\d+$/`)
- `400` — Invalid surah number
- `400` — Invalid ayah number for this surah

---

#### `DELETE /api/quran/memorization/:ayah_key`

Remove an ayah from the memorized list.

**Path param:** `ayah_key` (e.g. `1:1` — URL encode the colon if needed)

**Response 200:**
```json
{
  "success": true,
  "memorized_ayahs": []
}
```

**Errors:**
- `404` — No memorization record found
- `404` — Ayah not found in memorized list

---

#### `POST /api/quran/memorization/next-ayah`

Manually set `next_ayah_to_memorize`.

**Request body:**
```json
{ "ayah_key": "36:1" }
```

**Response 200:**
```json
{
  "success": true,
  "next_ayah_to_memorize": "36:1"
}
```

---

#### `POST /api/quran/memorization/reset`

Reset all Quran memorization (clears list, resets next ayah to `1:1`).

**Response 200:**
```json
{
  "success": true,
  "message": "Memorization reset successfully"
}
```

---

### 6.9 Periods — `/api/periods`

All routes 🔒 and female-only (403 if gender is not `'f'`)

#### `GET /api/periods`

Get all period records (sorted newest first).

**Response 200:**
```json
{
  "periods": [
    { "id": 1, "start_date": "2025-01-10", "end_date": "2025-01-15", "notes": "mild cramps" }
  ]
}
```

---

#### `POST /api/periods`

Add a period record. Overlapping date ranges are rejected.

**Request body:**
```json
{
  "start_date": "2025-01-10",
  "end_date": "2025-01-15",
  "notes": "mild cramps"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `start_date` | YYYY-MM-DD | **YES** | |
| `end_date` | YYYY-MM-DD | **YES** | Must be >= start_date |
| `notes` | string | no | |

**Response 200:**
```json
{
  "success": true,
  "period": { "id": 1, "start_date": "2025-01-10", "end_date": "2025-01-15", "notes": "mild cramps" }
}
```

**Errors:**
- `400` — Start date and end date required
- `400` — Start date cannot be after end date
- `400` — New period overlaps with existing period
- `403` — Female-only feature

---

#### `PUT /api/periods/:id`

Update a period record. All body fields are optional.

**Path param:** `id` (integer)

**Request body (all optional):**
```json
{
  "start_date": "2025-01-10",
  "end_date": "2025-01-16",
  "notes": "updated notes"
}
```

**Response 200:**
```json
{
  "success": true,
  "period": { "id": 1, "start_date": "2025-01-10", "end_date": "2025-01-16", "notes": "updated notes" }
}
```

**Errors:**
- `404` — Period record not found
- `400` — Start date cannot be after end date
- `403` — Female-only feature

---

#### `DELETE /api/periods/:id`

Delete a period record.

**Path param:** `id` (integer)

**Response 200:**
```json
{
  "success": true,
  "message": "Period record removed successfully"
}
```

**Errors:**
- `404` — Period record not found
- `403` — Female-only feature

---

### 6.10 Streaks — `/api/streaks`

All routes 🔒

#### `GET /api/streaks`

Get all streak records for current user.

**Response 200:**
```json
{
  "prayer": { "current": 5, "longest": 12, "lastDate": "2025-01-15T00:00:00.000Z" },
  "quran_reading": { "current": 3, "longest": 8, "lastDate": "2025-01-15T00:00:00.000Z" },
  "dhikr": { "current": 0, "longest": 4, "lastDate": "2025-01-12T00:00:00.000Z" },
  "combined": { "current": 3, "longest": 6, "lastDate": "2025-01-15T00:00:00.000Z" }
}
```

---

#### `GET /api/streaks/:type`

Get a single streak by type.

**Path param:** `type` — see §10

**Response 200:**
```json
{
  "type": "prayer",
  "current_streak": 5,
  "longest_streak": 12,
  "last_activity_date": "2025-01-15T00:00:00.000Z"
}
```

---

#### `POST /api/streaks/update`

Force recalculate and update all streaks for current user.

**Response 200:**
```json
{
  "prayer": { "current": 5, "longest": 12, "lastDate": "..." },
  "quran": { "current": 3, "longest": 8, "lastDate": "..." },
  "dhikr": { "current": 2, "longest": 4, "lastDate": "..." },
  "combined": { "current": 3, "longest": 6, "lastDate": "..." }
}
```

---

### 6.11 Goals — `/api/goals`

All routes 🔒

#### `GET /api/goals/settings`

Get current daily goal targets.

**Response 200:**
```json
{
  "quran_pages": 2,
  "quran_ayahs": 1,
  "dhikr_count": 10,
  "sunnah_prayers": 4
}
```

---

#### `PUT /api/goals/settings`

Update daily goal targets.

**Request body:**
```json
{
  "goals": {
    "quran_pages": 5,
    "dhikr_count": 33
  }
}
```

> Merged with existing goals (only provided keys are updated).

**Response 200:** Returns updated goals object.

**Errors:**
- `400` — `goals` object is required

---

#### `DELETE /api/goals/settings`

Remove specific goal keys.

**Request body:**
```json
{ "keys": ["quran_ayahs"] }
```

**Response 200:** Returns updated goals object.

---

#### `GET /api/goals/progress`

Get today's goal completion progress.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `date` | YYYY-MM-DD | Defaults to today |

**Response 200:**
```json
{
  "date": "2025-01-15",
  "goals": {
    "quran_pages": 2,
    "quran_ayahs": 1,
    "dhikr_count": 10,
    "sunnah_prayers": 4
  },
  "progress": {
    "quran_pages": { "goal": 2, "current": 3, "completed": true, "percentage": 100 },
    "quran_ayahs": { "goal": 1, "current": 0, "completed": false, "percentage": 0 },
    "dhikr_count": { "goal": 10, "current": 33, "completed": true, "percentage": 100 },
    "sunnah_prayers": { "goal": 4, "current": 2, "completed": false, "percentage": 50 }
  },
  "overall_progress": {
    "total_goals": 4,
    "completed_goals": 2,
    "percentage": 63
  }
}
```

---

#### `GET /api/goals/progress/calendar`

Get goal progress for each day in a date range.

**Query params (use one set):**
Option A: `start_date` + `end_date`
Option B: `year` + `month`

**Response 200:**
```json
{
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "year": 2025,
  "month": 1,
  "goals": { "quran_pages": 2, "quran_ayahs": 1, "dhikr_count": 10, "sunnah_prayers": 4 },
  "goal_progress_days": {
    "2025-01-01": {
      "quran_pages": { "goal": 2, "current": 3, "completed": true, "percentage": 100 },
      "quran_ayahs": { "goal": 1, "current": 1, "completed": true, "percentage": 100 },
      "dhikr_count": { "goal": 10, "current": 0, "completed": false, "percentage": 0 },
      "sunnah_prayers": { "goal": 4, "current": 2, "completed": false, "percentage": 50 },
      "overall_progress": { "total_goals": 4, "completed_goals": 2, "percentage": 63 }
    }
  }
}
```

---

#### `GET /api/goals/memorization`

Get Quran memorization goals.

**Response 200:**
```json
{
  "goals": [
    {
      "id": "uuid",
      "surah_number": 36,
      "from_ayah": 1,
      "to_ayah": 83,
      "deadline": "2025-03-01T00:00:00.000Z",
      "created_at": "2025-01-15T00:00:00.000Z",
      "completed": false
    }
  ]
}
```

---

#### `POST /api/goals/memorization`

Create a new memorization goal.

**Request body:**
```json
{
  "surah_number": 36,
  "from_ayah": 1,
  "to_ayah": 83,
  "deadline": "2025-03-01"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `surah_number` | integer | **YES** | |
| `from_ayah` | integer | **YES** | |
| `to_ayah` | integer | **YES** | Must be >= from_ayah |
| `deadline` | date string | **YES** | |

**Response 201:**
```json
{
  "id": "uuid",
  "surah_number": 36,
  "from_ayah": 1,
  "to_ayah": 83,
  "deadline": "2025-03-01T00:00:00.000Z",
  "created_at": "2025-01-15T00:00:00.000Z",
  "completed": false
}
```

**Errors:**
- `400` — Missing required fields
- `400` — Invalid ayah range (from > to)

---

#### `PUT /api/goals/memorization/:id`

Update a memorization goal.

**Path param:** `id` (UUID)

**Request body (all optional):**
```json
{
  "surah_number": 36,
  "from_ayah": 1,
  "to_ayah": 83,
  "deadline": "2025-04-01",
  "completed": true
}
```

**Response 200:** Returns updated goal object.

**Errors:**
- `404` — No memorization record found
- `404` — Goal not found

---

#### `DELETE /api/goals/memorization/:id`

Delete a memorization goal.

**Path param:** `id` (UUID)

**Response 200:**
```json
{ "success": true }
```

---

#### `GET /api/goals/memorization/progress`

Get progress on all memorization goals.

**Response 200:**
```json
{
  "goals": [...],
  "progress": [
    {
      "goal_id": "uuid",
      "surah_number": 36,
      "from_ayah": 1,
      "to_ayah": 83,
      "deadline": "2025-03-01T00:00:00.000Z",
      "total_ayahs": 83,
      "memorized_count": 10,
      "percentage_completed": 12,
      "is_completed": false,
      "days_remaining": 45
    }
  ]
}
```

---

#### `GET /api/goals/memorization/progress/calendar`

Get per-day memorization goal progress for a date range.

**Query params (use one set):**
Option A: `start_date` + `end_date`
Option B: `year` + `month`

**Response 200:**
```json
{
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "year": 2025,
  "month": 1,
  "goals": [...],
  "daily_progress": {
    "2025-01-15": {
      "average_progress": 12,
      "completed_goals": 0,
      "completed_today": 0,
      "total_goals": 1,
      "goals_progress": [
        {
          "goal_id": "uuid",
          "surah_number": 36,
          "from_ayah": 1,
          "to_ayah": 83,
          "percentage_completed": 12,
          "is_completed": false,
          "completed_today": false
        }
      ]
    }
  }
}
```

---

### 6.12 Groups — `/api/groups`

All routes 🔒

#### `POST /api/groups`

Create a new group. Creator becomes admin and first member. A unique 6-character alphanumeric invite code (`group_id`) is auto-generated.

**Request body:**
```json
{ "name": "Family Halaqa" }
```

| Field | Type | Required |
|---|---|---|
| `name` | string | **YES** |

**Response 201:**
```json
{
  "id": 1,
  "name": "Family Halaqa",
  "group_id": "AB12CD",
  "admin": { "id": 1, "name": "Abdullah", "email": "user@example.com" },
  "users": [1],
  "created_at": "2025-01-15T00:00:00.000Z"
}
```

---

#### `POST /api/groups/join`

Join a group using the invite code.

**Request body:**
```json
{ "group_id": "AB12CD" }
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Family Halaqa",
  "group_id": "AB12CD",
  "admin": { "id": 1, "name": "Abdullah", "email": "user@example.com" },
  "users": [1, 2],
  "joined_at": "2025-01-15T00:00:00.000Z"
}
```

**Errors:**
- `400` — Group ID is required
- `400` — You are already a member of this group
- `404` — Group not found

---

#### `GET /api/groups/my`

Get all groups the current user is a member of.

**Response 200:**
```json
{
  "groups": [
    {
      "id": 1,
      "name": "Family Halaqa",
      "group_id": "AB12CD",
      "admin": { "id": 1, "name": "Abdullah", "email": "user@example.com" },
      "users": [1, 2],
      "is_admin": true,
      "created_at": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

---

#### `POST /api/groups/leave`

Leave a group. Admins cannot leave.

**Request body:**
```json
{ "group_id": "AB12CD" }
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Family Halaqa",
  "group_id": "AB12CD",
  "admin": { ... },
  "users": [1],
  "left_at": "2025-01-15T00:00:00.000Z"
}
```

**Errors:**
- `403` — You are not a member of this group
- `403` — Group admin cannot leave the group
- `404` — Group not found

---

#### `GET /api/groups/members/:group_id`

Get group info and full member list.

**Path param:** `group_id` (6-char invite code, not the database integer id)

**Response 200:**
```json
{
  "id": 1,
  "name": "Family Halaqa",
  "group_id": "AB12CD",
  "admin": { "id": 1, "name": "Abdullah", "email": "user@example.com" },
  "members": [
    { "id": 1, "name": "Abdullah", "email": "user@example.com" },
    { "id": 2, "name": "Fatima", "email": "fatima@example.com" }
  ]
}
```

---

#### `DELETE /api/groups/:group_id`

Delete a group. Admin only.

**Path param:** `group_id` (6-char invite code)

**Response 200:**
```json
{ "success": true }
```

**Errors:**
- `403` — Only group admin can delete the group
- `404` — Group not found

---

### 6.13 Group Activities — `/api/group-activities`

All routes 🔒

#### `POST /api/group-activities`

Create a new activity for a group. Admin only.

**Request body:**
```json
{
  "group_id": 1,
  "activity_type": "daily",
  "activity_name": "Fajr Prayer",
  "description": "Pray fajr together",
  "date": "2025-01-15T05:00:00.000Z"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `group_id` | integer | **YES** | Database ID (integer, not the invite code) |
| `activity_type` | string | **YES** | Enum: `"daily"`, `"weekly"`, `"monthly"`, `"recurring"` |
| `activity_name` | string | **YES** | |
| `description` | string | no | |
| `date` | ISO datetime | **YES** | |

**Response 201:**
```json
{
  "id": 1,
  "group_id": 1,
  "activity_type": "daily",
  "activity_name": "Fajr Prayer",
  "description": "Pray fajr together",
  "date": "2025-01-15T05:00:00.000Z",
  "user_status": [
    { "user": 1, "status": "", "updatedAt": null },
    { "user": 2, "status": "", "updatedAt": null }
  ],
  "created_at": "2025-01-15T00:00:00.000Z"
}
```

**Errors:**
- `400` — Group ID, activity type, activity name, and date are required
- `403` — Only group admin can create activities
- `404` — Group not found

---

#### `GET /api/group-activities/:groupId`

Get all activities for a group. Must be a member to access.

**Path param:** `groupId` (integer database ID)

**Response 200:**
```json
{
  "activities": [
    {
      "id": 1,
      "group_id": 1,
      "activity_type": "daily",
      "activity_name": "Fajr Prayer",
      "description": "Pray fajr together",
      "date": "2025-01-15T05:00:00.000Z",
      "user_status": [
        { "user": 42, "status": "completed", "updatedAt": "2025-01-15T05:30:00.000Z" }
      ],
      "created_at": "..."
    }
  ],
  "is_admin": true
}
```

> **Note:** If the requester is NOT admin, `user_status` only contains their own entry. If admin, all members' statuses are returned.

**Errors:**
- `403` — You are not a member of this group
- `404` — Group not found

---

#### `PATCH /api/group-activities/:activityId/status`

Update current user's status for an activity.

**Path param:** `activityId` (integer)

**Request body:**
```json
{ "status": "completed" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | string | **YES** | Any non-empty string |

**Response 200:**
```json
{
  "id": 1,
  "activity_name": "Fajr Prayer",
  "my_status": {
    "user": 42,
    "status": "completed",
    "updatedAt": "2025-01-15T05:30:00.000Z"
  }
}
```

**Errors:**
- `400` — Status is required
- `403` — You are not a member of this group
- `404` — Activity not found

---

#### `PUT /api/group-activities/:activityId`

Edit a group activity. Admin only. At least one field must be provided.

**Path param:** `activityId` (integer)

**Request body (all optional):**
```json
{
  "activity_type": "weekly",
  "activity_name": "Fajr Prayer (updated)",
  "description": "Updated description",
  "date": "2025-01-22T05:00:00.000Z"
}
```

**Response 200:** Returns updated activity object (same shape as POST response).

**Errors:**
- `400` — At least one field is required to update
- `400` — Invalid activity type
- `400` — Activity name is required (if provided but empty)
- `400` — Invalid date
- `403` — Only group admin can edit activities
- `404` — Activity not found

---

#### `DELETE /api/group-activities/:activityId`

Delete a group activity. Admin only.

**Path param:** `activityId` (integer)

**Response 200:**
```json
{ "success": true }
```

**Errors:**
- `403` — Only group admin can delete activities
- `404` — Activity not found

---

## 7. Middleware

### Auth Middleware

File: `src/middleware/auth.js`

- Reads `Authorization: Bearer <token>` header
- Returns 401 if header is missing, malformed, empty, expired, or invalid
- Looks up user by `decoded.id` from JWT payload
- Returns 401 if user not found in DB
- Attaches full User model instance to `req.user`

### Error Handler

File: `src/middleware/errorHandler.js`

Global Express error handler. Catches:
- Mongoose `ValidationError` → 400
- Mongoose duplicate key error (`code 11000`) → 400
- Everything else → 500

---

## 8. Settings Structure

The `User.settings` JSONB column stores all user preferences. Default value at creation:

```json
{
  "fasting_preferences": {
    "hijri_dates": [
      { "month": 9, "dates": [] },
      { "month": 12, "dates": [9] },
      { "month": 1, "dates": [9, 10] }
    ],
    "weekly_days": [1, 4]
  },
  "goals": {
    "quran_pages": 2,
    "quran_ayahs": 1,
    "dhikr_count": 10,
    "sunnah_prayers": 4
  },
  "prayer_preferences": {
    "sunnah_prayers": []
  },
  "my_duas": [],
  "other_settings": {
    "timezone": "Asia/Kolkata"
  }
}
```

**Additional sections (populated dynamically):**

```json
{
  "female_settings": {
    "period_tracking": true,
    "maintain_streaks_during_period": true
  },
  "notification_settings": {},
  "theme_settings": {}
}
```

**fasting_preferences notes:**
- `weekly_days`: Array of weekday numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
- Default `[1, 4]` = Monday + Thursday (classic sunnah fasts)
- `hijri_dates`: Array of `{ month, dates }` where `dates: []` means all days in that Hijri month

**goals notes:**
- `quran_pages`: Target pages of Quran to read per day
- `quran_ayahs`: Target ayahs to memorize per day
- `dhikr_count`: Total dhikr count target per day
- `sunnah_prayers`: Target number of sunnah prayer units per day

---

## 9. JSONB Field Schemas

### Prayer Analysis — Mode values

| Value | Meaning |
|---|---|
| `"j"` | Jamaat (congregation) |
| `"ot"` | On time (individual) |
| `"l"` | Late |

### Fasting — Status values

| Value | Meaning |
|---|---|
| `"completed"` | Fast was completed |
| `"broken"` | Fast was broken |
| `"in_progress"` | Currently fasting |

### GroupActivity — activity_type values

| Value | Meaning |
|---|---|
| `"daily"` | Repeats daily |
| `"weekly"` | Repeats weekly |
| `"monthly"` | Repeats monthly |
| `"recurring"` | Custom recurring |

---

## 10. Streak Types

| Type | Triggered By | Description |
|---|---|---|
| `prayer` | `POST /prayers/fardh` or `/streaks/update` | Days with at least one fardh prayer completed |
| `quran_reading` | `POST /quran/reading` or `/streaks/update` | Days with at least one page read |
| `dhikr` | `POST /dhikr` or `/streaks/update` | Days with any dhikr count > 0 |
| `combined` | Any of the above or `/streaks/update` | Days where prayer OR quran OR dhikr was done |

**Female period grace:** If `female_settings.maintain_streaks_during_period === true`, period days count as valid activity days for all streak calculations (so streaks don't break during menstruation).

**Streak calculation:** Streaks count backward from today continuously. Any day without activity (or period grace) breaks the streak. `streak_broken_date` is used as a floor to avoid re-scanning the entire history.

**Automatic updates:** Streaks are updated asynchronously (via `streakQueueService`) whenever a relevant activity is recorded. They can also be manually forced via `POST /api/streaks/update`.

---

## 11. Model Associations Summary

```
User
 ├── hasMany    QuranReading         (user_id)
 ├── hasOne     QuranProgress        (user_id)
 ├── hasOne     QuranMemorization    (user_id)
 ├── hasMany    PrayerTracking       (user_id)
 ├── hasMany    DhikrTracking        (user_id)
 ├── hasMany    FastingDay           (user_id)
 ├── hasOne     DuaMemorization      (user_id)
 ├── hasMany    PeriodTracking       (user_id)
 ├── hasMany    Streak               (user_id)
 ├── hasMany    ActivityLog          (user_id)
 └── hasMany    Group                (admin_id → as 'adminGroups')

Group
 ├── belongsTo  User                 (admin_id → as 'admin')
 └── hasMany    GroupActivity        (group_id)

GroupActivity
 └── belongsTo  Group               (group_id)

QuranReading   → belongsTo User
QuranProgress  → belongsTo User
QuranMemorization → belongsTo User
PrayerTracking → belongsTo User
DhikrTracking  → belongsTo User
FastingDay     → belongsTo User
DuaMemorization → belongsTo User
PeriodTracking → belongsTo User
Streak         → belongsTo User
ActivityLog    → belongsTo User
```
