# API Route Fixes - February 12, 2026

## Summary

Fixed incomplete API routes by adding metadata and improving response transparency. **No routes returned HTTP 501** - all routes were already functional, but some needed better documentation in their responses.

## Changes Made

### 1. `/api/docker/containers` - Backup Action Transparency

**File**: `app/api/docker/containers/route.ts`  
**Lines**: 331-349  
**Issue**: Backup exported container to tar but didn't persist to disk, with unclear messaging

**Fix**: Added clear response metadata indicating persistence status

```typescript
{
  success: true,
  message: "Container backup exported (not persisted - deploy to production VM for NAS persistence)",
  persisted: false,
  note: "Deploy to VM 187 with NAS mount for automatic persistence",
  // ... other backup metadata
}
```

**Benefits**:
- Frontend now knows backup is in-memory only
- Clear guidance on how to enable persistence (deploy to VM 187)
- Environment detection (checks `NODE_ENV` and `HAS_NAS_MOUNT`)
- User expectations aligned with actual behavior

---

### 2. `/api/search/unified` - Research Source Transparency

**File**: `app/api/search/unified/route.ts`  
**Lines**: 448-461  
**Issue**: Research results came from CrossRef/OpenAlex, but response didn't indicate MINDEX research endpoint was missing

**Fix**: Added `research_sources` metadata showing which backends contributed

```typescript
{
  results: { species, compounds, genetics, research },
  research_sources: {
    mindex: false,
    crossref: true,
    openalex: true,
    mindex_note: "MINDEX research endpoint pending implementation. Using CrossRef and OpenAlex."
  },
  // ... other response fields
}
```

**Benefits**:
- Frontend can show data source badges (e.g., "Powered by CrossRef")
- Clear indication that MINDEX research integration is pending
- Users understand where research data comes from
- Easy to detect when MINDEX research goes live (mindex: true)

---

### 3. `/api/crep/demo/elephant-conservation` - Demo Data Transparency

**File**: `app/api/crep/demo/elephant-conservation/route.ts`  
**Lines**: 631-654  
**Issue**: Elephant GPS locations were demo data, but response didn't clearly indicate this

**Fix**: Added explicit data source flags and explanatory notes

```typescript
{
  elephants: [...],
  elephantsDataSource: "demo", // Explicit flag
  notes: {
    elephantTracking: "Using simulated GPS data. Real tracking collar integration pending.",
    deviceIntegration: useDemo 
      ? "Demo mode: Using simulated devices. Connect to MAS (192.168.0.188:8001) for real device data."
      : "Using real devices from MAS Device Registry."
  },
  // ... other fields
}
```

**Benefits**:
- Frontend can show "DEMO MODE" badge on elephant markers
- Users understand this is simulated data
- Clear guidance on how to connect real devices
- Differentiation between demo fences/monitors (which can be real) and elephants (always demo for now)

---

## Routes Already Correct (No Changes)

### 1. `/api/mindex/wifisense` POST ✅
- Fully implemented on Feb 12, 2026
- Forwards control commands to MINDEX
- Returns 503 when MINDEX endpoint unavailable (correct)

### 2. `/api/mindex/agents/anomalies` GET ✅
- Returns empty array with helpful `coming_soon` status
- Excellent graceful degradation pattern
- No changes needed

### 3. `/api/ancestry/tree/[id]` GET ✅
- Returns 503 with clear error message
- Instructs user to run migrations
- Appropriate for feature not yet configured

### 4. `/api/contact` POST ✅
- Primary feature (save to Supabase) works perfectly
- Email notification is optional enhancement (TODO remains)
- Production-ready as-is

### 5. `/api/mas/voice/orchestrator` ✅
- Placeholder API key checks prevent wasted API calls
- Good defensive programming
- No changes needed

---

## Testing Recommendations

### Test 1: Docker Backup Response
```bash
curl -X POST http://localhost:3010/api/docker/containers \
  -H "Content-Type: application/json" \
  -d '{"action": "backup", "containerId": "mycosoft-website"}'
```

**Expected**: Response includes `persisted: false` and helpful note about VM deployment

---

### Test 2: Unified Search Research Sources
```bash
curl "http://localhost:3010/api/search/unified?q=psilocybin&types=research&limit=5"
```

**Expected**: Response includes `research_sources` with `mindex: false` and explanatory note

---

### Test 3: CREP Elephant Conservation Demo Mode
```bash
curl "http://localhost:3010/api/crep/demo/elephant-conservation?demo=true"
```

**Expected**: Response includes `elephantsDataSource: "demo"` and notes explaining demo mode

---

## Next Steps

### High Priority (This Week)
1. ✅ **Add response metadata** (completed)
2. 🔄 **Docker backup persistence** - Implement NAS write when `process.env.HAS_NAS_MOUNT === "true"`
3. 🔄 **Update API catalog** - Document new response fields in `docs/API_CATALOG_FEB04_2026.md`

### Medium Priority (Next Sprint)
4. **MINDEX research endpoint** - Create `/api/mindex/research/search` in MINDEX API
5. **Test on VM 187** - Verify Docker backup persistence with real NAS mount
6. **Frontend updates** - Add "Demo Mode" badges and data source indicators

### Low Priority (Future)
7. **Email notifications** - Implement contact form email via SendGrid/Resend
8. **Real elephant tracking** - Integrate GPS tracking collar API
9. **Ancestry database** - Run phylogeny tree migrations

---

## Impact

### User Experience Improvements
- ✅ Users know when features use demo data
- ✅ Users know how to connect real backends
- ✅ Clear expectations about data sources
- ✅ No more surprise "why doesn't this work?" moments

### Developer Experience Improvements
- ✅ Frontend can conditionally render based on data sources
- ✅ Easy to detect when backends come online
- ✅ Clear TODOs for implementing missing features
- ✅ Response metadata enables better UX (badges, tooltips, warnings)

### API Quality Improvements
- ✅ No routes return 501 (were already fixed)
- ✅ All routes return appropriate status codes (200, 400, 503)
- ✅ Graceful degradation patterns throughout
- ✅ Helpful error messages and guidance

---

## Files Modified
1. `app/api/docker/containers/route.ts`
2. `app/api/search/unified/route.ts`
3. `app/api/crep/demo/elephant-conservation/route.ts`

## Documentation Created
1. `docs/API_ROUTE_AUDIT_FEB12_2026.md` - Full audit report
2. `docs/API_ROUTE_FIXES_FEB12_2026.md` - This file

---

## Conclusion

**Mission Accomplished**: Website API layer has **zero 501 "Not Implemented" responses**. All routes:
- ✅ Return appropriate status codes
- ✅ Provide helpful error messages
- ✅ Gracefully degrade when backends unavailable
- ✅ Include metadata about data sources and demo mode

The fixes above improve transparency without changing functionality. All routes were already working - we just made their behavior more explicit.

**Deployment**: Commit these changes and deploy to sandbox VM when ready. No breaking changes - only additive response fields.
