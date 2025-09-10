/**
 * AI Detection Engineering Agent - Backend Server
 * Main entry point for the backend API server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { Logger } from './utils/logger';
import { DatabaseService } from './services/database/DatabaseService';
import { DetectionAgent } from './services/ai/DetectionAgent';
import { EDRConnector } from './services/data-sources/EDRConnector';
import { EventBus } from './utils/event-bus';

// Load environment variables
dotenv.config();

/**
 * Main Application Class
 */
class Application {
  private readonly logger: Logger;
  private readonly app: express.Application;
  private readonly server: any;
  private readonly io: SocketIOServer;
  private readonly database: DatabaseService;
  private readonly detectionAgent: DetectionAgent;
  private readonly eventBus: EventBus;
  private readonly port: number;

  constructor() {
    this.logger = new Logger('Application');
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.WS_CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = parseInt(process.env.PORT || '3001');
    this.database = new DatabaseService(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-detection-agent');
    this.eventBus = new EventBus();
    
    // Initialize detection agent
    this.detectionAgent = new DetectionAgent({
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 2000,
      },
      behavioral: {
        baselineWindow: 24,
        anomalyThreshold: 0.7,
        learningRate: 0.1,
      },
      graph: {
        correlationWindow: 6,
        minCorrelationStrength: 0.5,
        maxGraphSize: 10000,
      },
      knowledge: {
        updateInterval: 60,
        confidenceThreshold: 0.7,
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupDataSources();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => this.logger.info(message.trim()) }
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // API routes
    this.app.use('/api/v1/events', this.createEventsRoutes());
    this.app.use('/api/v1/rules', this.createRulesRoutes());
    this.app.use('/api/v1/recommendations', this.createRecommendationsRoutes());
    this.app.use('/api/v1/analytics', this.createAnalyticsRoutes());
    this.app.use('/api/v1/dashboard', this.createDashboardRoutes());

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', { error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Create events API routes
   */
  private createEventsRoutes(): express.Router {
    const router = express.Router();

    // POST /api/v1/events - Ingest security event
    router.post('/', async (req, res) => {
      try {
        const event = req.body;
        await this.detectionAgent.processEvent(event);
        
        res.json({ 
          success: true, 
          message: 'Event processed successfully',
          eventId: event.id 
        });
      } catch (error) {
        this.logger.error('Failed to process event', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to process event' 
        });
      }
    });

    // GET /api/v1/events - Get recent events
    router.get('/', async (req, res) => {
      try {
        const { limit = 100, offset = 0 } = req.query;
        
        // Implementation would fetch from database
        const events = [];
        
        res.json({ 
          success: true, 
          data: events,
          pagination: { limit, offset, total: events.length }
        });
      } catch (error) {
        this.logger.error('Failed to get events', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to get events' 
        });
      }
    });

    return router;
  }

  /**
   * Create rules API routes
   */
  private createRulesRoutes(): express.Router {
    const router = express.Router();

    // GET /api/v1/rules - Get all rules
    router.get('/', async (req, res) => {
      try {
        const rules = await this.detectionAgent.getActiveRules();
        
        res.json({ 
          success: true, 
          data: rules 
        });
      } catch (error) {
        this.logger.error('Failed to get rules', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to get rules' 
        });
      }
    });

    // POST /api/v1/rules - Create new rule
    router.post('/', async (req, res) => {
      try {
        const rule = req.body;
        // Implementation would create rule
        res.json({ 
          success: true, 
          message: 'Rule created successfully',
          ruleId: rule.id 
        });
      } catch (error) {
        this.logger.error('Failed to create rule', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to create rule' 
        });
      }
    });

