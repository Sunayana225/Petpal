# Deploy to Vercel (Alternative Option)

Vercel is excellent for serverless deployments and has a generous free tier.

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Login to Vercel

```bash
vercel login
```

## Step 3: Deploy

```bash
cd petpal-backend
npm run build
vercel --prod
```

## Step 4: Configure Environment Variables

During deployment or in Vercel dashboard:

```
GEMINI_API_KEY = AIzaSyCUInx2BgrBAUjuAFAC8lVqZDsxsD2YYSM
NODE_ENV = production
```

## Step 5: Test Deployment

Your API will be available at: `https://your-project-name.vercel.app`

Test endpoints:
- `https://your-project-name.vercel.app/api/health`
- `https://your-project-name.vercel.app/api/info`

## Pros and Cons

**Vercel Pros:**
- Excellent for serverless
- Fast global CDN
- Easy custom domains

**Vercel Cons:**
- 10-second function timeout on free tier
- May have cold starts

**Railway Pros:**
- Always-on containers
- No timeout limits
- Better for persistent connections

**Recommendation:** Use Railway for this project as it's better suited for API servers.
