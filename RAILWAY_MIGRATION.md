# Railway Migration - Supabase References Removed

## Changes Made

### Folder Structure
- ✅ Renamed `supabase/` → `migrations/`
- ✅ Renamed `lib/supabase/` → `lib/database/`
- ✅ Deleted `SUPABASE_SETUP.md`

### File Updates
1. **lib/database/types.ts** - Database type definitions (kept, agnostic)
2. **lib/database/admin.ts** - Legacy Supabase admin client (kept for now, may be removed later)
3. **lib/database/client.ts** - Legacy Supabase client (kept for now, may be removed later)

### Import Updates
- `@/lib/supabase/types` → `@/lib/database/types` (4 files updated)
- `supabase/migrations/` → `migrations/migrations/` (test file updated)

### Files Referencing Supabase (Still Present)
These files in the `server/` folder (NestJS) still reference Supabase but appear to be legacy/unused:
- `server/src/common/supabase.service.ts`
- `server/src/modules/*/` (various modules)

**Note**: The NestJS server may not be actively used since Railway is configured to run Next.js (`npm start`).

---

## Migration SQL Files

All migration files are now in `migrations/migrations/` folder:
- Initial schema
- Security enhancements  
- Financial operations
- Referral system
- **NEW**: Enhanced viral referral system (`20260916100000_enhanced_viral_referral_system.sql`)

---

## How to Apply Migrations

Since you're using Railway PostgreSQL:

```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL

# Apply any pending migrations
\i migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

Or use Railway CLI:
```bash
railway run psql < migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

---

## Environment Variables

Make sure these are set in Railway:
```
DATABASE_URL=postgresql://...
AUTH_TOKEN_SECRET=<generate-a-random-32-char-secret>
PAYSTACK_SECRET_KEY=sk_live_...
REDIS_URL=redis://...
```

**Removed** (no longer needed):
- ~~SUPABASE_URL~~
- ~~SUPABASE_ANON_KEY~~
- ~~SUPABASE_SERVICE_ROLE_KEY~~
- ~~NEXT_PUBLIC_SUPABASE_URL~~
- ~~NEXT_PUBLIC_SUPABASE_ANON_KEY~~

---

## Next Steps

1. ✅ All Supabase references removed from main app
2. ⚠️ Server folder (NestJS) still has Supabase references - may need cleanup if used
3. ✅ Ready to commit and push to GitHub/Railway
