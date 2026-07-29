# Hisabi API — Complete Endpoint Reference

> **Base URL:** `http://localhost:4000`
> **Swagger UI:** `GET /api-docs`
> **Health Check:** `GET /health`

---

## Authentication

| Token Type | Header | Obtained From |
|------------|--------|---------------|
| User JWT | `Authorization: Bearer <user_jwt>` | `POST /api/auth/login` |
| Admin JWT | `Authorization: Bearer <admin_jwt>` | `POST /api/admin/login` |

All **User** endpoints require a valid user JWT.
All **Admin** endpoints (except login) require a valid admin JWT.

---

## Table of Contents

1. [Auth](#1-auth)
2. [User Profile & Settings](#2-user-profile--settings)
3. [Activity / Progress Dashboard](#3-activity--progress-dashboard)
4. [Prayer Tracking](#4-prayer-tracking)
5. [Dhikr Tracking](#5-dhikr-tracking)
6. [Dua Memorization](#6-dua-memorization)
7. [Fasting Tracking](#7-fasting-tracking)
8. [Quran Reading](#8-quran-reading)
9. [Quran Memorization](#9-quran-memorization)
10. [Period Tracking](#10-period-tracking)
11. [Streaks](#11-streaks)
12. [Goals](#12-goals)
13. [Groups](#13-groups)
14. [Group Activities](#14-group-activities)
15. [Admin — Authentication](#15-admin--authentication)
16. [Admin — Platform Management](#16-admin--platform-management)
17. [Admin — Content Management](#17-admin--content-management)
18. [Admin — Library (Dynamic Categories)](#18-admin--library-dynamic-categories)
19. [Admin — Special Models (Dynamic Schema)](#19-admin--special-models-dynamic-schema)
20. [Admin — Leaderboards / Tracking Stats](#20-admin--leaderboards--tracking-stats)
21. [Admin — Tracking Records](#21-admin--tracking-records)
22. [Content Catalogue (Public)](#22-content-catalogue-public)
23. [Content — Library (Public)](#23-content--library-public)
24. [Content — Special Models (Public)](#24-content--special-models-public)

---

## 1. Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login / register via Firebase UID. Returns JWT + user profile. |

**Request body:**
\`\`\`json
{ "uid": "firebase_uid", "email": "user@example.com", "name": "User Name" }
\`\`\`

**Response:**
\`\`\`json
{ "token": "<jwt>", "user": { ... } }
\`\`\`

---

## 2. User Profile & Settings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/profile` | User | Get current user profile |
| PUT | `/api/user/profile` | User | Update profile (name, email, dob, gender) |
| GET | `/api/user/settings` | User | Get user settings |
| PUT | `/api/user/settings` | User | Update user settings (deep merge) |
| DELETE | `/api/user/settings` | User | Remove specific settings keys (dot-notation path) |
| DELETE | `/api/user/account` | User | Delete account and all associated data permanently |

**PUT /profile body:** `{ name, email, dob, gender }` (all optional)
**PUT /settings body:** any key-value settings object (deep merged)
**DELETE /settings body:** `{ "keys": ["path.to.key"] }`
**DELETE /account body:** `{ "confirm": true }` — permanently deletes the account and all user data (prayers, streaks, quran progress, dhikr, fasting, groups, etc.)

---

## 3. Activity / Progress Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/activity` | User | Today's progress snapshot (prayers, quran, dhikr, fasting, streaks, memorization, period status) |
| GET | `/api/activity/calendar` | User | Activity calendar — boolean flags per day |

**Query params:**
- `?date=YYYY-MM-DD` — defaults to today
- `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — for calendar range

---

## 4. Prayer Tracking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/prayers` | User | Get prayer tracking for a date |
| POST | `/api/prayers/fardh` | User | Update a fardh prayer status |
| POST | `/api/prayers/sunnah` | User | Update sunnah prayer count |
| GET | `/api/prayers/analysis` | User | Fardh prayer analysis (jamaat / on-time / late / missed stats) |

**GET query:** `?date=YYYY-MM-DD`

**POST /fardh body:**
\`\`\`json
{ "prayer": "fajr", "completed": true, "mode": "j" }
\`\`\`
`prayer`: `fajr` | `dhuhr` | `asr` | `maghrib` | `isha`
`mode`: `j` (jamaat) | `ot` (on-time) | `l` (late)

**POST /sunnah body:** `{ "name": "fajr_sunnah", "count": 2 }`

**GET /analysis query:** `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` or `?year=2025&month=1`

---

## 5. Dhikr Tracking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dhikr/types` | User | Get dhikr type catalogue |
| GET | `/api/dhikr` | User | Get dhikr tracking for a date |
| POST | `/api/dhikr` | User | Update dhikr counts (incremental merge) |

**GET query:** `?date=YYYY-MM-DD`

**POST body:**
\`\`\`json
{ "dhikr_counts": { "subhanallah": 33, "alhamdulillah": 33 } }
\`\`\`

---

## 6. Dua Memorization

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/duas/catalogue` | User | Get full dua catalogue |
| GET | `/api/duas/memorization` | User | Get user's memorized duas list |
| POST | `/api/duas/memorization` | User | Add a memorized dua |
| POST | `/api/duas/memorization/reset` | User | Reset all memorized duas |
| DELETE | `/api/duas/memorization/:dua_id` | User | Remove a specific memorized dua |

**POST /memorization body:** `{ "dua_id": "<id>" }`

---

## 7. Fasting Tracking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/fasting/types` | User | Get fasting type catalogue |
| GET | `/api/fasting` | User | Get fasting status for today |
| GET | `/api/fasting/history` | User | Get fasting history |
| POST | `/api/fasting` | User | Update fasting status for a date |
| DELETE | `/api/fasting/:date` | User | Remove a fasting day |

**GET query:** `?date=YYYY-MM-DD`
**GET /history query:** `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

**POST body:**
\`\`\`json
{ "date": "2025-03-01", "fasting_type": "<type_id>", "status": "completed" }
\`\`\`
`status`: `completed` | `broken` | `in_progress`

---

## 8. Quran Reading

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/quran/reading` | User | Reading progress (pages since last reset, khatm %, khatms completed) |
| POST | `/api/quran/reading` | User | Add a read page to today |
| DELETE | `/api/quran/reading/:page` | User | Remove a read page from today |
| POST | `/api/quran/reading/progress` | User | Handle reading progress actions |

**POST /reading body:** `{ "page": 42 }` (1–604)

**POST /reading/progress body:**
\`\`\`json
{ "action": "check_completion" }
\`\`\`
`action`: `check_completion` | `reset`

---

## 9. Quran Memorization

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/quran/memorization` | User | Get memorization data (memorized ayahs, next ayah, goals) |
| POST | `/api/quran/memorization/memorized` | User | Add a memorized ayah |
| DELETE | `/api/quran/memorization/:ayah_key` | User | Remove a memorized ayah |
| POST | `/api/quran/memorization/next-ayah` | User | Set next ayah to memorize |
| POST | `/api/quran/memorization/reset` | User | Reset all memorization data |

**POST /memorized body:** `{ "surah": 2, "ayah": 255 }` or `{ "ayah_key": "2:255" }`
**POST /next-ayah body:** `{ "ayah_key": "2:256" }`

---

## 10. Period Tracking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/periods` | User | Get period history (female users only) |
| POST | `/api/periods` | User | Add a period entry |
| PUT | `/api/periods/:id` | User | Update a period entry |
| DELETE | `/api/periods/:id` | User | Remove a period entry |

**POST / PUT body:** `{ "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "notes": "" }`

---

## 11. Streaks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/streaks` | User | Get all streak types for current user |
| POST | `/api/streaks/update` | User | Recalculate all streaks |
| GET | `/api/streaks/:type` | User | Get a specific streak type |

**Types:** `prayer` | `quran_reading` | `dhikr` | `combined`

---

## 12. Goals

### Daily Goal Settings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/goals/settings` | User | Get goal settings |
| PUT | `/api/goals/settings` | User | Update goal settings |
| DELETE | `/api/goals/settings` | User | Remove specific goal setting keys |

### Daily Goal Progress

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/goals/progress` | User | Get daily goal progress vs targets |
| GET | `/api/goals/progress/calendar` | User | Get goal completion calendar |

**Query:** `?date=YYYY-MM-DD`, `?start_date=&end_date=` for calendar

### Memorization Goals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/goals/memorization` | User | List all memorization goals |
| POST | `/api/goals/memorization` | User | Create a memorization goal |
| PUT | `/api/goals/memorization/:id` | User | Update a memorization goal |
| DELETE | `/api/goals/memorization/:id` | User | Delete a memorization goal |
| GET | `/api/goals/memorization/progress` | User | Get memorization goal progress |
| GET | `/api/goals/memorization/progress/calendar` | User | Get memorization progress calendar |

---

## 13. Groups

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/groups` | User | Create a new group |
| POST | `/api/groups/join` | User | Join a group by 6-char code |
| GET | `/api/groups/my` | User | Get all groups the user belongs to |
| POST | `/api/groups/leave` | User | Leave a group (non-admin only) |
| GET | `/api/groups/members/:group_id` | User | Get group members |
| DELETE | `/api/groups/:group_id` | User | Delete a group (group admin only) |

**POST / body:** `{ "name": "My Group" }`
**POST /join body:** `{ "group_id": "ABC123" }` (6-char code)
**POST /leave body:** `{ "group_id": "ABC123" }`

---

## 14. Group Activities

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/group-activities` | User | Create a group activity (group admin only) |
| GET | `/api/group-activities/:groupId` | User | Get all activities for a group |
| PATCH | `/api/group-activities/:activityId/status` | User | Update own status on an activity |
| PUT | `/api/group-activities/:activityId` | User | Edit a group activity (group admin only) |
| DELETE | `/api/group-activities/:activityId` | User | Delete a group activity (group admin only) |

**POST / body:**
\`\`\`json
{
  "group_id": "ABC123",
  "activity_type": "daily",
  "activity_name": "Fajr Prayer",
  "description": "Complete fajr in jamaat",
  "date": "YYYY-MM-DD"
}
\`\`\`
`activity_type`: `daily` | `weekly` | `monthly` | `recurring`

**PATCH /status body:** `{ "status": "completed" }`
**PUT body:** `{ activity_type, activity_name, description, date }` (all optional)

---

## 15. Admin — Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | None | Admin login with username + password |

**Body:** `{ "username": "admin", "password": "secret" }`
**Response:** `{ "token": "<admin_jwt>", "username": "admin" }`

---

## 16. Admin — Platform Management

### Stats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | Platform-wide statistics (users, groups, activity breakdown, streak averages) |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | Admin | List all users (paginated, searchable) |
| GET | `/api/admin/users/:id` | Admin | User detail (profile, streaks, recent activity) |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user (cascades all related data) |

**Query:** `?page=1&limit=20&search=`

### Groups

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/groups` | Admin | List all groups (paginated) |
| GET | `/api/admin/groups/:id` | Admin | Group detail (members, activities) |
| PATCH | `/api/admin/groups/:id/transfer-admin` | Admin | Transfer group admin to another member |
| GET | `/api/admin/groups/:id/export-activities` | Admin | Export group activities as CSV/JSON |
| DELETE | `/api/admin/groups/:id` | Admin | Delete a group (cascading) |

**Query (list):** `?page=1&limit=20`
**PATCH /transfer-admin body:** `{ "new_admin_id": "<user_id>" }`

### Group Activities (Admin View)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/group-activities` | Admin | List all group activities (paginated, filterable) |
| DELETE | `/api/admin/group-activities/:id` | Admin | Delete a group activity |

**Query:** `?page=1&limit=50&group_id=&activity_type=`

### Activity Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/activity-logs` | Admin | Paginated activity logs with filters |

**Query:** `?page=1&limit=50&user_id=&activity_type=&start_date=&end_date=`

---

## 17. Admin — Content Management

All content resources follow CRUD pattern: `GET` (list), `POST` (create), `PUT /:id` (update), `DELETE /:id` (delete).

**Common query params:** `?page=1&limit=20`

### Duas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/duas` | List duas |
| POST | `/api/admin/duas` | Create a dua |
| PUT | `/api/admin/duas/:id` | Update a dua |
| DELETE | `/api/admin/duas/:id` | Delete a dua |

**Body fields:** `title` (trilingual), `arabic_text`, `transliteration`, `translation` (trilingual), `category_id`, `source`

### Dua Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dua-categories` | List dua categories (tree structure) |
| POST | `/api/admin/dua-categories` | Create a category |
| PUT | `/api/admin/dua-categories/:id` | Update a category |
| DELETE | `/api/admin/dua-categories/:id` | Delete a category |

**Body fields:** `name`, `description`, `parent` (parent category ID, null for top-level)

### Dhikr Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dhikr-categories` | List dhikr categories |
| POST | `/api/admin/dhikr-categories` | Create a category |
| PUT | `/api/admin/dhikr-categories/:id` | Update a category |
| DELETE | `/api/admin/dhikr-categories/:id` | Delete a category |

### Dhikr Types (Adhkar)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dhikr-types` | List dhikr types |
| POST | `/api/admin/dhikr-types` | Create a dhikr type |
| PUT | `/api/admin/dhikr-types/:id` | Update a dhikr type |
| DELETE | `/api/admin/dhikr-types/:id` | Delete a dhikr type |

### Thasbeehs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/thasbeehs` | List thasbeehs |
| POST | `/api/admin/thasbeehs` | Create a tasbeeh |
| PUT | `/api/admin/thasbeehs/:id` | Update a tasbeeh |
| DELETE | `/api/admin/thasbeehs/:id` | Delete a tasbeeh |

### Fasting Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/fasting-types` | List fasting types |
| POST | `/api/admin/fasting-types` | Create a fasting type |
| PUT | `/api/admin/fasting-types/:id` | Update a fasting type |
| DELETE | `/api/admin/fasting-types/:id` | Delete a fasting type |

### Quran Reading Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/quran-reading-content` | List Quran reading content items |
| POST | `/api/admin/quran-reading-content` | Create a content item |
| PUT | `/api/admin/quran-reading-content/:id` | Update a content item |
| DELETE | `/api/admin/quran-reading-content/:id` | Delete a content item |

### Quran Memorization Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/quran-memorization-content` | List Quran memorization content items |
| POST | `/api/admin/quran-memorization-content` | Create a content item |
| PUT | `/api/admin/quran-memorization-content/:id` | Update a content item |
| DELETE | `/api/admin/quran-memorization-content/:id` | Delete a content item |

### Verse Importance _(legacy — use Library)_

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/verse-importance` | List verse importance entries |
| POST | `/api/admin/verse-importance` | Create an entry |
| PUT | `/api/admin/verse-importance/:id` | Update an entry |
| DELETE | `/api/admin/verse-importance/:id` | Delete an entry |

### Dhikr Importance _(legacy — use Library)_

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dhikr-importance` | List dhikr importance entries |
| POST | `/api/admin/dhikr-importance` | Create an entry |
| PUT | `/api/admin/dhikr-importance/:id` | Update an entry |
| DELETE | `/api/admin/dhikr-importance/:id` | Delete an entry |

### Dua Importance _(legacy — use Library)_

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dua-importance` | List dua importance entries |
| POST | `/api/admin/dua-importance` | Create an entry |
| PUT | `/api/admin/dua-importance/:id` | Update an entry |
| DELETE | `/api/admin/dua-importance/:id` | Delete an entry |

> The three importance resources above have been **migrated into the Library system**. Existing data is preserved. Prefer the [Library endpoints](#18-admin--library-dynamic-categories) for all new entries.

### Daily Quotes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/daily-quotes` | List daily quotes |
| POST | `/api/admin/daily-quotes` | Create a quote |
| PUT | `/api/admin/daily-quotes/:id` | Update a quote |
| DELETE | `/api/admin/daily-quotes/:id` | Delete a quote |

### Hadees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/hadees` | List hadees |
| POST | `/api/admin/hadees` | Create a hadees |
| PUT | `/api/admin/hadees/:id` | Update a hadees |
| DELETE | `/api/admin/hadees/:id` | Delete a hadees |

### Hadees Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/hadees-categories` | List hadees categories |
| POST | `/api/admin/hadees-categories` | Create a category |
| PUT | `/api/admin/hadees-categories/:id` | Update a category |
| DELETE | `/api/admin/hadees-categories/:id` | Delete a category |

### Names of Allah

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/names-of-allah` | List names of Allah |
| POST | `/api/admin/names-of-allah` | Create an entry |
| PUT | `/api/admin/names-of-allah/:id` | Update an entry |
| DELETE | `/api/admin/names-of-allah/:id` | Delete an entry |

### Live Links

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/live-links` | List live links |
| POST | `/api/admin/live-links` | Create a live link |
| PUT | `/api/admin/live-links/:id` | Update a live link |
| DELETE | `/api/admin/live-links/:id` | Delete a live link |

**Body fields:** `title`, `url`, `description`, `is_active`

### Ramadan Duas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/ramadan-duas` | List Ramadan duas (paginated, filterable by day) |
| POST | `/api/admin/ramadan-duas` | Create a single Ramadan dua |
| PUT | `/api/admin/ramadan-duas/day/:dayNumber` | **Bulk upsert** — replace all duas for a day atomically |
| PUT | `/api/admin/ramadan-duas/:id` | Update a single Ramadan dua |
| DELETE | `/api/admin/ramadan-duas/:id` | Delete a Ramadan dua |

**GET query params:** `?day=1` (1–30 to filter by day), `?page=1&limit=50`

**POST / PUT /:id body fields:** `day_number` (1–30), `order`, `title`, `arabic_text`, `isQuranicFont`, `count`, `isCountless`, `malayalam`, `english`, `urdu`, `description`

`description` is an object with sub-fields:
```json
{
  "description": {
    "arabic": "...",
    "malayalam": "...",
    "english": "...",
    "urdu": "..."
  }
}
```

**PUT /day/:dayNumber** — Bulk upsert for a single day. Deletes all existing duas for that day, then inserts the new array in order.

**Body:**
```json
{
  "duas": [
    {
      "title": "Dua title",
      "arabic_text": "اللَّهُمَّ",
      "isQuranicFont": false,
      "count": 33,
      "isCountless": false,
      "malayalam": "...",
      "english": "...",
      "urdu": "...",
      "description": { "arabic": "...", "malayalam": "...", "english": "...", "urdu": "..." }
    }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `duas` | Array | **Yes** | Array of dua objects (can be empty to clear the day) |
| `duas[].title` | String | **Yes** | |
| `duas[].arabic_text` | String | **Yes** | |
| `duas[].isQuranicFont` | Boolean | No | Default: `false` |
| `duas[].count` | Number | No | Ignored if `isCountless` is true |
| `duas[].isCountless` | Boolean | No | Default: `false` |
| `duas[].malayalam` | String | No | |
| `duas[].english` | String | No | |
| `duas[].urdu` | String | No | |
| `duas[].description` | Object | No | Sub-fields: `arabic`, `malayalam`, `english`, `urdu` |

**Validation:** `dayNumber` must be 1–30. Returns `400` if out of range or if any entry is missing `title`/`arabic_text`.

### Banners

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/banners` | List all banners |
| POST | `/api/admin/banners` | Create a banner (image upload) |
| PUT | `/api/admin/banners/:id` | Update a banner (image upload) |
| DELETE | `/api/admin/banners/:id` | Delete a banner |

**Request type:** `multipart/form-data`
**Body fields:** `title`, `image` (file), `link`, `is_active`, `start_date`, `end_date`

---

## 18. Admin — Library (Dynamic Categories)

The Library is a unified, dynamic content system replacing the three separate importance models. Admins can create any number of custom categories and add entries to each.

### Library Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/library-categories` | Admin | List all library categories |
| POST | `/api/admin/library-categories` | Admin | Create a new category |
| PUT | `/api/admin/library-categories/:id` | Admin | Update a category |
| DELETE | `/api/admin/library-categories/:id` | Admin | Delete a category and **all its entries** (cascade) |

**GET response:**
\`\`\`json
{
  "categories": [
    {
      "id": "<id>",
      "name": "Dua Importance",
      "slug": "dua-importance",
      "description": "...",
      "icon": "BookHeart",
      "order": 0,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
\`\`\`

**POST / PUT body:**
\`\`\`json
{
  "name": "My Category",
  "description": "Optional description",
  "icon": "BookHeart",
  "order": 0
}
\`\`\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | **Yes** | Unique category name. Slug is auto-generated from name. |
| `description` | String | No | Short description |
| `icon` | String | No | lucide-react icon name (e.g. `BookHeart`, `Sparkles`, `BookOpen`) |
| `order` | Number | No | Display order (ascending). Default: `0` |

---

### Library Entries

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/library-categories/:categoryId/entries` | Admin | List entries in a category (paginated) |
| POST | `/api/admin/library-categories/:categoryId/entries` | Admin | Create a new entry in a category |
| PUT | `/api/admin/library-entries/:id` | Admin | Update an entry |
| DELETE | `/api/admin/library-entries/:id` | Admin | Delete an entry |

**GET query params:** `?page=1&limit=20`

**GET response:**
\`\`\`json
{
  "entries": [ ... ],
  "category": { "id": "...", "name": "Dua Importance", ... },
  "total": 45,
  "page": 1,
  "limit": 20,
  "total_pages": 3
}
\`\`\`

**POST / PUT body:**
\`\`\`json
{
  "title": {
    "malayalam": "ദുആ ചെയ്യുന്നതിന്റെ പ്രാധാന്യം",
    "english": "Importance of Dua",
    "urdu": "دعا کی اہمیت"
  },
  "description": {
    "malayalam": "ദുആ ഇബാദത്തിന്റെ മജ്ജ ആണ്...",
    "english": "Dua is the essence of worship...",
    "urdu": "دعا عبادت کی روح ہے..."
  },
  "content": "اللَّهُمَّ إِنِّي أَسْأَلُكَ",
  "source": "صحيح البخاري"
}
\`\`\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title.malayalam` | String | No | Title in Malayalam |
| `title.english` | String | No | Title in English |
| `title.urdu` | String | No | Title in Urdu |
| `description.malayalam` | String | **Yes** | Malayalam description (required) |
| `description.english` | String | No | English description |
| `description.urdu` | String | No | Urdu description |
| `content` | String | No | Arabic text content (verse / dhikr / dua) |
| `source` | String | No | Arabic source reference (e.g. hadith book name) |

---

## 19. Admin — Special Models (Dynamic Schema)

Special Models is a **flexible, schema-driven content system** where admins define which fields each model uses. Unlike the Library (fixed trilingual title/description), Special Models let admins choose any combination of supported field types per category.

### Special Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/special-categories` | Admin | List all special categories |
| POST | `/api/admin/special-categories` | Admin | Create a new special category |
| PUT | `/api/admin/special-categories/:id` | Admin | Update a special category |
| DELETE | `/api/admin/special-categories/:id` | Admin | Delete category and **all its entries** (cascade) |

**GET response:**
```json
{
  "categories": [
    {
      "id": "<id>",
      "name": "My Custom Model",
      "slug": "my-custom-model",
      "description": "...",
      "icon": "Layers",
      "order": 0,
      "fields": ["title_malayalam", "arabic_text", "count"],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

**POST / PUT body:**
```json
{
  "name": "My Custom Model",
  "description": "Optional description",
  "icon": "Layers",
  "order": 0,
  "fields": ["title_malayalam", "title_english", "arabic_text", "count"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | **Yes** | Unique category name. Slug is auto-generated. |
| `description` | String | No | Short description |
| `icon` | String | No | lucide-react icon name |
| `order` | Number | No | Display order (ascending) |
| `fields` | Array | No | List of enabled field keys for entries (see table below) |

**Supported field keys (`fields` array):**

| Key | Label | Type |
|-----|-------|------|
| `title_malayalam` | Title (Malayalam) | String |
| `title_english` | Title (English) | String |
| `title_urdu` | Title (Urdu) | String |
| `description_malayalam` | Description (Malayalam) | String |
| `description_english` | Description (English) | String |
| `description_urdu` | Description (Urdu) | String |
| `arabic_text` | Arabic Text | String (RTL) |
| `arabic_source` | Arabic Source | String (RTL) |
| `count` | Count | Number |
| `reference_link` | Reference / Link | String |

Passing an invalid field key returns `400 Bad Request`.

---

### Special Entries

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/special-categories/:categoryId/entries` | Admin | List entries in a category (paginated, searchable) |
| POST | `/api/admin/special-categories/:categoryId/entries` | Admin | Create a new entry |
| PUT | `/api/admin/special-entries/:id` | Admin | Update an entry |
| DELETE | `/api/admin/special-entries/:id` | Admin | Delete an entry |

**GET query params:** `?page=1&limit=20&search=<text>`

Search scans all enabled text field keys in the category's `fields` config.

**GET response:**
```json
{
  "entries": [
    {
      "id": "<entry_id>",
      "categoryId": "<category_id>",
      "order": 0,
      "data": {
        "title_malayalam": "...",
        "arabic_text": "اللَّهُمَّ",
        "count": 33
      },
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "category": { "id": "...", "name": "My Custom Model", "fields": [...], ... },
  "total": 15,
  "page": 1,
  "limit": 20,
  "total_pages": 1
}
```

**POST / PUT body:**
```json
{
  "order": 0,
  "data": {
    "title_malayalam": "...",
    "title_english": "...",
    "arabic_text": "اللَّهُمَّ",
    "count": 33
  }
}
```

Only keys listed in the category's `fields` config are stored; extra keys are silently ignored. PUT merges the new `data` with existing data (partial update supported).

**Entries are sorted** by `order` (asc) then `created_at` (desc).

---

## 20. Admin — Leaderboards / Tracking Stats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/models/dhikr-tracking` | Admin | Dhikr leaderboard (total dhikr per user) |
| GET | `/api/admin/models/dua-memorization` | Admin | Dua memorization leaderboard |
| GET | `/api/admin/models/fasting` | Admin | Fasting leaderboard (completed days count) |
| GET | `/api/admin/models/prayer-tracking` | Admin | Prayer leaderboard (total prayers) |
| GET | `/api/admin/models/quran-reading` | Admin | Quran reading leaderboard (total pages) |
| GET | `/api/admin/models/quran-memorization` | Admin | Quran memorization leaderboard (ayah count) |
| GET | `/api/admin/models/quran-progress` | Admin | Quran progress leaderboard (khatms completed) |
| GET | `/api/admin/models/streaks` | Admin | Streaks leaderboard |

**Streaks query:** `?type=combined` — options: `prayer` | `quran_reading` | `dhikr` | `combined`

---

## 21. Admin — Tracking Records (Read-Only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/models/prayer-tracking/records` | Admin | Prayer tracking records (user, date, fardh, sunnah) |
| GET | `/api/admin/models/quran-reading/records` | Admin | Quran reading records (user, date, pages) |
| GET | `/api/admin/models/quran-memorization/records` | Admin | Quran memorization records (user, ayahs, goals) |
| GET | `/api/admin/models/dhikr-tracking/records` | Admin | Dhikr tracking records (user, date, counts) |
| GET | `/api/admin/models/fasting/records` | Admin | Fasting day records (user, date, type, status) |
| GET | `/api/admin/models/dua-memorization/records` | Admin | Dua memorization records (user, duas list) |

**Common query params:** `?page=1&limit=50&user_id=<id>`

---

## 22. Content Catalogue (Public)

All endpoints require a valid user JWT. All are `GET` only.

**Common query params:** `?page=1&limit=20`

### Duas

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/duas` | List duas. `?page&limit&category=<id>&search=` |
| GET `/api/content/duas/:id` | Get a single dua |

### Dua Categories

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/dua-categories` | List dua categories |
| GET `/api/content/dua-categories/:id` | Get a single dua category |

### Dhikr Categories

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/dhikr-categories` | List dhikr categories |
| GET `/api/content/dhikr-categories/:id` | Get a single dhikr category |

### Dhikr Types

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/dhikr-types` | List dhikr types. `?page&limit&category=<id>&search=` |
| GET `/api/content/dhikr-types/:id` | Get a single dhikr type |

### Thasbeehs

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/thasbeehs` | List thasbeehs. `?page&limit&category=<id>&search=` |
| GET `/api/content/thasbeehs/:id` | Get a single tasbeeh |

### Fasting Types

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/fasting-types` | List fasting types |
| GET `/api/content/fasting-types/:id` | Get a single fasting type |

### Quran Reading Content

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/quran-reading-content` | List Quran reading content items |
| GET `/api/content/quran-reading-content/:id` | Get a single item |

### Quran Memorization Content

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/quran-memorization-content` | List Quran memorization content items |
| GET `/api/content/quran-memorization-content/:id` | Get a single item |

### Verse Importance _(legacy)_

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/verse-importance` | List verse importance entries. `?page&limit` |
| GET `/api/content/verse-importance/:id` | Get a single entry |

### Dhikr Importance _(legacy)_

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/dhikr-importance` | List dhikr importance entries. `?page&limit` |
| GET `/api/content/dhikr-importance/:id` | Get a single entry |

### Dua Importance _(legacy)_

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/dua-importance` | List dua importance entries. `?page&limit` |
| GET `/api/content/dua-importance/:id` | Get a single entry |

> Legacy importance endpoints remain available for backward compatibility. New apps should use the [Library endpoints](#22-content--library-public).

### Daily Quotes

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/daily-quotes` | List daily quotes. `?page&limit&search=&date=YYYY-MM-DD` |
| GET `/api/content/daily-quotes/:id` | Get a single daily quote |

### Hadees

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/hadees` | List hadees. `?page&limit&category=<id>&search=` |
| GET `/api/content/hadees/:id` | Get a single hadees |

### Hadees Categories

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/hadees-categories` | List hadees categories |
| GET `/api/content/hadees-categories/:id` | Get a single hadees category |

### Names of Allah

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/names-of-allah` | List names of Allah. `?page&limit&search=` |
| GET `/api/content/names-of-allah/:id` | Get a single name |

### Live Links

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/live-links` | List active live links |
| GET `/api/content/live-links/:id` | Get a single live link |

### Today's Banner

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/banner/today` | Get today's active banner |

### Ramadan Duas

| Endpoint | Description |
|----------|-------------|
| GET `/api/content/ramadan-duas` | List Ramadan duas (paginated, filterable by day) |

**Query params:** `?day=1` (1–30 filter by specific day), `?page=1&limit=50`

**Response:**
```json
{
  "ramadan_duas": [ ... ],
  "total": 90,
  "page": 1,
  "limit": 50,
  "total_pages": 2
}
```

Items are sorted by `day_number` (asc) then `order` (asc).

---

## 23. Content — Library (Public)

The Library exposes dynamically created importance/content categories and their entries to the mobile app.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/content/library-categories` | User | List all library categories (ordered by `order` asc) |
| GET | `/api/content/library-categories/:categoryId/entries` | User | List entries in a category (paginated) |
| GET | `/api/content/library-entries/:id` | User | Get a single entry by ID (includes populated category) |

**GET /library-categories response:**
\`\`\`json
{
  "categories": [
    {
      "id": "<id>",
      "name": "Dua Importance",
      "slug": "dua-importance",
      "description": "Importance of making dua",
      "icon": "BookHeart",
      "order": 0,
      "created_at": "2025-05-22T10:00:00.000Z",
      "updated_at": "2025-05-22T10:00:00.000Z"
    }
  ]
}
\`\`\`

**GET /library-categories/:categoryId/entries query:** `?page=1&limit=20`

**GET /library-categories/:categoryId/entries response:**
\`\`\`json
{
  "entries": [
    {
      "id": "<entry_id>",
      "categoryId": "<category_id>",
      "title": { "malayalam": "...", "english": "...", "urdu": "..." },
      "description": { "malayalam": "...", "english": "...", "urdu": "..." },
      "content": "اللَّهُمَّ إِنِّي أَسْأَلُكَ",
      "source": "صحيح البخاري",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "category": { "id": "...", "name": "Dua Importance", "slug": "dua-importance", ... },
  "total": 45,
  "page": 1,
  "limit": 20,
  "total_pages": 3
}
\`\`\`

**GET /library-entries/:id response:**
\`\`\`json
{
  "id": "<entry_id>",
  "categoryId": {
    "id": "<category_id>",
    "name": "Dua Importance",
    "slug": "dua-importance"
  },
  "title": { "malayalam": "...", "english": "...", "urdu": "..." },
  "description": { "malayalam": "...", "english": null, "urdu": null },
  "content": "اللَّهُمَّ",
  "source": "صحيح البخاري",
  "created_at": "...",
  "updated_at": "..."
}
\`\`\`

---

## Pre-seeded Library Categories

The following categories were migrated from legacy importance models and are available immediately:

| Category Name | Slug | Entry Count | Legacy Source |
|---------------|------|-------------|---------------|
| Dua Importance | `dua-importance` | (migrated) | `DuaImportance` collection |
| Dhikr Importance | `dhikr-importance` | (migrated) | `DhikrImportance` collection |
| Quran and Sunnah Importance | `quran-and-sunnah-importance` | (migrated) | `VerseImportance` collection |

---

## 24. Content — Special Models (Public)

Exposes Special Model categories and their entries to the mobile app (read-only).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/content/special-categories` | User | List all special categories (ordered by `order` asc) |
| GET | `/api/content/special-categories/:categoryId/entries` | User | List entries in a category (paginated) |
| GET | `/api/content/special-entries/:id` | User | Get a single entry by ID (includes populated category) |

**GET /special-categories response:**
```json
{
  "categories": [
    {
      "id": "<id>",
      "name": "My Custom Model",
      "slug": "my-custom-model",
      "description": "...",
      "icon": "Layers",
      "order": 0,
      "fields": ["title_malayalam", "arabic_text", "count"],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

**GET /special-categories/:categoryId/entries query:** `?page=1&limit=20`

**GET /special-categories/:categoryId/entries response:**
```json
{
  "entries": [
    {
      "id": "<entry_id>",
      "categoryId": "<category_id>",
      "order": 0,
      "data": {
        "title_malayalam": "...",
        "arabic_text": "اللَّهُمَّ",
        "count": 33
      },
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "category": { "id": "...", "name": "My Custom Model", "fields": [...], ... },
  "total": 15,
  "page": 1,
  "limit": 20,
  "total_pages": 1
}
```

**GET /special-entries/:id response:**
```json
{
  "id": "<entry_id>",
  "categoryId": {
    "id": "<category_id>",
    "name": "My Custom Model",
    "slug": "my-custom-model",
    "fields": [...]
  },
  "order": 0,
  "data": {
    "title_malayalam": "...",
    "arabic_text": "اللَّهُمَّ"
  },
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Multilingual Field Schema

All trilingual fields (`title`, `description`) follow this structure:

\`\`\`json
{
  "malayalam": "Required string (primary language)",
  "english": "Optional string or null",
  "urdu": "Optional string or null"
}
\`\`\`

`content` and `source` are single Arabic strings (RTL text direction).

---

## Error Responses

All endpoints return standard JSON error responses:

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad Request — missing or invalid fields |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — insufficient permissions |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate resource (e.g. duplicate category name) |
| `500` | Internal Server Error |

**Error body:**
\`\`\`json
{ "error": "Human-readable error message" }
\`\`\`

---

## Summary

| Category | Endpoints |
|----------|-----------|
| User API (auth, profile, tracking, goals, groups) | 58 |
| Content API — public catalogue | 41 |
| Admin API — platform management + content CRUD + library + special models | 116 |
| **Total** | **215** |

| Resource | Count |
|----------|-------|
| Mongoose models | 32 |
| Controllers | 5 (`adminController`, `contentController`, `libraryController`, `specialController`, + tracking controllers) |
| Services | 3 (`streakService`, `streakQueueService`, `reportService`) |
