# 🐾 PetPal - Comprehensive Pet Food Safety Platform

PetPal is a comprehensive platform that helps pet owners check food safety for their beloved pets. The platform includes a backend API, web application, and mobile app to provide food safety information and recommendations.

## 🏗️ Project Structure

```
petpal-backend/          # Express.js API server
├── src/                 # Source code
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   └── __tests__/      # Test files
├── PetPalMobile/       # React Native mobile app
└── deployment files   # Railway, Vercel configs

petpal-web/             # React web application
├── src/                # Source code
│   ├── components/     # React components
│   ├── pages/         # Page components
│   └── services/      # API services
└── public/            # Static assets
```

## ✨ Features

### Backend API
- **Food Safety Checks**: Check if specific foods are safe for pets
- **Pet Type Support**: Different safety rules for dogs, cats, birds, etc.
- **External API Integration**: Fetch additional food safety data
- **Error Handling**: Comprehensive error handling middleware
- **Testing**: Full test suite with Jest and Supertest

### Web Application
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Pet Selection**: Choose your pet type (dog, cat, bird, etc.)
- **Food Search**: Search and check food safety
- **Results Display**: Clear safety information with explanations
- **Safe Foods List**: Browse lists of safe foods by pet type

### Mobile App (React Native + Expo)
- **Cross-platform**: iOS and Android support
- **Native Performance**: Smooth user experience
- **Camera Integration**: Potential for food recognition features
- **Offline Support**: Cache safe food lists
- **Push Notifications**: Food recall alerts

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or later)
- npm or yarn
- Git

### Backend Setup
```bash
cd petpal-backend
npm install
npm run dev
```

### Web App Setup
```bash
cd petpal-web
npm install
npm start
```

### Mobile App Setup
```bash
cd petpal-backend/PetPalMobile
npm install
npx expo start
```

## 🔧 Environment Variables

### Backend (.env)
```
PORT=3000
NODE_ENV=development
API_KEY=your_external_api_key
```

### Frontend
No environment variables required for basic functionality.

## 📱 Deployment

### Backend Deployment
- **Railway**: One-click deployment with `railway.json`
- **Vercel**: Serverless deployment with `vercel.json`
- **Traditional hosting**: PM2, Docker, or standard Node.js hosting

### Web App Deployment
- **Vercel**: Connect your GitHub repo for automatic deployments
- **Netlify**: Drag and drop build folder or connect GitHub
- **Traditional hosting**: Build and upload to any static hosting

### Mobile App Deployment
- **Expo Application Services (EAS)**: Build and submit to app stores
- **Manual build**: Use Expo CLI to build standalone apps

## 🧪 Testing

```bash
# Backend tests
cd petpal-backend
npm test

# Web app tests
cd petpal-web
npm test
```

## 📖 API Documentation

### Endpoints

#### Food Safety Check
```
POST /api/food-safety/check
Body: {
  "food": "chocolate",
  "petType": "dog"
}
```

#### Get Safe Foods List
```
GET /api/food-safety/safe-foods/:petType
```

#### Health Check
```
GET /api/health
```

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Jest** - Testing framework
- **Morgan** - Logging middleware

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **React Router** - Client-side routing

### Mobile
- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Navigation** - Navigation library

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Pet food safety data from various veterinary sources
- Icons and images from open-source collections
- Community contributions and feedback

## 📞 Support

If you have any questions or need help:
- Open an issue on GitHub
- Check the documentation in each project folder
- Review the deployment guides

---

Made with ❤️ for pet lovers everywhere! 🐕🐱🐦
