# 🐾 PetPal - Comprehensive Pet Food Safety Platform

<!--
SEO Keywords: pet food safety, veterinary database, pet nutrition, food toxicity, animal health, pet care, dogs, cats, rabbits, hamsters, birds, turtles, fish, lizards, snakes, AI-powered, multi-pet support, cross-platform, real-time analysis, gemini-ai
-->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-000000.svg)](https://expressjs.com/)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%20AI-orange.svg)](https://ai.google.dev/)

PetPal is an intelligent, AI-powered platform that helps pet owners make informed decisions about food safety across 9 different pet species. Using veterinary databases and AI technology, PetPal provides instant safety assessments for foods including dogs, cats, rabbits, hamsters, birds, turtles, fish, lizards, and snakes.

## 🌟 **How It Works**

When you input a food item, PetPal:
1. **🔍 Searches** our comprehensive veterinary database (sourced from ManyPets and ASPCA)
2. **🤖 Analyzes** using Google Gemini AI for unknown foods
3. **⚡ Returns** instant safety results with detailed explanations
4. **📚 Provides** recommendations and severity levels for each pet type

**Safety Categories:**
- ✅ **Safe** - Generally safe for your pet
- ⚠️ **Caution** - Safe in moderation, consult your vet
- ❌ **Unsafe** - Avoid completely, potentially harmful

## 🐾 **Supported Animals**

PetPal provides specialized safety data for **9 different pet types**:

| Animal | Icon | Database Entries | Special Notes |
|--------|------|------------------|---------------|
| **Dogs** | 🐕 | 170+ foods | Most comprehensive data |
| **Cats** | 🐱 | 170+ foods | Includes toxicity warnings |
| **Rabbits** | 🐰 | 50+ foods | Digestive-specific advice |
| **Hamsters** | 🐹 | 40+ foods | Size-appropriate portions |
| **Birds** | 🐦 | 45+ foods | Species-specific variations |
| **Turtles** | 🐢 | 30+ foods | Aquatic vs terrestrial |
| **Fish** | 🐠 | 25+ foods | Freshwater/saltwater safe |
| **Lizards** | 🦎 | 35+ foods | Species diet considerations |
| **Snakes** | 🐍 | 20+ foods | Carnivorous diet focus |

## 📊 **Sample Data & API Examples**

### Example API Request/Response:
```bash
# Check if chocolate is safe for dogs
curl -X POST http://localhost:3000/api/food-safety/check \
  -H "Content-Type: application/json" \
  -d '{"pet": "dog", "food": "chocolate"}'
```

```json
{
  "pet": "dog",
  "food": "chocolate",
  "safety": "unsafe",
  "message": "❌ DANGER: Chocolate is toxic to dogs and can cause serious health issues",
  "details": {
    "severity": "high",
    "symptoms": "Vomiting, diarrhea, seizures, heart problems",
    "source": "ManyPets Veterinary Database",
    "recommendation": "Contact veterinarian immediately if consumed"
  }
}
```

### Safe Food Example:
```json
{
  "pet": "cat",
  "food": "salmon",
  "safety": "safe",
  "message": "✅ SAFE: Salmon is generally safe for cats in moderation",
  "details": {
    "source": "ManyPets Veterinary Database",
    "recommendation": "Cooked salmon without bones or seasoning"
  }
}
```

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

## ✨ Features & Capabilities

### 🎯 **Core Features**
- **Multi-Species Support**: Safety data for 9 different animal types
- **Instant Analysis**: Real-time food safety checking with immediate results
- **Veterinary Database**: 570+ foods with professional safety data
- **AI Fallback**: Intelligent analysis for unknown foods using Google Gemini AI
- **Severity Classification**: Clear risk categorization (Safe/Caution/Unsafe)
- **Cross-Platform**: Web app, mobile app, and comprehensive API access

### 🔬 **How Food Safety Detection Works**
```
User Input → Database Lookup → AI Analysis → Safety Result
    ↓              ↓              ↓            ↓
"chocolate"  → ManyPets DB  → Gemini AI  → "❌ UNSAFE"
"carrot"     → Found match  → Skip AI     → "✅ SAFE"
"newberry"   → Not found   → AI analysis → "⚠️ CAUTION"
```

### 🏗️ **Backend API**
- **Food Safety Checks**: `POST /api/food-safety/check` - Primary safety analysis endpoint
- **Safe Foods Lists**: `GET /api/food-safety/safe/:petType` - Curated safe food collections
- **Unsafe Foods Lists**: `GET /api/food-safety/unsafe/:petType` - Hazardous food warnings
- **Supported Species**: `GET /api/food-safety/pets` - Complete pet type registry
- **External API Integration**: Intelligent fallback to AI when database coverage is incomplete
- **Comprehensive Testing**: Full test suite with Jest and Supertest frameworks
- **Robust Error Handling**: Detailed error messages with actionable guidance

### 🖥️ **Web Application**
- **Modern UI**: Responsive design with Tailwind CSS styling
- **Smart Pet Selection**: Choose from 9 supported pet species
- **Intelligent Food Search**: Advanced search with autocomplete functionality
- **Detailed Results Display**: Color-coded safety information with comprehensive explanations
- **Safe Foods Explorer**: Browse curated lists of safe foods by pet type
- **Mobile Responsive**: Seamless experience across all devices

### 📱 **Mobile App (React Native + Expo)**
- **Cross-platform**: iOS and Android support
- **Native Performance**: Smooth, responsive user experience
- **Camera Integration**: Future food recognition capabilities
- **Offline Support**: Cache safe food lists for offline access
- **Push Notifications**: Instant food recall alerts and personalized safety updates
- **App Store Ready**: Build configurations for deployment

## 🚀 **Quick Start Guide**

### Prerequisites
- **Node.js** (v16 or later) - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Package manager
- **Git** - Version control
- **API Keys** (optional) - For AI features

### 1️⃣ **Backend Setup** (Required)
```bash
# Clone the repository
git clone https://github.com/Sunayana225/Petpal.git
cd Petpal/petpal-backend

# Install dependencies
npm install

# Set up environment variables (optional - works without API keys)
cp .env.example .env
# Edit .env file with your API keys if you want AI features

# Start development server
npm run dev
# Server runs on http://localhost:3000
```

### 2️⃣ **Web App Setup** (Frontend)
```bash
# In a new terminal
cd ../petpal-web

# Install dependencies
npm install

# Start development server
npm start
# Web app runs on http://localhost:3000
```

### 3️⃣ **Mobile App Setup** (Optional)
```bash
# In a new terminal
cd ../petpal-backend/PetPalMobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
# Scan QR code with Expo Go app
```

### 4️⃣ **Test the API** (Verification)
```bash
# Test if backend is running
curl http://localhost:3000/api/health

# Test food safety check
curl -X POST http://localhost:3000/api/food-safety/check \
  -H "Content-Type: application/json" \
  -d '{"pet": "dog", "food": "apple"}'
```

## 🔧 Environment Variables & Configuration

### Backend (.env) - Complete Setup
```bash
# Required for production deployment
PORT=3000
NODE_ENV=development

# AI API Keys (optional - app works without these)
GEMINI_API_KEY=your_gemini_api_key_here

# Future AI Integration (not yet implemented)
# OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration (future expansion)
# DATABASE_URL=your_database_url_here
# REDIS_URL=your_redis_url_here

# Security (recommended for production)
# JWT_SECRET=your_jwt_secret_here
# CORS_ORIGIN=https://yourfrontend.com

# External APIs (future integrations)
# DOG_FOOD_API_KEY=your_dog_food_api_key_if_available
```

### Frontend
No environment variables required for basic functionality. The web app connects to the backend API automatically.

### AI Features Configuration
The app works perfectly **without AI API keys** using the built-in veterinary database. AI is only used as an intelligent fallback for unknown foods:

- **With AI Keys**: Unknown foods receive intelligent analysis with detailed safety assessments
- **Without AI Keys**: Unknown foods return professional "consult veterinarian" guidance
- **Database Coverage**: 570+ foods already covered without requiring AI assistance

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

## 🧪 Testing & Quality Assurance

### Running Tests
```bash
# Backend API tests (Jest + Supertest)
cd petpal-backend
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report

# Web app tests (React Testing Library)
cd petpal-web
npm test                    # Run all tests
npm run test:coverage      # Generate coverage report
```

### Test Coverage
- **Backend**: 85%+ coverage including API endpoints, service logic, and error handling
- **Frontend**: 70%+ coverage for components and user interactions
- **Integration Tests**: End-to-end API testing with real database queries
- **Error Scenarios**: Comprehensive testing of edge cases and failures

### Code Quality Tools
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type safety and better development experience
- **Jest**: Unit and integration testing framework

## 📖 Complete API Documentation

### Base URL
- **Local Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### Endpoints Overview

#### 🏥 Health & Status
```bash
GET /api/health
# Returns: Server status and uptime

GET /api/info  
# Returns: API version, supported pets, and endpoint list
```

#### 🔍 Food Safety Checks
```bash
POST /api/food-safety/check
Content-Type: application/json

# Request Body:
{
  "food": "chocolate",
  "petType": "dog"
}

# Response:
{
  "pet": "dog",
  "food": "chocolate", 
  "safety": "unsafe",
  "message": "❌ DANGER: Chocolate is toxic to dogs",
  "details": {
    "severity": "high",
    "source": "ManyPets Veterinary Database",
    "recommendation": "Contact veterinarian immediately"
  }
}
```

#### 📋 Food Lists  
```bash
GET /api/food-safety/safe/:petType
# Returns: List of all safe foods for the specified pet

GET /api/food-safety/unsafe/:petType  
# Returns: List of all unsafe foods for the specified pet

GET /api/food-safety/pets
# Returns: List of all supported pet types
```

### Response Codes
- **200**: Success
- **400**: Bad request (missing parameters)
- **404**: Resource not found
- **500**: Server error

### Error Response Format
```json
{
  "error": "Bad Request",
  "message": "Pet and food parameters are required",
  "code": 400
}
```

## 🛠️ Technology Stack & Architecture

### Backend Technology
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety and better development experience
- **Jest** - Testing framework with Supertest for API testing
- **Morgan** - HTTP request logging middleware
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware

### Frontend Technology
- **React** - Modern UI library with hooks
- **TypeScript** - Type safety across the frontend
- **Tailwind CSS** - Utility-first styling framework
- **React Router** - Client-side routing and navigation
- **Axios** - HTTP client for API communication

### Mobile Technology
- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and build service
- **TypeScript** - Consistent typing across platforms
- **React Navigation** - Native navigation library
- **Expo CLI** - Development and build tools

### Data Sources & AI Integration
- **ManyPets Database**: 570+ veterinary-verified food entries
- **ASPCA Guidelines**: Additional safety references
- **Google Gemini AI**: Intelligent analysis for unknown foods
- **Real-time Processing**: Instant database lookups with AI fallback

### Architecture Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web/Mobile    │───▶│   Express API   │───▶│   Food Safety   │
│     Frontend    │    │    (Node.js)    │    │    Service      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Response   │◀───│   Gemini AI     │◀───│  ManyPets DB    │
│   (Fallback)    │    │   (Optional)    │    │  (Primary)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 **Live Demo & Screenshots**

### 🌐 **Try It Live**
- **Web App**: [Coming Soon - Deploy to Vercel]
- **API Playground**: `https://your-api-domain.com/api/info`
- **Mobile App**: Available via Expo Go (scan QR code after running locally)

### 📸 **Example Usage**

**Web Interface Demo:**
```
🐕 Pet: Dog | 🍎 Food: Apple
┌─────────────────────────────────────┐
│ ✅ SAFE                            │
│ Apples are generally safe for dogs  │
│ Remove seeds and core before feeding│
│ Source: ManyPets Veterinary DB      │
└─────────────────────────────────────┘
```

**API Response Demo:**
```bash
curl -X POST localhost:3000/api/food-safety/check \
  -d '{"pet":"cat","food":"tuna"}'

# Response:
{
  "safety": "safe",
  "message": "✅ Tuna is safe for cats in moderation",
  "details": {
    "recommendation": "Fresh or canned in water, avoid mercury-rich varieties"
  }
}
```

## 🤝 Contributing & Development

### Development Workflow
1. **Fork** the repository on GitHub
2. **Clone** your fork locally: `git clone https://github.com/YourUsername/Petpal.git`
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Install** dependencies: `npm install` (in each project directory)
5. **Make** your changes with tests
6. **Test** thoroughly: `npm test` (ensure all tests pass)
7. **Commit** with clear messages: `git commit -m 'Add amazing feature'`
8. **Push** to your branch: `git push origin feature/amazing-feature`
9. **Open** a Pull Request with detailed description

### Code Standards
- **TypeScript**: All new code must be properly typed
- **Tests**: Add tests for new features (aim for 80%+ coverage)
- **ESLint**: Follow the existing code style
- **Documentation**: Update README for new features or API changes
- **Commits**: Use conventional commit messages

### Areas for Contribution
- 🐾 **New Pet Types**: Add support for more animals
- 🥗 **Food Database**: Expand the food safety database
- 🤖 **AI Improvements**: Enhance AI analysis accuracy
- 🎨 **UI/UX**: Improve user interface and experience
- 📱 **Mobile Features**: Add camera recognition, notifications
- 🔒 **Security**: Improve authentication and data protection
- 🌍 **Localization**: Add support for multiple languages

### Reporting Issues
Found a bug or have a feature request? Please check existing issues first, then:
1. Use the **Bug Report** template for bugs
2. Use the **Feature Request** template for new features  
3. Provide **clear reproduction steps** for bugs
4. Include **environment details** (OS, Node version, etc.)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments & Data Sources

### 🏥 **Veterinary Data Sources**
- **ManyPets**: Primary food safety database with 570+ verified entries
- **ASPCA**: Additional safety guidelines and toxicity information  
- **Veterinary Professionals**: Expert review and validation of safety data
- **Pet Poison Helpline**: Emergency contact information and protocols

### 🤖 **AI Technology Partners**
- **Google Gemini**: Advanced language model for unknown food analysis
- **Veterinary AI Research**: Ongoing collaboration for accuracy improvements

### 🛠️ **Open Source Community**
- **React Community**: Amazing frameworks and component libraries
- **Node.js Ecosystem**: Robust backend tooling and middleware
- **Expo Team**: Excellent mobile development platform
- **TypeScript Team**: Type safety that makes development a joy

### 📚 **Educational Resources**
- Pet nutrition research papers and veterinary journals
- Animal poison control center guidelines
- Species-specific dietary requirement studies

## 📞 Support & Resources

### 🆘 **Emergency Pet Situations**
**If your pet has consumed something harmful:**
1. **Contact your veterinarian immediately**
2. **Call Pet Poison Helpline**: (855) 764-7661
3. **ASPCA Poison Control**: (888) 426-4435
4. **Have ready**: Pet's weight, amount consumed, time of consumption

### 💬 **Project Support**
- **📧 Email**: [Create an issue on GitHub]
- **🐛 Bug Reports**: Use GitHub Issues with the Bug template
- **💡 Feature Requests**: Use GitHub Issues with the Feature template
- **📖 Documentation**: Check the wiki for detailed guides
- **💬 Discussions**: Use GitHub Discussions for questions

### 🔗 **Useful Links**
- **🌐 Live Demo**: [Coming Soon]
- **📱 Mobile App**: Available via Expo Go
- **🔧 API Documentation**: Included in this README
- **🧪 Test Coverage**: Check GitHub Actions for latest results
- **📦 NPM Packages**: Backend and frontend packages

### ⚖️ **Legal & Disclaimer**
- **License**: MIT License - see LICENSE file for details
- **Disclaimer**: This app provides general information only. Always consult with a veterinarian for pet health decisions
- **Data Accuracy**: We strive for accuracy but cannot guarantee 100% correctness
- **Emergency**: This app is not a substitute for professional veterinary care

---

**Made with ❤️ for pet lovers everywhere!** 🐕🐱🐰🐹🐦🐢🐠🦎🐍

*Last updated: July 16, 2025*
