import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Simple in-memory metrics storage (in production, use Redis or a proper metrics store)
interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    byEndpoint: Record<string, number>;
  };
  performance: {
    averageResponseTime: number;
    slowestRequest: number;
    fastestRequest: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  uptime: {
    startTime: number;
    lastRestart: string;
  };
}

const metrics: Metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: {}
  },
  performance: {
    averageResponseTime: 0,
    slowestRequest: 0,
    fastestRequest: Infinity
  },
  errors: {
    total: 0,
    byType: {}
  },
  uptime: {
    startTime: Date.now(),
    lastRestart: new Date().toISOString()
  }
};

// Middleware to track metrics
export const trackMetrics = (req: Request, res: Response, next: any) => {
  const startTime = Date.now();
  
  // Track request
  metrics.requests.total++;
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  metrics.requests.byEndpoint[endpoint] = (metrics.requests.byEndpoint[endpoint] || 0) + 1;
  
  // Track response completion
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    // Update performance metrics
    if (responseTime < metrics.performance.fastestRequest) {
      metrics.performance.fastestRequest = responseTime;
    }
    if (responseTime > metrics.performance.slowestRequest) {
      metrics.performance.slowestRequest = responseTime;
    }

    // Update success/failure counts
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
      metrics.errors.total++;
      const errorType = `${Math.floor(res.statusCode / 100)}xx`;
      metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
    }

    // Calculate average response time
    metrics.performance.averageResponseTime =
      (metrics.performance.averageResponseTime * (metrics.requests.total - 1) + responseTime) / metrics.requests.total;
  });
  
  next();
};

/**
 * GET /api/monitoring/metrics
 * Get application metrics
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const currentTime = Date.now();
  const uptimeSeconds = Math.floor((currentTime - metrics.uptime.startTime) / 1000);
  
  const response = {
    ...metrics,
    uptime: {
      ...metrics.uptime,
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds)
    },
    timestamp: new Date().toISOString(),
    requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  res.json(response);
}));

/**
 * GET /api/monitoring/status
 * Get system status
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      port: process.env.PORT || 3001
    },
    health: {
      errorRate: metrics.requests.total > 0 ? (metrics.requests.failed / metrics.requests.total * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: Math.round(metrics.performance.averageResponseTime) + 'ms',
      totalRequests: metrics.requests.total,
      totalErrors: metrics.errors.total
    },
    requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  res.json(status);
}));

/**
 * POST /api/monitoring/reset
 * Reset metrics (development only)
 */
router.post('/reset', asyncHandler(async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Metrics reset is not allowed in production'
    });
  }
  
  // Reset metrics
  Object.assign(metrics, {
    requests: { total: 0, successful: 0, failed: 0, byEndpoint: {} },
    performance: { averageResponseTime: 0, slowestRequest: 0, fastestRequest: Infinity },
    errors: { total: 0, byType: {} },
    uptime: { startTime: Date.now(), lastRestart: new Date().toISOString() }
  });
  
  res.json({
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString()
  });
}));

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export { router as monitoringRouter, metrics };
