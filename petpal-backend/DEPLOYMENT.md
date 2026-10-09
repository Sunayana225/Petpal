# PetPal Production Deployment Guide

## Prerequisites

1. **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Hosting Account**: Choose one:
   - [Vercel](https://vercel.com) (Recommended for Node.js)
   - [Railway](https://railway.app) (Good for full-stack apps)
   - [Render](https://render.com) (Alternative option)

## Backend Deployment

### Option 1: Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd petpal-backend
   npm run build
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `NODE_ENV`: production
   - `CORS_ORIGIN`: Your frontend domain(s)

### Option 2: Railway Deployment

1. **Connect GitHub Repository** to Railway
2. **Set Environment Variables**:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `NODE_ENV`: production
   - `PORT`: 3001 (Railway will override this)
   - `CORS_ORIGIN`: Your frontend domain(s)

3. **Deploy**: Railway will auto-deploy from your GitHub repository

### Option 3: Manual Server Deployment

1. **Prepare Server** (Ubuntu/CentOS):
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy Application**:
   ```bash
   # Clone repository
   git clone your-repo-url
   cd petpal-backend
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   
   # Create production environment file
   cp .env.production.example .env.production
   # Edit .env.production with your actual values
   
   # Start with PM2
   pm2 start dist/server.js --name "petpal-api"
   pm2 save
   pm2 startup
   ```

## Mobile App Configuration

### Update Production API URL

1. **Set Environment Variable**:
   ```bash
   export EXPO_PUBLIC_API_URL=https://your-deployed-api.com/api
   ```

2. **Update app.config.js** with your production API URL

### Build for App Stores

#### iOS Build (requires macOS)

1. **Install EAS CLI**:
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS**:
   ```bash
   cd PetPalMobile
   eas build:configure
   ```

4. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

#### Android Build

1. **Build for Android**:
   ```bash
   eas build --platform android
   ```

2. **Download APK/AAB** from Expo dashboard

## Environment Variables Reference

### Backend (.env.production)
```env
GEMINI_API_KEY=your_actual_gemini_api_key
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.com
LOG_LEVEL=warn
```

### Mobile App
```env
EXPO_PUBLIC_API_URL=https://your-deployed-api.com/api
```

## Post-Deployment Checklist

- [ ] Backend health check responds: `GET /api/health`
- [ ] API endpoints work: `POST /api/food-safety/check`
- [ ] CORS configured for your domains
- [ ] Environment variables set correctly
- [ ] Mobile app connects to production API
- [ ] Error monitoring configured (optional)
- [ ] SSL certificate active (HTTPS)

## Monitoring & Maintenance

### Health Checks
- Backend: `https://your-api.com/api/health`
- API Info: `https://your-api.com/api/info`

### Logs
- Vercel: Check function logs in dashboard
- Railway: View logs in project dashboard
- Manual: `pm2 logs petpal-api`

### Updates
1. Update code in repository
2. Rebuild and redeploy backend
3. Update mobile app and rebuild if needed

## Troubleshooting

### Common Issues

1. **CORS Errors**: Update `CORS_ORIGIN` environment variable
2. **API Connection Failed**: Check API URL in mobile app config
3. **Gemini API Errors**: Verify API key and quota
4. **Build Failures**: Check Node.js version (18+ required)

### Support
- Check logs for detailed error messages
- Verify all environment variables are set
- Test API endpoints with tools like Postman
