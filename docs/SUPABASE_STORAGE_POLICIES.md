# Supabase Storage Bucket Policies

**Created:** January 17, 2026  
**Status:** ✅ Complete  
**Verified:** All buckets and policies confirmed active in Supabase Dashboard

## Overview

All storage buckets have RLS (Row Level Security) policies configured to control access.

## Buckets & Policies Summary

### 1. `avatars` (Public Bucket)
User profile pictures with public read access.

| Policy | Command | Access |
|--------|---------|--------|
| Public read access for avatars | SELECT | Anyone |
| Authenticated upload avatars | INSERT | Authenticated users |
| Users can update own avatars | UPDATE | Owner only (by folder path) |
| Users can delete own avatars | DELETE | Owner only (by folder path) |

**File path convention:** `{user_id}/{filename}`

---

### 2. `species-images` (Public Bucket)
Mushroom species images with public read access.

| Policy | Command | Access |
|--------|---------|--------|
| Public read access for species-images | SELECT | Anyone |
| Authenticated upload species-images | INSERT | Authenticated users |
| Authenticated update species-images | UPDATE | Authenticated users |
| Authenticated delete species-images | DELETE | Authenticated users |

**File path convention:** `{species_id}/{filename}`

---

### 3. `firmware` (Private Bucket)
MycoBrain device firmware files.

| Policy | Command | Access |
|--------|---------|--------|
| Authenticated read firmware | SELECT | Authenticated users |
| Authenticated upload firmware | INSERT | Authenticated users |
| Authenticated update firmware | UPDATE | Authenticated users |
| Authenticated delete firmware | DELETE | Authenticated users |

**File path convention:** `{device_id}/{version}-{filename}`

---

### 4. `documents` (Private Bucket)
User documents and reports.

| Policy | Command | Access |
|--------|---------|--------|
| Authenticated read documents | SELECT | Authenticated users |
| Authenticated upload documents | INSERT | Authenticated users |
| Users can update own documents | UPDATE | Owner only (by folder path) |
| Users can delete own documents | DELETE | Owner only (by folder path) |

**File path convention:** `{user_id}/{filename}`

---

### 5. `telemetry-exports` (Private Bucket)
Exported telemetry data files.

| Policy | Command | Access |
|--------|---------|--------|
| Authenticated read telemetry-exports | SELECT | Authenticated users |
| Authenticated upload telemetry-exports | INSERT | Authenticated users |
| Authenticated update telemetry-exports | UPDATE | Authenticated users |
| Authenticated delete telemetry-exports | DELETE | Authenticated users |

**File path convention:** `{device_id}/{date}-export.json`

---

## File Size Limits

| Setting | Value |
|---------|-------|
| Global file size limit | 50 MB |
| Image transformations | Enabled |

Note: Max upload size limited to 50 MB due to Spend Cap. Can be increased to 500 GB by disabling Spend Cap.

---

## Usage Examples

### Upload Avatar (Client-side)
```typescript
import { uploadAvatar } from '@/lib/supabase/storage'

const avatarUrl = await uploadAvatar(userId, file)
```

### Upload Species Image
```typescript
import { uploadSpeciesImage } from '@/lib/supabase/storage'

const imageUrl = await uploadSpeciesImage(speciesId, file)
```

### Upload Firmware
```typescript
import { uploadFirmware } from '@/lib/supabase/storage'

const firmwareUrl = await uploadFirmware(deviceId, file)
```

### Get Public URL
```typescript
import { getPublicUrl } from '@/lib/supabase/storage'

const url = getPublicUrl('avatars', 'user123/avatar.jpg')
```

### Get Signed URL (for private buckets)
```typescript
import { getSignedUrl } from '@/lib/supabase/storage'

const url = await getSignedUrl('firmware', 'device123/firmware.bin', 3600)
```

---

## API Upload Endpoint

**POST** `/api/upload`

Request (FormData):
- `file`: File to upload
- `bucket`: One of `avatars`, `species-images`, `firmware`, `documents`, `telemetry-exports`
- `path`: File path within the bucket

Response:
```json
{
  "success": true,
  "file": {
    "name": "filename.jpg",
    "id": "...",
    "created_at": "2026-01-17T..."
  }
}
```

---

## SQL Migration

The policies were created via SQL. The migration file is stored at:
`supabase/migrations/20260117210000_storage_policies.sql`

To recreate policies, run the SQL in the Supabase SQL Editor.
