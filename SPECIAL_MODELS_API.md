# Special Models — App API Reference

> **Base URL:** `https://<your-api-domain>/api`  
> All endpoints are **public** (no authentication required).  
> All responses are JSON. Dates are ISO 8601 strings.

---

## Table of Contents

1. [Data Models](#data-models)
2. [GET /content/special-categories](#1-get-all-special-categories)
3. [GET /content/special-categories?type=main](#2-get-only-main-categories)
4. [GET /content/special-categories?type=sub](#3-get-only-sub-categories)
5. [GET /content/special-categories/:categoryId/entries](#4-get-entries-for-a-category)
6. [GET /content/special-entries/:id](#5-get-a-single-entry)
7. [Field Keys Reference](#field-keys-reference)
8. [App Integration Guide](#app-integration-guide)

---

## Data Models

### Category Object

| Field         | Type                 | Description                                                                 |
|---------------|----------------------|-----------------------------------------------------------------------------|
| `_id`         | `string`             | Unique MongoDB ID                                                           |
| `name`        | `string`             | Display name of the category                                                |
| `slug`        | `string`             | URL-friendly identifier (auto-generated from name)                         |
| `description` | `string \| null`     | Short description                                                           |
| `icon`        | `string \| null`     | Lucide icon name (e.g. `"Star"`, `"Layers"`)                               |
| `order`       | `number \| null`     | Display sort order                                                          |
| `parentId`    | `object \| null`     | If `null` → **Main Category**. If set → **Sub Category** (contains `_id`, `name`, `slug` of the parent) |
| `fields`      | `string[]`           | List of field keys enabled for entries in this category (see [Field Keys Reference](#field-keys-reference)) |
| `created_at`  | `string`             | ISO date                                                                    |
| `updated_at`  | `string`             | ISO date                                                                    |

> **How to detect category type:**
> - `parentId === null` → **Main Category**
> - `parentId` is an object → **Sub Category** (the object contains the parent's `_id`, `name`, `slug`)

---

### Entry Object

| Field        | Type             | Description                                                      |
|--------------|------------------|------------------------------------------------------------------|
| `_id`        | `string`         | Unique MongoDB ID                                                |
| `categoryId` | `string`         | ID of the category this entry belongs to                        |
| `order`      | `number \| null` | Display sort order                                               |
| `data`       | `object`         | Key-value pairs. Only keys listed in the category's `fields` array are present |
| `created_at` | `string`         | ISO date                                                         |
| `updated_at` | `string`         | ISO date                                                         |

---

## 1. Get All Special Categories

Returns all categories (both main and sub) sorted by `order`, then creation date.

```
GET /content/special-categories
```

### Response `200 OK`

```json
{
  "categories": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Ninety Nine Names",
      "slug": "ninety-nine-names",
      "description": "Asmaul Husna — the 99 names of Allah",
      "icon": "Star",
      "order": 1,
      "parentId": null,
      "fields": ["title_arabic", "title_malayalam", "title_english", "translation_malayalam"],
      "created_at": "2024-05-20T10:00:00.000Z",
      "updated_at": "2024-05-20T10:00:00.000Z"
    },
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d1f",
      "name": "Morning Adhkar",
      "slug": "morning-adhkar",
      "description": "Morning remembrance",
      "icon": "Sun",
      "order": 1,
      "parentId": {
        "_id": "664a1b2c3d4e5f6a7b8c9d2a",
        "name": "Daily Adhkar",
        "slug": "daily-adhkar"
      },
      "fields": ["arabic_text", "translation_malayalam", "translation_english", "count"],
      "created_at": "2024-05-21T08:00:00.000Z",
      "updated_at": "2024-05-21T08:00:00.000Z"
    }
  ]
}
```

---

## 2. Get Only Main Categories

Returns only top-level categories (`parentId === null`).

```
GET /content/special-categories?type=main
```

### Query Parameters

| Parameter | Value  | Description                    |
|-----------|--------|--------------------------------|
| `type`    | `main` | Filter to main categories only |

### Response `200 OK`

```json
{
  "categories": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Ninety Nine Names",
      "slug": "ninety-nine-names",
      "description": "Asmaul Husna",
      "icon": "Star",
      "order": 1,
      "parentId": null,
      "fields": ["arabic_text", "title_malayalam", "title_english", "translation_malayalam"],
      "created_at": "2024-05-20T10:00:00.000Z",
      "updated_at": "2024-05-20T10:00:00.000Z"
    }
  ]
}
```

---

## 3. Get Only Sub Categories

Returns only sub-categories (`parentId` is set), each populated with their parent's info.

```
GET /content/special-categories?type=sub
```

### Query Parameters

| Parameter | Value | Description                   |
|-----------|-------|-------------------------------|
| `type`    | `sub` | Filter to sub-categories only |

### Response `200 OK`

```json
{
  "categories": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d1f",
      "name": "Morning Adhkar",
      "slug": "morning-adhkar",
      "description": "Morning remembrance",
      "icon": "Sun",
      "order": 1,
      "parentId": {
        "_id": "664a1b2c3d4e5f6a7b8c9d2a",
        "name": "Daily Adhkar",
        "slug": "daily-adhkar"
      },
      "fields": ["arabic_text", "translation_malayalam", "translation_english", "count"],
      "created_at": "2024-05-21T08:00:00.000Z",
      "updated_at": "2024-05-21T08:00:00.000Z"
    }
  ]
}
```

---

## 4. Get Entries for a Category

Returns paginated entries for a given category (works for both main and sub categories).

```
GET /content/special-categories/:categoryId/entries
```

### Path Parameters

| Parameter    | Description                       |
|--------------|-----------------------------------|
| `categoryId` | The `_id` of the category         |

### Query Parameters

| Parameter | Type     | Default | Description                    |
|-----------|----------|---------|--------------------------------|
| `page`    | `number` | `1`     | Page number (1-based)          |
| `limit`   | `number` | `20`    | Number of entries per page     |

### Response `200 OK`

```json
{
  "category": {
    "_id": "664a1b2c3d4e5f6a7b8c9d1f",
    "name": "Morning Adhkar",
    "slug": "morning-adhkar",
    "description": "Morning remembrance",
    "icon": "Sun",
    "order": 1,
    "parentId": {
      "_id": "664a1b2c3d4e5f6a7b8c9d2a",
      "name": "Daily Adhkar",
      "slug": "daily-adhkar"
    },
    "fields": ["arabic_text", "translation_malayalam", "translation_english", "count"],
    "created_at": "2024-05-21T08:00:00.000Z",
    "updated_at": "2024-05-21T08:00:00.000Z"
  },
  "entries": [
    {
      "_id": "664b2c3d4e5f6a7b8c9d0e1f",
      "categoryId": "664a1b2c3d4e5f6a7b8c9d1f",
      "order": 1,
      "data": {
        "arabic_text": "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ",
        "translation_malayalam": "അല്ലാഹുവേ, നീ എന്റെ രക്ഷിതാവ് ആകുന്നു...",
        "translation_english": "O Allah, You are my Lord, there is no god but You...",
        "count": 3
      },
      "created_at": "2024-05-21T08:30:00.000Z",
      "updated_at": "2024-05-21T08:30:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "total_pages": 3
}
```

### Error `404 Not Found`

```json
{ "error": "Special category not found" }
```

---

## 5. Get a Single Entry

Returns one entry with its full category object (including parent category info if it's a sub-category).

```
GET /content/special-entries/:id
```

### Path Parameters

| Parameter | Description              |
|-----------|--------------------------|
| `id`      | The `_id` of the entry   |

### Response `200 OK`

```json
{
  "_id": "664b2c3d4e5f6a7b8c9d0e1f",
  "categoryId": {
    "_id": "664a1b2c3d4e5f6a7b8c9d1f",
    "name": "Morning Adhkar",
    "slug": "morning-adhkar",
    "fields": ["arabic_text", "translation_malayalam", "translation_english", "count"],
    "parentId": {
      "_id": "664a1b2c3d4e5f6a7b8c9d2a",
      "name": "Daily Adhkar",
      "slug": "daily-adhkar"
    }
  },
  "order": 1,
  "data": {
    "arabic_text": "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ",
    "translation_malayalam": "അല്ലാഹുവേ, നീ എന്റെ രക്ഷിതാവ് ആകുന്നു...",
    "translation_english": "O Allah, You are my Lord, there is no god but You...",
    "count": 3
  },
  "created_at": "2024-05-21T08:30:00.000Z",
  "updated_at": "2024-05-21T08:30:00.000Z"
}
```

### Error `404 Not Found`

```json
{ "error": "Special entry not found" }
```

---

## Field Keys Reference

These are all possible keys that can appear inside `entry.data`. A category's `fields` array defines which of these are active for its entries.

### Title Fields
| Key                | Type     | Direction | Description              |
|--------------------|----------|-----------|--------------------------|
| `title_malayalam`  | `string` | LTR       | Title in Malayalam       |
| `title_english`    | `string` | LTR       | Title in English         |
| `title_urdu`       | `string` | RTL       | Title in Urdu            |

### Description Fields
| Key                       | Type     | Direction | Description                    |
|---------------------------|----------|-----------|--------------------------------|
| `description_malayalam`   | `string` | LTR       | Description in Malayalam       |
| `description_english`     | `string` | LTR       | Description in English         |
| `description_urdu`        | `string` | RTL       | Description in Urdu            |

### Arabic Fields
| Key              | Type     | Direction | Description                        |
|------------------|----------|-----------|------------------------------------|
| `arabic_text`    | `string` | RTL       | Arabic text (Quranic / Hadith etc) |
| `arabic_source`  | `string` | RTL       | Source reference in Arabic         |

### Translation Fields
| Key                        | Type     | Direction | Description                    |
|----------------------------|----------|-----------|--------------------------------|
| `translation_malayalam`    | `string` | LTR       | Translation in Malayalam       |
| `translation_english`      | `string` | LTR       | Translation in English         |
| `translation_urdu`         | `string` | RTL       | Translation in Urdu            |

### Other Fields
| Key               | Type     | Description                       |
|-------------------|----------|-----------------------------------|
| `count`           | `number` | Repetition count (e.g. dhikr × 33) |
| `reference_link`  | `string` | URL reference / source link       |

> **Rendering tip:** Fields where Direction = RTL should be rendered with `textAlign: 'right'` / `textDirection: 'rtl'` in the app.

---

## App Integration Guide

### Typical Flow

#### Scenario A — Display a standalone main category (e.g. "99 Names of Allah")

```
1. GET /content/special-categories?type=main
   → Pick the desired category by slug or _id

2. GET /content/special-categories/{categoryId}/entries?page=1&limit=20
   → Render entries using category.fields to know which data keys to display
```

#### Scenario B — Display a section that has sub-categories (e.g. "Daily Adhkar" → Morning / Evening / Night)

```
1. GET /content/special-categories?type=main
   → Find the parent category (e.g. "Daily Adhkar") → note its _id

2. GET /content/special-categories?type=sub
   → Filter entries where parentId._id === <parent _id>
   → Show sub-categories as tabs / list

3. User selects a sub-category (e.g. "Morning Adhkar")
   GET /content/special-categories/{subCategoryId}/entries?page=1&limit=20
   → Render entries
```

#### Scenario C — Deep link to a single entry

```
GET /content/special-entries/{entryId}
→ The response contains the full categoryId object (with parentId populated),
  so you know the full hierarchy without extra requests.
```

---

### Identifying Category Type in Code

```dart
// Dart / Flutter example
bool isMainCategory = category['parentId'] == null;
bool isSubCategory  = category['parentId'] != null;

// Get parent name (for sub-categories)
String? parentName = category['parentId']?['name'];
```

```js
// JavaScript / React Native example
const isMain = category.parentId === null;
const isSub  = category.parentId !== null;
const parentName = category.parentId?.name;
```

---

### Pagination

All entries endpoints return:

```json
{
  "total":       100,
  "page":        1,
  "limit":       20,
  "total_pages": 5
}
```

Use `page` query param to paginate: `?page=2&limit=20`

---

### Notes for App Team

- **`fields` array on the category** tells you exactly which keys will be present in `entry.data`. Always use this to drive your UI — don't hardcode field keys.
- **Missing fields** — if a key is not in `entry.data`, treat it as an empty/null value.
- **Nesting depth** — maximum one level. Sub-categories cannot have their own sub-categories.
- **Sort order** — entries are sorted by `order` (ascending), then by `created_at` (descending). Use this to preserve the intended display sequence.
- **RTL fields** — `arabic_text`, `arabic_source`, `title_urdu`, `description_urdu`, `translation_urdu` should all be rendered right-to-left.
