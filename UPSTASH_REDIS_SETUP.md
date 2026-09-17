# ⚡ Upstash Redis Setup Guide - Step by Step

**Time Required**: 5 minutes  
**Cost**: FREE (10,000 requests/day)  
**Best For**: Getting started quickly with production-ready Redis

---

## 🎯 Why Upstash for Me2U?

✅ **FREE** tier with generous limits (10,000 requests/day)  
✅ **Serverless** - auto-scales with your traffic  
✅ **Global** - low latency worldwide  
✅ **No credit card** required for free tier  
✅ **Perfect for Railway** - seamless integration  
✅ **Redis 7.0** compatible - full feature support

### What Me2U Uses Redis For:
- Rate limiting on auth endpoints (prevent brute force)
- Session management (user login states)
- API request throttling (protect against abuse)
- Caching (improve performance)
- Real-time features (future: notifications, live updates)

---

## 📋 Step-by-Step Setup

### Step 1: Create Upstash Account (2 minutes)

1. **Go to Upstash Console**:
   - Open: https://console.upstash.com/login
   
2. **Sign up with Google or GitHub** (fastest):
   - Click "Continue with Google" or "Continue with GitHub"
   - Authorize the application
   - No email verification needed!

   **Alternative**: Sign up with email
   - Enter email and password
   - Verify email (check inbox)
   - Complete registration

3. **You're in!**
   - You should see the Upstash dashboard
   - Empty state with "Create Database" button

---

### Step 2: Create Redis Database (1 minute)

1. **Click "Create Database"** button (green button on dashboard)

2. **Configure Database Settings**:

   ```
   Name: me2u-production
   ```
   - Use a descriptive name so you remember what it's for
   
   ```
   Type: Regional (recommended for cost optimization)
   ```
   - **Regional**: Best for single-region deployments (FREE tier available)
   - **Global**: Multi-region replication (costs money but faster worldwide)
   
   ```
   Region: Choose closest to your Railway deployment
   ```
   - If Railway is US-based: **US-East-1 (Ohio)** or **US-West-1 (N. California)**
   - If Railway is EU-based: **EU-West-1 (Ireland)** or **EU-Central-1 (Frankfurt)**
   - If targeting Nigeria primarily: **EU-Central-1 (Frankfurt)** is closest
   
   ```
   Primary Region: (Same as above)
   ```
   
   ```
   Read Regions: Leave empty (not needed for free tier)
   ```
   
   ```
   TLS: Enabled (default - keep this ON for security)
   ```
   
   ```
   Eviction: No eviction (recommended for session/rate-limiting data)
   ```
   - Alternative: `allkeys-lru` if you want automatic cache management

3. **Click "Create"**
   - Database provisions in ~10 seconds
   - You'll see a success message

---

### Step 3: Get Connection Details (1 minute)

Once database is created, you'll see the database dashboard with connection details.

1. **Locate the "REST API" section** (recommended for serverless):

   ```
   UPSTASH_REDIS_REST_URL: https://us1-proper-bird-12345.upstash.io
   UPSTASH_REDIS_REST_TOKEN: AXXXAbCdEfGhIjKlMnOpQrStUvWxYz1234567890
   ```

2. **OR locate "Redis Connection String"** (traditional Redis client):

   ```
   rediss://***REDACTED-USER:PASS***@us1-proper-bird-12345.upstash.io:6379
   ```

3. **Copy BOTH** for flexibility:
   - REST API is best for serverless/Railway (HTTP-based)
   - Redis URL is needed if using traditional Redis clients

---

### Step 4: Add to Railway (2 minutes)

#### Option A: Via Railway Dashboard (Recommended)

1. **Open Railway Dashboard**: https://railway.app/dashboard

2. **Select your Me2U project**

3. **Click on your service** (the one running Next.js app)

4. **Go to "Variables" tab**

5. **Click "+ New Variable"**

6. **Add Redis URL**:
   ```
   Variable Name: REDIS_URL
   Value: rediss://***REDACTED-USER:PASS***@us1-proper-bird-12345.upstash.io:6379
   ```
   - Paste the connection string from Upstash
   - Click "Add"

7. **Add REST credentials** (optional but recommended):
   ```
   Variable Name: UPSTASH_REDIS_REST_URL
   Value: https://us1-proper-bird-12345.upstash.io
   
   Variable Name: UPSTASH_REDIS_REST_TOKEN
   Value: AXXXAbCdEfGhIjKlMnOpQrStUvWxYz1234567890
   ```

