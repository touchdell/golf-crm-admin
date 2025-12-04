# Vercel Deployment Troubleshooting Guide

## 🔍 Common Vercel Deployment Errors

### 1. **Build Command Failed**

**Symptoms:**
- Build fails during `npm run build`
- Error in build logs

**Solutions:**
- Check that `package.json` has correct build script: `"build": "tsc -b && vite build"`
- Ensure Node.js version is compatible (Vercel auto-detects, but you can specify in `package.json`):
  ```json
  "engines": {
    "node": ">=18.0.0"
  }
  ```

### 2. **Missing Environment Variables**

**Symptoms:**
- Build succeeds but app doesn't work
- Errors about `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` not defined

**Solutions:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
3. Make sure to add for: **Production**, **Preview**, and **Development**
4. Redeploy after adding variables

### 3. **Output Directory Not Found**

**Symptoms:**
- Build succeeds but deployment fails
- Error: "Output directory 'dist' not found"

**Solutions:**
- Verify `vercel.json` or project settings specify:
  - **Output Directory:** `dist`
  - **Build Command:** `npm run build`
- Check that `dist` folder is generated (it should be in `.gitignore`)

### 4. **TypeScript Compilation Errors**

**Symptoms:**
- Build fails with TypeScript errors
- Type errors in build logs

**Solutions:**
- Run `npm run build` locally first to catch errors
- Fix all TypeScript errors before deploying
- Check `tsconfig.json` configuration

### 5. **Module Not Found Errors**

**Symptoms:**
- Error: "Cannot find module 'X'"
- Missing dependencies

**Solutions:**
- Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify
- Check that `node_modules` is in `.gitignore` (it should be)

### 6. **404 Errors on Page Refresh**

**Symptoms:**
- App works but shows 404 when refreshing pages
- Routes don't work

**Solutions:**
- Verify `vercel.json` has rewrite rules:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
- This is already configured in your project ✅

### 7. **Runtime Errors**

**Symptoms:**
- Build succeeds but app crashes at runtime
- White screen or errors in browser console

**Solutions:**
- Check browser console for errors
- Verify environment variables are set correctly
- Check Supabase connection
- Verify RLS policies are configured

---

## 🔧 How to Check Your Vercel Deployment Logs

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `golf-crm-admin`

2. **View Deployment:**
   - Click on the failed deployment
   - Go to **"Runtime Logs"** or **"Build Logs"** tab

3. **Look for Errors:**
   - Scroll through the logs
   - Look for red error messages
   - Common indicators:
     - `Error:`
     - `Failed:`
     - `Cannot find`
     - `Module not found`

---

## ✅ Quick Fix Checklist

### Step 1: Verify Local Build
```bash
npm run build
```
- Should complete without errors
- Should create `dist` folder

### Step 2: Check Environment Variables in Vercel
- Go to: Project Settings → Environment Variables
- Verify both variables are set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Step 3: Check Build Settings
- Go to: Project Settings → General
- Verify:
  - **Framework Preset:** Vite
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
  - **Install Command:** `npm install`

### Step 4: Check Deployment Logs
- Go to: Deployments → Click on deployment → Logs
- Look for specific error messages
- Copy error message for troubleshooting

---

## 🐛 Specific Error Messages & Fixes

### "Command 'npm run build' exited with 1"
- **Cause:** Build script failed
- **Fix:** Check build logs for specific error, fix TypeScript/build errors

### "Environment variable VITE_SUPABASE_URL is not defined"
- **Cause:** Missing environment variable
- **Fix:** Add environment variables in Vercel settings

### "Output directory 'dist' not found"
- **Cause:** Build didn't create dist folder
- **Fix:** Check build command, ensure it runs successfully

### "Module not found: Can't resolve 'X'"
- **Cause:** Missing dependency
- **Fix:** Add missing package to `package.json` and commit

### "Failed to fetch" or CORS errors
- **Cause:** Supabase connection issue
- **Fix:** Verify environment variables, check Supabase project is active

---

## 📋 Pre-Deployment Verification

Run these commands locally before deploying:

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Build
npm run build

# 3. Verify dist folder exists
ls -la dist/

# 4. Test preview
npm run preview
```

If all these pass, your deployment should work on Vercel.

---

## 🆘 Still Having Issues?

1. **Check Vercel Build Logs:**
   - Copy the exact error message
   - Look at which step failed (install, build, or deploy)

2. **Compare with Local Build:**
   - Run `npm run build` locally
   - Compare errors

3. **Check Vercel Documentation:**
   - https://vercel.com/docs
   - Search for your specific error

4. **Common Issues:**
   - Node version mismatch
   - Missing environment variables
   - Build output directory wrong
   - TypeScript errors

---

## 💡 Pro Tips

1. **Always test build locally first:**
   ```bash
   npm run build
   ```

2. **Check environment variables:**
   - They must be prefixed with `VITE_` for Vite apps
   - Must be set for Production, Preview, AND Development

3. **Monitor build logs:**
   - Watch the build process in real-time
   - Catch errors early

4. **Use Vercel CLI for testing:**
   ```bash
   npm install -g vercel
   vercel
   ```
   This tests deployment locally before pushing to GitHub

---

**Need More Help?** Share the specific error message from Vercel logs and I can help troubleshoot!


