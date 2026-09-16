# 📧 Email Verification Setup Guide

**Complete guide to configure email OTP verification for Me2U**

---

## ✅ Email System Status

Your Me2U app now uses **custom SMTP with nodemailer** for:
- ✅ Registration OTP codes (6-digit)
- ✅ Login verification
- ✅ Account unlock notifications
- ✅ Transaction alerts (future)

**No external email service API keys needed!**

---

## 🚀 Quick Setup (5 Minutes)

### Option 1: Gmail (Recommended - Free)

#### Step 1: Enable 2-Factor Authentication
1. Go to: **https://myaccount.google.com/security**
2. Click **2-Step Verification** → **Get Started**
3. Follow prompts (text message or authenticator app)

#### Step 2: Generate App Password
1. Go to: **https://myaccount.google.com/apppasswords**
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Type "Me2U"
4. Click **Generate**
5. Copy the **16-character password** (e.g., `abcd efgh ijkl mnop`)
   - **Note**: Remove spaces when copying → `abcdefghijklmnop`

#### Step 3: Add to Environment Variables

**For Railway:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
EMAIL_FROM="Me2U" <your-actual-email@gmail.com>
```

**For Vercel:**
Go to project → Settings → Environment Variables → Add each variable above

**For Local Development (.env):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
EMAIL_FROM="Me2U" <your-actual-email@gmail.com>
```

#### Step 4: Test
```bash
# Test email endpoint
curl "http://localhost:3000/api/auth/test-email?email=your@email.com"

# Or after deployment
curl "https://your-app.vercel.app/api/auth/test-email?email=your@email.com" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_SECRET"
```

---

### Option 2: Outlook/Hotmail (Free Alternative)

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-outlook-password
EMAIL_FROM="Me2U" <your-email@outlook.com>
```

**Note**: Use your regular Outlook password (no app password needed)

---

### Option 3: Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-yahoo-app-password
EMAIL_FROM="Me2U" <your-email@yahoo.com>
```

**Yahoo App Password**: https://login.yahoo.com/account/security → Generate app password

---

### Option 4: Custom Domain (Paid)

**SendGrid** (100 emails/day free):
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key
EMAIL_FROM="Me2U" <noreply@yourdomain.com>
```

**Mailgun** (5,000 emails/month free):
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.com
SMTP_PASSWORD=your_mailgun_smtp_password
EMAIL_FROM="Me2U" <noreply@yourdomain.com>
```

**AWS SES** ($0.10 per 1,000 emails):
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_aws_smtp_username
SMTP_PASSWORD=your_aws_smtp_password
EMAIL_FROM="Me2U" <noreply@yourdomain.com>
```

---

## 🧪 Testing Email Verification

### Test 1: Email Configuration Health
```bash
# Check if SMTP is configured and connected
curl http://localhost:3000/api/admin/email-health \
  -H "Authorization: Bearer $(cat .env | grep AUTH_TOKEN_SECRET | cut -d= -f2)"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "configured": true,
  "connected": true,
  "config": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "your-email@gmail.com"
  }
}
```

### Test 2: Send Test OTP Email
```bash
# Development (no auth required)
curl "http://localhost:3000/api/auth/test-email?email=your@email.com"

# Production (requires admin auth)
curl "https://your-app.vercel.app/api/auth/test-email?email=your@email.com" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "email": "your@email.com",
  "testCode": "123456",
  "smtpConfigured": true,
  "message": "Email sent successfully!"
}
```

### Test 3: Full Registration Flow
1. **Request OTP**:
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "action": "register"}'
```

2. **Check email inbox** → Copy 6-digit code

3. **Verify OTP**:
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "token": "TOKEN_FROM_STEP_1",
    "action": "register"
  }'
```

---

## 🔧 Troubleshooting

### Issue: "SMTP not configured"

**Solution**: Set all 6 environment variables (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM)

**Check**:
```bash
# Verify environment variables are set
railway variables | grep SMTP
# or
vercel env ls
```

---

### Issue: "Invalid login" or "Authentication failed"

**Cause**: Wrong Gmail password or using regular password instead of app password

**Solution**:
1. Go to https://myaccount.google.com/apppasswords
2. Generate new app password
3. Use that **16-character password** (remove spaces)
4. Update `SMTP_PASSWORD` environment variable

**Verify**:
```bash
# Test SMTP auth manually
openssl s_client -starttls smtp -connect smtp.gmail.com:587
# Then type: EHLO localhost
# Then type: AUTH LOGIN
# Paste base64(email) and base64(app_password)
```

---

### Issue: "Connection timeout" or "ETIMEDOUT"

**Cause**: Firewall blocking outbound SMTP, or wrong host/port

**Solution**:
1. Check firewall allows outbound on port 587
2. Try port 465 with `SMTP_SECURE=true`
3. Verify `SMTP_HOST` is correct

**Test**:
```bash
# Test if port 587 is reachable
telnet smtp.gmail.com 587
# Should see: 220 smtp.gmail.com ESMTP...
```

---

### Issue: "Self signed certificate" error

**Cause**: SSL certificate validation issue

**Solution**: Set `SMTP_SECURE=false`

---

### Issue: Email arrives in spam folder

**Solutions**:
1. **Add SPF record** to your domain DNS:
   ```
   v=spf1 include:_spf.google.com ~all
   ```

2. **Add DKIM** (Gmail handles this automatically for app passwords)

3. **Verify sender domain** in Gmail settings

4. **Ask users to whitelist** `noreply@yourdomain.com`

---

### Issue: "Rate limit exceeded"

**Cause**: Too many emails sent too quickly

**Limits**:
- Gmail: 500 emails/day
- Outlook: 300 emails/day
- Yahoo: 500 emails/day

**Solution**: Upgrade to SendGrid, Mailgun, or AWS SES for higher limits

---

### Issue: OTP code not received

**Checklist**:
1. ✅ Check spam/junk folder
2. ✅ Verify email address is correct
3. ✅ Check SMTP health: `/api/admin/email-health`
4. ✅ Check server logs for send errors
5. ✅ Test email endpoint: `/api/auth/test-email`
6. ✅ Verify SMTP credentials are valid

**Debug**:
```bash
# Check Railway logs
railway logs --filter "email"

