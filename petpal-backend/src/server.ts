import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { foodSafetyRouter } from './routes/foodSafety';
import { monitoringRouter, trackMetrics } from './routes/monitoring';
import {
  globalErrorHandler,
  notFoundHandler,
  rateLimitHandler,
  healthCheck
} from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security Configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// CORS Configuration
const corsOptions = {
  origin: NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN?.split(',') || ['https://your-frontend-domain.com'])
    : ['http://localhost:3000', 'http://localhost:19006', 'exp://localhost:19000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers for production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

// Metrics tracking middleware
app.use(trackMetrics);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  if (NODE_ENV === 'development') {
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  }
  next();
});

// Input validation is now handled in the routes

// Routes
app.use('/api/food-safety', foodSafetyRouter);
app.use('/api/monitoring', monitoringRouter);

// Health check endpoint with detailed info
app.get('/api/health', healthCheck);

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'PetPal Food Safety API',
    version: '1.0.0',
    description: 'API for checking pet food safety across multiple pet types',
    supportedPets: ['dogs', 'cats', 'rabbits', 'hamsters', 'birds', 'turtles', 'fish', 'lizards', 'snakes'],
    endpoints: {
      health: '/api/health',
      foodSafety: '/api/food-safety/check',
      supportedPets: '/api/food-safety/pets'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Start server
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🐾 PetPal API server running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📖 API info: http://localhost:${PORT}/api/info`);
  console.log(`🌐 Mobile access: http://192.168.0.163:${PORT}/api/health`);
});

export default app;
