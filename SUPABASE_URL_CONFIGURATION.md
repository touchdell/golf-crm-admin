# Supabase URL Configuration - Step by Step

## 🎯 Exact Location

Based on your Supabase dashboard, here's exactly where to find it:

### Current Location:
You're currently at: **Authentication → Users**

### What You Need:
Click on **"URL Configuration"** in the left sidebar menu

## 📍 Step-by-Step Instructions

1. **You're already in the right place!**
   - You're in: `Authentication` section
   - Current page: `Users`

2. **Look at the left sidebar menu:**
   You should see this menu:
   ```
   Authentication
   ├── Manage
   ├── Users ← (you are here)
   ├── Notifications
   ├── Email
   ├── Configuration
   ├── Policies
   ├── Sign In / Providers
   ├── Sessions
   ├── Rate Limits
   ├── Multi-Factor
   ├── URL Configuration ← CLICK THIS!
   ├── Attack Protection
   ├── Auth Hooks
   ├── Beta
   ├── Audit Logs
   └── Advanced
   ```

3. **Click "URL Configuration"**
   - It's in the list, just scroll down if needed
   - Click on it

4. **Update the Settings:**
   Once you're on the URL Configuration page, you'll see:

   **Site URL:**
   - Change from: `http://localhost:5173` (or whatever is there)
   - To: `https://your-project.vercel.app` (your actual Vercel URL)

   **Redirect URLs:**
   - Click "Add URL" or the "+" button
   - Add these URLs one by one:
     ```
     https://your-project.vercel.app/**
     https://your-project.vercel.app
     https://*.vercel.app/**
     ```

5. **Save:**
   - Click "Save" button
   - Changes should be saved automatically

## 🔗 Direct Link

If you want to go directly to URL Configuration:
```
https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/auth/url-configuration
```

(Replace `mekooocjsomkbhifnnqy` with your actual project ID if different)

## ✅ What You'll See

On the URL Configuration page, you should see:

1. **Site URL** field (at the top)
   - This is the default redirect URL
   - Update this to your production URL

2. **Redirect URLs** section (below Site URL)
   - List of allowed redirect URLs
   - Add your production URLs here

3. **Save button** (usually at the bottom)

## 🎯 Quick Summary

1. ✅ You're in Authentication section (correct!)
2. ✅ Click "URL Configuration" in the left menu
3. ✅ Update Site URL to your Vercel URL
4. ✅ Add Redirect URLs (3 URLs as listed above)
5. ✅ Save

That's it! No CORS configuration needed - Supabase handles that automatically.


