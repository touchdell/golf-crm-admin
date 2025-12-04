# Quick Vercel Deployment Fix

## 🚨 Most Common Issue: Missing Environment Variables

If your Vercel deployment is failing, **90% of the time it's missing environment variables**.

### Quick Fix:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click on your project: `golf-crm-admin`

2. **Add Environment Variables:**
   - Go to: **Settings** → **Environment Variables**
   - Click **"Add New"**
   - Add these TWO variables:

   **Variable 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://mekooocjsomkbhifnnqy.supabase.co` (your Supabase URL)
   - Environments: ✅ Production ✅ Preview ✅ Development

   **Variable 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon key (from Supabase Dashboard → Settings → API)
   - Environments: ✅ Production ✅ Preview ✅ Development

3. **Redeploy:**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a new commit to trigger auto-deploy

---

## 🔍 How to Find Your Supabase Credentials

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project

2. **Get Supabase URL:**
   - Go to: **Settings** → **API**
   - Copy **"Project URL"** (e.g., `https://xxxxx.supabase.co`)

3. **Get Anon Key:**
   - Same page: **Settings** → **API**
   - Under **"Project API keys"**
   - Copy the **`anon` `public`** key (not the `service_role` key!)

---

## ✅ Verify Build Settings

In Vercel Dashboard → Settings → General:

- **Framework Preset:** Vite ✅
- **Build Command:** `npm run build` ✅
- **Output Directory:** `dist` ✅
- **Install Command:** `npm install` ✅

---

## 🐛 If Still Failing

1. **Check Build Logs:**
   - Go to: Deployments → Click deployment → **Build Logs**
   - Look for red error messages
   - Copy the exact error

2. **Common Errors:**

   **"Command 'npm run build' exited with 1"**
   - → Check build logs for TypeScript errors
   - → Fix errors locally first

   **"Cannot find module"**
   - → Ensure all dependencies are in `package.json`
   - → Run `npm install` locally to verify

   **"Environment variable not found"**
   - → Add environment variables (see above)

---

## 📝 Quick Checklist

- [ ] Environment variables added in Vercel
- [ ] Variables set for Production, Preview, AND Development
- [ ] Build settings correct (Vite, dist, npm run build)
- [ ] Local build works (`npm run build`)
- [ ] Redeployed after adding variables

---

**After adding environment variables, redeploy and it should work!** 🚀

