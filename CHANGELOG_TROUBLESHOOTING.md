# Changelog Access Troubleshooting Guide

## Issue: Cannot access `/changelog/create` - redirects to `/home`

### Steps to Debug:

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for these log messages:
     - `🔍 Checking auth and session...`
     - `✅ User logged in:` - Shows your user data
     - `🔐 Authorization result:` - Shows if you're authorized

2. **Check Backend Server Console**
   - Look for these messages:
     - `🔍 Checking changelog auth for user:`
     - `👤 Checking authorization for UID:`
     - `📄 User data:` - Shows what data is in Firestore
     - `✅ Final authorization result:`

3. **Common Issues:**

   **A. Backend Server Not Running**
   - Error: Network request fails
   - Solution: Start backend server
   ```bash
   cd server
   npm start
   ```

   **B. Firebase Service Account Not Configured**
   - Backend Error: `Error initializing Firebase Admin`
   - Solution: Set `FIREBASE_SERVICE_ACCOUNT` environment variable in `.env`

   **C. User Data Missing in Firestore**
   - Backend Log: `❌ User document not found in Firestore`
   - Solution: Ensure your user profile exists in Firestore `users` collection

   **D. User Data Doesn't Match Authorized Users**
   - Backend Log: Shows user data but all matches are `false`
   - Solution: Check if your user has one of these fields matching:
     - `customUID`: `549-110-NAM` or `318-131-SAS`
     - `username`: `taikhoangphu2 minhtriet` or `Kelvin Huynh`
     - `atName`: `kelvinhuynh` or `minhtri_cofounder`

4. **Verify Your User Data:**
   
   Open browser console and run:
   ```javascript
   // Get current user from auth store
   const user = useAuthStore.getState().user;
   console.log('My user data:', {
     uid: user.uid,
     customUID: user.customUID,
     username: user.username,
     atName: user.atName
   });
   ```

5. **Manual Firestore Check:**
   - Go to Firebase Console
   - Open Firestore Database
   - Navigate to `users/{your-uid}`
   - Verify you have one of the authorized fields

6. **Add Your User to Authorized List:**
   
   If you need to add yourself, edit `server/routes/changelog.js`:
   ```javascript
   const AUTHORIZED_USERS = [
     {
       customUID: '549-110-NAM',
       username: 'taikhoangphu2 minhtriet',
       atName: 'kelvinhuynh'
     },
     {
       customUID: '318-131-SAS',
       username: 'Kelvin Huynh',
       atName: 'minhtri_cofounder'
     },
     // Add your user here
     {
       customUID: 'YOUR-CUSTOM-UID',
       username: 'YOUR-USERNAME',
       atName: 'YOUR-AT-NAME'
     }
   ];
   ```

7. **Test Authorization API Directly:**
   
   In browser console:
   ```javascript
   // Get your auth token
   const token = await auth.currentUser.getIdToken();
   const captchaToken = JSON.parse(localStorage.getItem('captcha_verification')).token;

   // Test authorization endpoint
   const response = await fetch('http://localhost:5000/api/changelog/check-auth', {
     headers: {
       'Authorization': `Bearer ${token}`,
       'X-Captcha-Token': captchaToken
     }
   });
   const result = await response.json();
   console.log('Authorization result:', result);
   ```

## Expected Flow:

1. Visit `/changelog/create`
2. See "Loading..." (while auth loads)
3. Backend checks your user data
4. If authorized: Shows password prompt
5. If not authorized: Shows error for 3 seconds, then redirects to `/changelog`
6. If not logged in: Redirects to `/home`

## Quick Fix:

If you're logged in but not authorized, the easiest solution is to update your Firestore user document:

1. Go to Firebase Console → Firestore
2. Find your user document: `users/{your-uid}`
3. Add one of these fields:
   - `customUID`: `549-110-NAM` (or create your own)
   - `atName`: `kelvinhuynh` (or create your own)
4. Refresh the page

## Need Help?

Check the logs in both:
- **Browser Console** (Frontend logs with 🔍 🔐 emojis)
- **Backend Server Console** (Backend logs with 👤 📄 emojis)

The logs will tell you exactly where the authorization is failing!