8. **Save Changes**
   - Railway will automatically redeploy with new variables
   - Wait ~2 minutes for redeployment

#### Option B: Via Railway CLI

```powershell
# Set REDIS_URL
railway variables set REDIS_URL="rediss://***REDACTED-USER:PASS***@us1-proper-bird-12345.upstash.io:6379"

# Set REST credentials (optional)
railway variables set UPSTASH_REDIS_REST_URL="https://us1-proper-bird-12345.upstash.io"
railway variables set UPSTASH_REDIS_REST_TOKEN=<your-upstash-rest-token>

# Redeploy
railway up
```

---

### Step 5: Test Connection (1 minute)

#### Test via Railway CLI:

```powershell
# Test with Node.js
railway run node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(result => { console.log('Redis PING:', result); process.exit(0); }).catch(err => { console.error('Redis Error:', err); process.exit(1); });"
```

**Expected output**:
```
Redis PING: PONG
```

#### Test via Upstash Dashboard:

1. Go to your database in Upstash Console
2. Click "CLI" tab
3. Run command: `PING`
4. Should respond: `PONG`

#### Test in your Me2U app:

1. Open your Railway URL: `https://your-app.up.railway.app`
2. Try registering a user
3. Check Railway logs: `railway logs --tail`
4. Should see Redis connection messages (no errors)

---

## 🎨 Upstash Dashboard Tour

### Main Dashboard Features:

**[Screenshot Placeholder: Upstash Database Overview]**
- Database name and ID
- Region and type
- Connection count
- Storage usage
- Request count (daily)

### Key Sections:

1. **Details Tab**:
   - Connection strings
   - Database configuration
   - Pricing tier
   - Usage statistics

2. **CLI Tab**:
   - Interactive Redis CLI in browser
   - Test commands directly
   - Useful for debugging

3. **Data Browser Tab**:
   - View all keys in Redis
   - Inspect key values
   - Delete keys manually
   - Set TTL (time-to-live)

4. **Metrics Tab**:
   - Request count over time
   - Storage usage graph
   - Connection count
   - Error rate

5. **Settings Tab**:
   - Rename database
   - Change eviction policy
   - Configure TLS
   - Rotate credentials
   - Delete database

---

## 📊 Free Tier Limits

### Upstash Free Tier:
- ✅ **10,000 requests/day** (plenty for MVP)
- ✅ **256 MB storage** (enough for 100,000+ sessions)
- ✅ **Unlimited databases** (can create multiple)
- ✅ **No time limit** (free forever)
- ✅ **TLS included** (secure connections)

### What Happens at Limits?
- **10,000 requests/day exceeded**: Requests fail with rate limit error
  - Solution: Upgrade to paid tier (~$10/month for 100k requests)
- **256 MB storage full**: New writes fail
  - Solution: Set eviction policy or upgrade

### Estimated Me2U Usage (Free Tier):
| Users | Daily Requests | Status |
|-------|---------------|--------|
| 100 | ~2,000 | ✅ Well within limits |
| 500 | ~8,000 | ✅ Still safe |
| 1,000 | ~15,000 | ⚠️ Approaching limit |
| 2,000+ | ~30,000+ | ❌ Need paid tier |

**Recommendation**: Start with free tier, upgrade at 1,000 users (~$10/month).

---

## 🔧 Configuration Options

### Environment Variables in Me2U:

```env
# Option 1: Traditional Redis client (ioredis)
REDIS_URL=rediss://***REDACTED-USER:PASS***@host.upstash.io:6379

# Option 2: REST API (recommended for serverless)
UPSTASH_REDIS_REST_URL=https://host.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-upstash-rest-token>

# Optional: Connection pool settings
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000
```

### Code Usage Example:

```typescript
// lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

export default redis;
```

---

## 🚨 Troubleshooting

### Problem: "Connection timeout"
**Cause**: Network firewall or incorrect URL  
**Solution**:
1. Verify REDIS_URL is correct (check for typos)
2. Ensure TLS is enabled in Upstash settings
3. Check Railway has internet access (should by default)

### Problem: "Authentication failed"
**Cause**: Wrong password in connection string  
**Solution**:
1. Go to Upstash dashboard → Details
2. Copy fresh connection string
3. Update Railway variable
4. Redeploy