    // PUT /api/v1/rules/:id - Update rule
    router.put('/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        // Implementation would update rule
        res.json({ 
          success: true, 
          message: 'Rule updated successfully' 
        });
      } catch (error) {
        this.logger.error('Failed to update rule', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to update rule' 
        });
      }
    });

    return router;
  }

  /**
   * Create recommendations API routes
   */
  private createRecommendationsRoutes(): express.Router {
    const router = express.Router();

    // GET /api/v1/recommendations - Get AI recommendations
    router.get('/', async (req, res) => {
      try {
        // Implementation would fetch recommendations
        const recommendations = [];
        
        res.json({ 
          success: true, 
          data: recommendations 
        });
      } catch (error) {
        this.logger.error('Failed to get recommendations', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to get recommendations' 
        });
      }
    });

    // POST /api/v1/recommendations/:id/approve - Approve recommendation
    router.post('/:id/approve', async (req, res) => {
      try {
        const { id } = req.params;
        // Implementation would approve recommendation
        res.json({ 
          success: true, 
          message: 'Recommendation approved' 
        });
      } catch (error) {
        this.logger.error('Failed to approve recommendation', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to approve recommendation' 
        });
      }
    });

    return router;
  }

  /**
   * Create analytics API routes
   */
  private createAnalyticsRoutes(): express.Router {
    const router = express.Router();

    // GET /api/v1/analytics/stats - Get analytics statistics
    router.get('/stats', async (req, res) => {
      try {
        const stats = this.detectionAgent.getStats();
        
        res.json({ 
          success: true, 
          data: stats 
        });
      } catch (error) {
        this.logger.error('Failed to get analytics stats', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to get analytics stats' 
        });
      }
    });

    return router;
  }

  /**
   * Create dashboard API routes
   */
  private createDashboardRoutes(): express.Router {
    const router = express.Router();

    // GET /api/v1/dashboard/overview - Get dashboard overview
    router.get('/overview', async (req, res) => {
      try {
        const overview = {
          coverage: 82,
          totalAlerts: 1240,
          falsePositiveRate: 12,
          activeRules: this.detectionAgent.getActiveRulesCount(),
          queueSize: this.detectionAgent.getQueueSize(),
        };
        
        res.json({ 
          success: true, 
          data: overview 
        });
      } catch (error) {
        this.logger.error('Failed to get dashboard overview', { error: error.message });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to get dashboard overview' 
        });
      }
    });

    return router;
  }

  /**
   * Setup WebSocket for real-time updates
   */
  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      this.logger.info('Client connected', { socketId: socket.id });

      // Join dashboard room
      socket.join('dashboard');

      // Handle client disconnect
      socket.on('disconnect', () => {
        this.logger.info('Client disconnected', { socketId: socket.id });
      });
    });

    // Listen for events from detection agent
    this.eventBus.on('recommendation.created', (recommendation) => {
      this.io.to('dashboard').emit('recommendation.created', recommendation);
    });

    this.eventBus.on('rule.updated', (rule) => {
      this.io.to('dashboard').emit('rule.updated', rule);
    });
  }

  /**
   * Setup data source connectors
   */
  private setupDataSources(): void {
    // EDR Connector
    const edrConnector = new EDRConnector({
      apiUrl: process.env.EDR_API_URL || 'https://api.edr.example.com',
      apiKey: process.env.EDR_API_KEY || '',
      clientId: process.env.EDR_CLIENT_ID || '',
      pollingInterval: 5000,
      batchSize: 100,
      eventTypes: ['process', 'file', 'network', 'registry'],
      severityThreshold: 'medium',
    });

    // Start EDR connector
    edrConnector.connect()
      .then(() => edrConnector.startListening())
      .catch(error => this.logger.error('Failed to start EDR connector', { error: error.message }));

    // Listen for EDR events
    edrConnector.on('event', async (event) => {
      await this.detectionAgent.processEvent(event);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting AI Detection Engineering Agent Backend');

      // Connect to database
      await this.database.connect();

      // Initialize detection agent
      await this.detectionAgent.initialize();

      // Start HTTP server
      this.server.listen(this.port, () => {
        this.logger.info(`Server running on port ${this.port}`);
        this.logger.info(`API available at http://localhost:${this.port}/api/v1`);
        this.logger.info(`WebSocket available at ws://localhost:${this.port}`);
      });

    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down server');

    try {
      // Shutdown detection agent
      await this.detectionAgent.shutdown();

      // Disconnect from database
      await this.database.disconnect();

      // Close HTTP server
      this.server.close(() => {
        this.logger.info('Server shutdown complete');
        process.exit(0);
      });
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }
}

// Create and start application
const app = new Application();

// Handle graceful shutdown
process.on('SIGINT', () => app.shutdown());
process.on('SIGTERM', () => app.shutdown());

// Start the application
app.start().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
