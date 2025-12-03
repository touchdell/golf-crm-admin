# Deployment Guide - Golf CRM Admin

## 🎯 Overview

Since we're using **Supabase** as our Backend-as-a-Service (BaaS), the backend is already hosted online. We only need to deploy the **frontend React application**.

---

## 🚀 Recommended Hosting Options

### Option 1: Vercel (Recommended) ⭐
- **Best for:** React/Vite applications
- **Pros:** 
  - Free tier available
  - Automatic deployments from GitHub
  - Built-in CI/CD
  - Fast global CDN
  - Easy environment variable management
- **Cons:** None for this use case
- **Setup Time:** ~10 minutes

### Option 2: Netlify
- **Best for:** Static sites and SPAs
- **Pros:** 
  - Free tier available
  - Easy deployment
  - Good for React apps
- **Cons:** Slightly slower than Vercel
- **Setup Time:** ~10 minutes

### Option 3: Render
- **Best for:** Full-stack apps
- **Pros:** 
  - Free tier available
  - Good documentation
- **Cons:** Can be slower on free tier
- **Setup Time:** ~15 minutes

### Option 4: Cloudflare Pages
- **Best for:** Performance-focused deployments
- **Pros:** 
  - Excellent performance
  - Free tier available
- **Cons:** Slightly more complex setup
- **Setup Time:** ~15 minutes

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All code is committed to Git
- [ ] Application builds successfully (`npm run build`)
- [ ] All tests pass
- [ ] Environment variables are documented
- [ ] Supabase project is set up and working
- [ ] CORS is configured in Supabase (if needed)

---

## 🚀 Deployment: Vercel (Recommended)

### Step 1: Prepare Your Code

1. **Ensure your code is on GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Verify build works locally:**
   ```bash
   npm run build
   ```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Easiest)

1. **Go to Vercel:**
   - Visit: https://vercel.com
   - Sign up/Login with GitHub

2. **Import Project:**
   - Click "Add New Project"
   - Select your GitHub repository
   - Vercel will auto-detect it's a Vite project

3. **Configure Build Settings:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add:
     - `VITE_SUPABASE_URL` = Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
   - Make sure to add for: Production, Preview, and Development

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at: `https://your-project.vercel.app`

#### Option B: Via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Add Environment Variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

### Step 3: Configure Supabase Authentication URLs

**Important:** Supabase handles CORS automatically, but you need to configure redirect URLs for authentication.

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to URL Configuration:**
   - Click **"Authentication"** in the left sidebar
   - In the Authentication submenu, click **"URL Configuration"**
   - (It's in the list: Users, Notifications, Email, Configuration, Policies, Sign In / Providers, Sessions, Rate Limits, Multi-Factor, **URL Configuration**, etc.)

3. **Update Settings:**
   - **Site URL:** Change to `https://your-project.vercel.app`
   - **Redirect URLs:** Click "Add URL" and add:
     - `https://your-project.vercel.app/**`
     - `https://your-project.vercel.app`
     - `https://*.vercel.app/**` (for preview deployments)
   - Click **"Save"**

**See `SUPABASE_URL_CONFIGURATION.md` for detailed step-by-step instructions.**

### Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Test login functionality
3. Test all major features
4. Check browser console for errors

---

## 🌐 Deployment: Netlify

### Step 1: Prepare Your Code

Same as Vercel - ensure code is on GitHub.

### Step 2: Deploy to Netlify

1. **Go to Netlify:**
   - Visit: https://netlify.com
   - Sign up/Login with GitHub

2. **Add New Site:**
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository

3. **Configure Build Settings:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Base directory:** (leave empty)

4. **Add Environment Variables:**
   - Go to Site settings → Environment variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

5. **Deploy:**
   - Click "Deploy site"
   - Your app will be live at: `https://your-project.netlify.app`

---

## 🔧 Post-Deployment Configuration

### 1. Update Supabase Authentication URLs

**Note:** Supabase handles CORS automatically. You only need to configure redirect URLs.

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update "Site URL" to your production URL
3. Add "Redirect URLs":
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app`
   - `https://*.vercel.app/**` (for previews)

**See `SUPABASE_CONFIGURATION.md` for detailed step-by-step instructions.**

### 2. Verify Environment Variables

Ensure these are set in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If you're using Supabase Auth:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your production URL to:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** `https://your-app.vercel.app/**`

### 3. Test Production Environment

- [ ] Login works
- [ ] All API calls work
- [ ] Data loads correctly
- [ ] No CORS errors
- [ ] No console errors

---

## 🔐 Environment Variables Reference

### Required Variables:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Where to Find:
- **Supabase URL:** Dashboard → Settings → API → Project URL
- **Anon Key:** Dashboard → Settings → API → Project API keys → `anon` `public`

---

## 📝 Deployment Checklist

### Before Deployment:
- [ ] Code is committed to Git
- [ ] Build succeeds locally (`npm run build`)
- [ ] All features tested locally
- [ ] Environment variables documented

### During Deployment:
- [ ] Repository connected to hosting platform
- [ ] Build settings configured correctly
- [ ] Environment variables added
- [ ] Build completes successfully

### After Deployment:
- [ ] Site is accessible
- [ ] Supabase CORS configured
- [ ] Supabase redirect URLs updated
- [ ] Login works
- [ ] All features work
- [ ] No console errors
- [ ] Performance is acceptable

---

## 🐛 Troubleshooting

### Build Fails

**Error:** `Module not found`
- **Solution:** Ensure all dependencies are in `package.json`

**Error:** `Environment variable not found`
- **Solution:** Add environment variables in hosting platform settings

### CORS Errors

**Error:** `Access to fetch blocked by CORS policy`
- **Note:** Supabase handles CORS automatically. If you see this error:
  1. Verify environment variables are correct
  2. Check that you're using the correct Supabase URL and anon key
  3. Ensure RLS policies are configured correctly
  4. See `SUPABASE_CONFIGURATION.md` for troubleshooting

### Authentication Issues

**Error:** `Invalid redirect URL`
- **Solution:** Add production URL to Supabase Auth redirect URLs

### 404 Errors on Refresh

**Error:** Page shows 404 when refreshing
- **Solution:** Configure redirect rules (see below)

---

## 🔄 Redirect Rules for SPA

### Vercel (`vercel.json`):
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

### Netlify (`netlify.toml`):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Cloudflare Pages (`_redirects`):
```
/*    /index.html   200
```

---

## 📊 Monitoring & Analytics

### Recommended Tools:
- **Vercel Analytics:** Built-in (if using Vercel)
- **Google Analytics:** Add tracking code
- **Sentry:** Error tracking
- **Supabase Dashboard:** Monitor API usage

---

## 🎉 Success!

Once deployed, your application will be:
- ✅ Accessible worldwide via CDN
- ✅ Automatically deployed on every Git push
- ✅ Secured with HTTPS
- ✅ Fast and performant

**Your app URL:** `https://your-project.vercel.app` (or your chosen platform)

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

---

**Need Help?** Check the troubleshooting section or refer to your hosting platform's documentation.