# Check Vercel logs
vercel logs --filter="email"
```

---

## 📊 Monitoring Email Health

### Admin Dashboard Checks

**Railway/Vercel Logs**:
```bash
# Watch for email errors
railway logs --tail
# Look for: "✅ Email sent successfully" or "❌ Failed to send OTP email"
```

**Health Check Endpoint**:
```bash
# Check email system status
curl https://your-app.vercel.app/api/admin/email-health \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Metrics to Monitor**:
- Email delivery rate (should be >99%)
- Average delivery time (should be <5 seconds)
- Bounce rate (should be <2%)
- Spam complaints (should be 0%)

---

## 🔒 Security Best Practices

1. **Never commit SMTP credentials** to git
   - ✅ Use environment variables only
   - ✅ Add `.env` to `.gitignore`

2. **Rotate app passwords** every 90 days
   - Generate new app password
   - Update environment variables
   - Delete old app password

3. **Use app passwords**, not regular passwords
   - Regular passwords don't work with 2FA
   - App passwords are more secure

4. **Monitor for suspicious activity**
   - Check Gmail → Security → Recent activity
   - Look for unexpected SMTP logins

5. **Rate limit OTP requests**
   - Already implemented: 3 requests per 15 minutes per email
   - Prevents abuse and spam

6. **Log all email sends** (already implemented)
   - Track failed deliveries
   - Monitor for patterns

---

## 💰 Cost Comparison

| Provider | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| **Gmail** | 500/day | N/A | Development, MVP |
| **Outlook** | 300/day | N/A | Small apps |
| **SendGrid** | 100/day | $15/mo (40K) | Growing apps |
| **Mailgun** | 5,000/mo | $35/mo (50K) | Medium apps |
| **AWS SES** | 0 | $0.10/1K | High volume |
| **Postmark** | 0 | $15/mo (10K) | Transactional |

**Recommendation**: Start with Gmail, upgrade to SendGrid/Mailgun at 10K+ users

---

## ✅ Launch Checklist

- [ ] SMTP credentials configured in environment
- [ ] Email health check passes (status: "healthy")
- [ ] Test email received successfully
- [ ] Full registration flow tested with real email
- [ ] OTP codes arrive within 5 seconds
- [ ] Emails don't go to spam
- [ ] Error logging configured
- [ ] Monitoring dashboard set up
- [ ] SPF/DKIM records configured (for custom domain)
- [ ] Backup SMTP provider configured (optional but recommended)

---

## 🆘 Support

### Quick Fixes

**Development (SMTP not configured)**:
- OTP codes are logged to console ✅
- Check terminal output for: `✅ OTP CODE (for testing): 123456`
- This is intentional for easy local development

**Production Issues**:
1. Check `/api/admin/email-health` endpoint
2. Review server logs for email errors
3. Verify all 6 environment variables are set
4. Test with `/api/auth/test-email` endpoint

### Getting Help

- **Gmail Issues**: https://support.google.com/mail/answer/7126229
- **Outlook Issues**: https://support.microsoft.com/en-us/account-billing
- **Yahoo Issues**: https://help.yahoo.com/kb/SLN3533.html
- **SendGrid Docs**: https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api
- **Mailgun Docs**: https://documentation.mailgun.com/en/latest/user_manual.html#sending-via-smtp

---

## 🎉 You're Ready!

Your Me2U email verification system is production-ready:
- ✅ Instant OTP delivery (< 5 seconds)
- ✅ Secure 6-digit codes (10-minute expiry)
- ✅ Beautiful HTML email templates
- ✅ Comprehensive error handling
- ✅ Rate limiting (anti-spam)
- ✅ Monitoring & health checks
- ✅ Works with Gmail, Outlook, Yahoo, SendGrid, Mailgun, AWS SES

**Test now**: Run `/api/auth/test-email?email=your@email.com` 🚀
