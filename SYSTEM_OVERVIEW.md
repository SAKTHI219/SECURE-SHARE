# SecureShare - Secure File Sharing System with Deceptive Encryption

## System Overview

SecureShare is a comprehensive file sharing system that implements **deceptive encryption** - a security technique where unauthorized access attempts receive fake (decoy) files while the owner is alerted via SMS and email.

## Key Features Implemented

### 1. **Deceptive Encryption System**
- Owner uploads TWO files: Real file + Decoy file
- Both files are encrypted using Fernet encryption
- Access behavior:
  - ✅ **Correct Password**: Serves real file, owner receives success notification
  - ❌ **Wrong Password**: Serves decoy file (attacker thinks they succeeded), owner receives intrusion alert via SMS + Email

### 2. **Multi-Channel Alert System**
- **SMS Alerts** (via Twilio): Instant notifications to owner's phone
- **Email Alerts** (via SendGrid): Detailed email notifications
- Alerts include:
  - File name accessed
  - Timestamp
  - Whether password was correct/incorrect
  - Verification code for intrusion attempts

### 3. **Advanced Share Management**
- Create secure share links with:
  - Password protection
  - Expiry time (configurable in hours)
  - Download limits
  - Unique tokens
- Owner can block links after intrusion attempts

### 4. **Comprehensive Access Logging**
- All access attempts logged with:
  - File accessed
  - Timestamp
  - Password correctness
  - File type served (real/decoy)
  - IP address
  - Verification codes

### 5. **User Management**
- JWT-based authentication
- Secure password hashing (bcrypt)
- User profile with phone and email for alerts

## Workflow (As Per Diagram)

```
1. START
2. User uploads file + decoy file
3. Owner creates share link with password
4. Recipient tries to access:
   
   IF PASSWORD CORRECT:
   - Shows original file
   - Owner receives success alert
   
   IF PASSWORD WRONG:
   - Displays decoy file (recipient thinks they succeeded)
   - Sends intrusion alert to owner (SMS + Email)
   - Owner can block the link
   
5. END (Owner can reject/block access)
```

## Technical Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (with Motor async driver)
- **Authentication**: JWT tokens, bcrypt password hashing
- **Encryption**: Cryptography library (Fernet symmetric encryption)
- **SMS**: Twilio API
- **Email**: SendGrid API

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS with custom dark theme
- **UI Components**: Shadcn UI
- **Fonts**: Chivo (headings), IBM Plex Sans (body), JetBrains Mono (codes)
- **Animations**: Framer Motion
- **Routing**: React Router v7

## Pages Implemented

1. **Login/Register**: Authentication pages
2. **Dashboard**: Overview with stats, quick actions, recent attempts
3. **Upload Files**: Dual file upload (real + decoy)
4. **Share Management**: Create and manage share links
5. **Access File**: Public page for recipients to access files
6. **Access Logs**: Detailed logging with intrusion detection
7. **Settings**: User profile and security features

## Security Features

✅ End-to-end file encryption (Fernet)
✅ Deceptive file protection (decoy system)
✅ SMS & Email alerts enabled
✅ Access attempt logging
✅ Password-protected shares
✅ Link expiry and download limits
✅ JWT authentication
✅ Bcrypt password hashing

## API Credentials Used

- **Twilio**: For SMS alerts
  - Account SID: AC65cab3dd96a2e5c869badcb44791862f
  - Phone: +12547658339

- **SendGrid**: For email alerts
  - From: sakthiyadev@gmail.com

## Test Results

**Backend**: ✅ 100% (14/14 tests passed)
- User registration/login
- File upload & encryption
- Share link creation
- Correct password access (real file served)
- Wrong password access (decoy served + alerts sent)
- Access logging
- Link blocking

**Frontend**: ✅ 100% functional
- All pages rendering correctly
- Navigation working
- Forms submitting properly
- Authentication flow working
- Dark security-focused theme applied

## How to Use

1. **Register/Login**: Create account with email, phone, password
2. **Upload Files**: Go to Upload page, select real file + decoy file
3. **Create Share Link**: 
   - Select file
   - Set password
   - Configure expiry (hours)
   - Set download limit
4. **Share Link**: Copy and send to recipient
5. **Monitor Access**: View logs to see all access attempts
6. **Block Intruders**: If wrong password detected, block the link

## Design Highlights

- **Dark Theme**: Deep obsidian background (#09090B)
- **Colors**: 
  - Emerald (#10B981) for safe/authorized
  - Red (#EF4444) for alerts/intrusions
- **Glass-morphism**: Transparent cards with backdrop blur
- **Glow Effects**: Emerald glow for secure elements, red glow for alerts
- **Sharp Buttons**: Modern, security-focused UI
- **Monospace Codes**: JetBrains Mono for verification codes and logs

## Next Steps / Enhancements

Potential improvements:
- **Revenue/Conversion**: Add premium tiers with unlimited storage, advanced analytics, custom branding
- **Security**: Add 2FA, IP whitelisting, geo-blocking
- **Analytics**: Detailed dashboards showing intrusion patterns, file popularity
- **Notifications**: Add in-app notifications, webhook integrations
- **File Management**: Bulk operations, folders, file versioning
