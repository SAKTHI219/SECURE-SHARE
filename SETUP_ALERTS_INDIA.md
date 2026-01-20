# 🇮🇳 Setting Up SMS & Email Alerts for India

## Current Status
- ✅ **Email Alerts**: Working (SendGrid works globally including India)
- ⚠️ **SMS Alerts**: Need valid Twilio credentials OR Indian SMS provider

---

## Option 1: Use Twilio for India (Recommended for Global)

### Step 1: Get Twilio Credentials
1. Go to https://www.twilio.com/try-twilio
2. Sign up with your email
3. Verify your phone number (use Indian +91 number)
4. Get $15 free trial credit

### Step 2: Get Your Credentials
1. Go to https://console.twilio.com/
2. Copy these from dashboard:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)

### Step 3: Get a Phone Number
**For India:**
1. Go to Phone Numbers → Buy a Number
2. Search for numbers in: **United States** or **United Kingdom** (Twilio doesn't sell Indian numbers directly)
3. Buy a number (costs $1/month from trial credit)
4. This number will work to send SMS to Indian numbers

### Step 4: Enable Indian SMS
1. Go to Messaging → Settings → Geo Permissions
2. Enable **India** in the countries list
3. Save changes

### Step 5: Update Your App
Add these to `/app/backend/.env`:
```
TWILIO_ACCOUNT_SID=AC_your_actual_sid_here
TWILIO_AUTH_TOKEN=your_actual_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

Then restart:
```bash
sudo supervisorctl restart backend
```

---

## Option 2: Use Indian SMS Provider (Better for India)

### MSG91 (Popular in India)
1. Sign up at https://msg91.com/
2. Get 100 free SMS for testing
3. Better delivery rates in India
4. Lower cost for Indian numbers

**Integration:**
- Get API Key from MSG91 dashboard
- We'll need to modify the code to use MSG91 API instead of Twilio

### Gupshup (Another Indian Option)
1. Sign up at https://www.gupshup.io/
2. Good for Indian SMS delivery
3. Free trial available

---

## Option 3: Email Only (Quick Start)

If you want to test the system immediately:
1. SMS will fail silently (logged in backend)
2. Email alerts will still work
3. You'll receive intrusion alerts via email only

**Current Email Setup:**
- ✅ SendGrid API Key: Already configured
- ✅ From Email: sakthiyadev@gmail.com
- ✅ Works globally including India

---

## Testing After Setup

### Test 1: Register with Indian Number
```
Name: Your Name
Email: your@email.com
Phone: +919876543210  (Indian format)
Password: YourPassword123
```

### Test 2: Create & Access File
1. Upload real + decoy files
2. Create share link
3. Access with wrong password
4. Check for alerts:
   - 📧 Email: Check sakthiyadev@gmail.com
   - 📱 SMS: Check +919876543210

---

## Current Implementation

The system now:
1. ✅ **Handles Indian phone numbers** (+91 prefix)
2. ✅ **Graceful degradation** (works even if SMS fails)
3. ✅ **Logs alert status** (sms_sent, email_sent in database)
4. ✅ **Better error messages** in logs
5. ✅ **Copy button fixed** (works in all browsers)

---

## Troubleshooting

### SMS Not Receiving?
1. Check backend logs: `tail -f /var/log/supervisor/backend.out.log`
2. Look for: "SMS sent successfully" or "SMS failed"
3. Verify Twilio credentials are correct
4. Check Twilio console for error messages

### Email Not Receiving?
1. Check spam folder
2. Verify SendGrid API key is valid
3. Check backend logs for email errors
4. Verify sender email (sakthiyadev@gmail.com) is verified in SendGrid

### Phone Number Format
✅ Correct formats:
- +919876543210 (Indian with country code)
- +911234567890
- +919123456789

❌ Wrong formats:
- 9876543210 (missing +91)
- 09876543210 (wrong prefix)

---

## Cost Estimation (Twilio)

For production use:
- **SMS**: ~₹0.50 per SMS to India
- **Phone Number**: ~₹75/month
- **Free Trial**: $15 (enough for ~1000 SMS)

---

## Recommended Setup for India

**Best Option:**
1. **Email**: SendGrid (Already working ✅)
2. **SMS**: MSG91 or Gupshup (Better for India)

**Alternative:**
1. **Email**: SendGrid (Already working ✅)
2. **SMS**: Twilio with proper configuration

---

## Next Steps

**To enable SMS alerts right now:**

1. **Quick Test (Email Only):**
   - System works as-is
   - Email alerts functional
   - SMS fails silently

2. **Full Setup (SMS + Email):**
   - Get Twilio/MSG91 credentials
   - Update `.env` file
   - Restart backend
   - Test with Indian phone number

Choose your option and I'll help you configure it!
