# Deploy to Railway (Recommended - Free Tier Available)

Railway is perfect for beginners and offers a generous free tier.

## Step 1: Prepare Your Code

1. **Make sure your code is in a Git repository**:
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

## Step 2: Deploy to Railway

1. **Go to [Railway.app](https://railway.app)**
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository** (petpal or pets repository)
6. **Select the backend folder** if prompted

## Step 3: Configure Environment Variables

In your Railway project dashboard:

1. **Go to Variables tab**
2. **Add these environment variables**:
   ```
   GEMINI_API_KEY = AIzaSyCUInx2BgrBAUjuAFAC8lVqZDsxsD2YYSM
   NODE_ENV = production
   PORT = 3001
   ```

## Step 4: Configure Build Settings

1. **Go to Settings tab**
2. **Set Root Directory**: `petpal-backend` (if your backend is in a subfolder)
3. **Build Command**: `npm run build`
4. **Start Command**: `npm run start:prod`

## Step 5: Deploy

1. **Click "Deploy"** - Railway will automatically build and deploy
2. **Wait for deployment** (usually 2-3 minutes)
3. **Get your production URL** from the Railway dashboard

## Step 6: Test Your Deployment

Your API will be available at: `https://your-app-name.railway.app`

Test these endpoints:
- Health check: `https://your-app-name.railway.app/api/health`
- API info: `https://your-app-name.railway.app/api/info`

## Step 7: Update Mobile App

Once deployed, update your mobile app configuration:

1. **Copy your Railway URL**
2. **Update the API URL** in your mobile app:
   - Edit `petpal-backend/PetPalMobile/app.config.js`
   - Replace `https://your-production-api.com/api` with `https://your-app-name.railway.app/api`

## Alternative: One-Click Deploy

You can also use this button to deploy directly:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/your-username/your-repo&envs=GEMINI_API_KEY,NODE_ENV&GEMINI_API_KEY=your_api_key&NODE_ENV=production)

## Troubleshooting

- **Build fails**: Check that Node.js version is 18+ in Railway settings
- **App crashes**: Check logs in Railway dashboard
- **API not responding**: Verify environment variables are set correctly

## Free Tier Limits

Railway free tier includes:
- $5 worth of usage per month
- Should be plenty for a pet food safety app
- Automatic scaling
- Custom domains available