### Problem: "Too many requests"
**Cause**: Exceeded free tier limit (10k/day)  
**Solution**:
1. Check Upstash dashboard → Metrics
2. Optimize Redis usage (add caching TTL)
3. Upgrade to paid tier if needed

### Problem: "Redis commands not working"
**Cause**: Using Redis REST API but code expects traditional Redis  
**Solution**:
1. Use `REDIS_URL` for traditional Redis clients
2. Use REST credentials only if using `@upstash/redis` package

---

## 🔄 Migrating from Local Redis

If you were using `redis://localhost:6379` locally:

### Before (Local Development):
```env
REDIS_URL=redis://localhost:6379
```

### After (Production with Upstash):
```env
REDIS_URL=rediss://***REDACTED-USER:PASS***@us1-proper-bird-12345.upstash.io:6379
```

### Update `.env` vs Railway:
- **`.env` (local)**: Keep as `localhost:6379` for local development
- **Railway Variables**: Use Upstash URL for production

**No code changes needed!** Your Redis client automatically connects to the correct instance based on environment variable.

---

## 💰 Upgrade to Paid (Optional)

### When to Upgrade?
- Exceeding 10k requests/day consistently
- Need higher storage (>256 MB)
- Want global replication (faster worldwide)
- Need 99.99% SLA guarantee

### Paid Tier Pricing:
- **Pay-as-you-go**: $0.20 per 100k requests
- **Pro 10K**: $10/month (100k requests/day included)
- **Pro 100K**: $60/month (1M requests/day included)

### How to Upgrade:
1. Go to Upstash dashboard
2. Click "Billing" tab
3. Add payment method
4. Select plan
5. Automatic upgrade (no downtime)

---

## ✅ Verification Checklist

After setup, verify these:

- [ ] Upstash account created
- [ ] Redis database provisioned (name: me2u-production)
- [ ] Connection string copied
- [ ] Railway variable `REDIS_URL` set
- [ ] Railway redeployed successfully
- [ ] Test connection: `railway run node -e "...PING..."`
- [ ] Response: `PONG`
- [ ] App logs show no Redis errors
- [ ] User registration works (session saved to Redis)
- [ ] No "localhost:6379" connection attempts in logs

---

## 🎯 Quick Commands Reference

### Test Redis Connection:
```powershell
railway run node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(console.log).then(() => r.quit());"
```

### Check Redis Keys:
```powershell
railway run node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.keys('*').then(console.log).then(() => r.quit());"
```

### Clear All Redis Data (DANGER):
```powershell
railway run node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.flushall().then(() => console.log('Cleared!')).then(() => r.quit());"
```

### Monitor Redis Commands (Real-time):
- Go to Upstash Dashboard → CLI tab
- Run: `MONITOR`
- See all commands executed in real-time

---

## 📚 Additional Resources

### Upstash Documentation:
- Getting Started: https://upstash.com/docs/redis/overall/getstarted
- REST API: https://upstash.com/docs/redis/features/restapi
- Node.js Integration: https://upstash.com/docs/redis/sdks/javascriptsdk/overview

### Redis Commands:
- SET: Store key-value pair
- GET: Retrieve value by key
- EXPIRE: Set TTL on key
- DEL: Delete key
- KEYS: List all keys (don't use in production!)

### Me2U Redis Usage:
- Rate limiting: `SET rate:user:{id} {count} EX 60`
- Sessions: `SET session:{token} {data} EX 86400`
- Cache: `SET cache:user:{id} {profile} EX 3600`

---

## 🎉 You're Done!

**Redis is now configured for production!**

### What you achieved:
✅ Production-ready Redis instance (Upstash)  
✅ FREE tier (10k requests/day)  
✅ Connected to Railway deployment  
✅ Verified connection works  
✅ App can now handle rate limiting, sessions, caching

### Next Steps:
1. ✅ Deploy your app to Railway (if not already)
2. ✅ Test user registration (uses Redis for sessions)
3. ✅ Monitor Upstash dashboard for usage
4. ✅ Upgrade to paid tier when needed (1,000+ users)

---

**Last Updated**: January 2026  
**Version**: 1.0  
**Upstash Tier**: Free (10k requests/day)  
**Region**: EU-Central-1 (Frankfurt) - Recommended for Nigeria
