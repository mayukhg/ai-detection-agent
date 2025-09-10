/**
 * AI Detection Engineering Agent
 * Core AI system that orchestrates LLM, Behavioral Analytics, and Graph Correlation
 */

import { SecurityEvent, DetectionRule, AIRecommendation, ThreatIntelligence } from '@/types';
import { Logger } from '@/utils/logger';
import { LLMService } from './LLMService';
import { BehavioralAnalytics } from './BehavioralAnalytics';
import { GraphCorrelationEngine } from './GraphCorrelationEngine';
import { KnowledgeBaseService } from './KnowledgeBaseService';
import { EventBus } from '@/utils/event-bus';

/**
 * AI Detection Agent Configuration
 */
interface DetectionAgentConfig {
  llm: {
    provider: 'openai' | 'anthropic' | 'local';
    model: string;
    temperature: number;
    maxTokens: number;
  };
  behavioral: {
    baselineWindow: number; // hours
    anomalyThreshold: number;
    learningRate: number;
  };
  graph: {
    correlationWindow: number; // hours
    minCorrelationStrength: number;
    maxGraphSize: number;
  };
  knowledge: {
    updateInterval: number; // minutes
    confidenceThreshold: number;
  };
}

/**
 * Agent processing statistics
 */
interface AgentStats {
  eventsProcessed: number;
  rulesGenerated: number;
  recommendationsCreated: number;
  falsePositivesReduced: number;
  lastProcessingTime: number;
  averageProcessingTime: number;
}

/**
 * AI Detection Engineering Agent
 * Orchestrates all AI components for intelligent threat detection
 */
export class DetectionAgent {
  private readonly logger: Logger;
  private readonly config: DetectionAgentConfig;
  private readonly llmService: LLMService;
  private readonly behavioralAnalytics: BehavioralAnalytics;
  private readonly graphCorrelation: GraphCorrelationEngine;
  private readonly knowledgeBase: KnowledgeBaseService;
  private readonly eventBus: EventBus;
  
  private stats: AgentStats;
  private isProcessing: boolean = false;
  private processingQueue: SecurityEvent[] = [];
  private activeRules: Map<string, DetectionRule> = new Map();

  constructor(config: DetectionAgentConfig) {
    this.config = config;
    this.logger = new Logger('DetectionAgent');
    this.eventBus = new EventBus();
    
    // Initialize AI services
    this.llmService = new LLMService(config.llm);
    this.behavioralAnalytics = new BehavioralAnalytics(config.behavioral);
    this.graphCorrelation = new GraphCorrelationEngine(config.graph);
    this.knowledgeBase = new KnowledgeBaseService(config.knowledge);
    
    // Initialize stats
    this.stats = {
      eventsProcessed: 0,
      rulesGenerated: 0,
      recommendationsCreated: 0,
      falsePositivesReduced: 0,
      lastProcessingTime: 0,
      averageProcessingTime: 0,
    };

    this.setupEventHandlers();
  }

  /**
   * Initialize the detection agent
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing AI Detection Agent');

      // Initialize all services
      await Promise.all([
        this.llmService.initialize(),
        this.behavioralAnalytics.initialize(),
        this.graphCorrelation.initialize(),
        this.knowledgeBase.initialize(),
      ]);

      // Load existing rules
      await this.loadActiveRules();

      // Start background processing
      this.startBackgroundProcessing();

      this.logger.info('AI Detection Agent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Detection Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Process a security event through the AI pipeline
   */
  async processEvent(event: SecurityEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Processing security event', { eventId: event.id, source: event.source });

      // Add to processing queue
      this.processingQueue.push(event);

      // Process if not already processing
      if (!this.isProcessing) {
        await this.processQueue();
      }

      // Update stats
      this.stats.eventsProcessed++;
      this.stats.lastProcessingTime = Date.now() - startTime;
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime + this.stats.lastProcessingTime) / 2;

    } catch (error) {
      this.logger.error('Failed to process event', { 
        eventId: event.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const event = this.processingQueue.shift();
        if (!event) continue;

        await this.processEventPipeline(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process event through the complete AI pipeline
   */
  private async processEventPipeline(event: SecurityEvent): Promise<void> {
    try {
      // Step 1: Behavioral Analysis
      const behavioralResult = await this.behavioralAnalytics.analyzeEvent(event);
      
      // Step 2: Graph Correlation
      const correlationResult = await this.graphCorrelation.correlateEvent(event);
      
      // Step 3: Knowledge Base Enrichment
      const enrichmentResult = await this.knowledgeBase.enrichEvent(event);
      
      // Step 4: Rule Evaluation
      const ruleResults = await this.evaluateRules(event, {
        behavioral: behavioralResult,
        correlation: correlationResult,
        enrichment: enrichmentResult,
      });

      // Step 5: Generate Recommendations
      if (ruleResults.needsRecommendation) {
        await this.generateRecommendations(event, ruleResults);
      }

      // Step 6: Update Learning Models
      await this.updateLearningModels(event, {
        behavioral: behavioralResult,
        correlation: correlationResult,
        enrichment: enrichmentResult,
        rules: ruleResults,
      });

      this.logger.debug('Event processed successfully', { 
        eventId: event.id,
        behavioralAnomalies: behavioralResult.anomalies.length,
        correlations: correlationResult.correlations.length,
        rulesMatched: ruleResults.matchedRules.length,
      });

    } catch (error) {
      this.logger.error('Error in event pipeline', { 
        eventId: event.id, 
        error: error.message 
      });
    }
  }

  /**
   * Evaluate detection rules against the event
   */
  private async evaluateRules(
    event: SecurityEvent, 
    context: any
  ): Promise<{
    matchedRules: DetectionRule[];
    needsRecommendation: boolean;
    falsePositiveRisk: number;
  }> {
    const matchedRules: DetectionRule[] = [];
    let needsRecommendation = false;
    let falsePositiveRisk = 0;

    for (const rule of this.activeRules.values()) {
      try {
        const matchResult = await this.evaluateRule(rule, event, context);
        
        if (matchResult.matches) {
          matchedRules.push(rule);
          
          // Check if this might be a false positive
          if (matchResult.confidence < 0.7) {
            falsePositiveRisk += (1 - matchResult.confidence) * 0.3;
          }

          // Check if we need new rules for this pattern
          if (matchResult.confidence > 0.8 && !this.hasSimilarRule(rule, event)) {
            needsRecommendation = true;
          }
        }
      } catch (error) {
        this.logger.error('Error evaluating rule', { 
          ruleId: rule.id, 
          eventId: event.id, 
          error: error.message 
        });
      }
    }

    return {
      matchedRules,
      needsRecommendation,
      falsePositiveRisk: Math.min(1.0, falsePositiveRisk),
    };
  }

  /**
   * Evaluate a single rule against an event
   */
  private async evaluateRule(
    rule: DetectionRule, 
    event: SecurityEvent, 
    context: any
  ): Promise<{ matches: boolean; confidence: number; reason: string }> {
    try {
      // Use LLM to evaluate rule logic
      const evaluationPrompt = this.buildRuleEvaluationPrompt(rule, event, context);
      const llmResult = await this.llmService.evaluateRule(evaluationPrompt);
      
      return {
        matches: llmResult.matches,
        confidence: llmResult.confidence,
        reason: llmResult.reason,
      };
    } catch (error) {
      this.logger.error('Error in rule evaluation', { 
        ruleId: rule.id, 
        error: error.message 
      });
      return { matches: false, confidence: 0, reason: 'Evaluation error' };
    }
  }

  /**
   * Build prompt for rule evaluation
   */
  private buildRuleEvaluationPrompt(
    rule: DetectionRule, 
    event: SecurityEvent, 
    context: any
  ): string {
    return `
Evaluate if the following security event matches the detection rule:

RULE: ${rule.name}
DESCRIPTION: ${rule.description}
LOGIC: ${rule.logic.query}
CONDITIONS: ${JSON.stringify(rule.logic.conditions, null, 2)}

EVENT DATA:
- Type: ${event.eventType}
- Severity: ${event.severity}
- Source: ${event.source}
- Entities: ${JSON.stringify(event.normalizedData.entities, null, 2)}
- Context: ${JSON.stringify(event.normalizedData.context, null, 2)}
- Indicators: ${JSON.stringify(event.normalizedData.indicators, null, 2)}

BEHAVIORAL ANALYSIS:
- Anomalies: ${context.behavioral.anomalies.length}
- Risk Score: ${context.behavioral.riskScore}

GRAPH CORRELATION:
- Correlations: ${context.correlation.correlations.length}
- Network Strength: ${context.correlation.networkStrength}

KNOWLEDGE BASE:
- Threat Intel Matches: ${context.enrichment.threatMatches.length}
- Attack Patterns: ${context.enrichment.attackPatterns.length}

Respond with JSON:
{
  "matches": boolean,
  "confidence": number (0-1),
  "reason": "explanation"
}
    `.trim();
  }

  /**
   * Generate AI recommendations based on event analysis
   */
  private async generateRecommendations(
    event: SecurityEvent, 
    ruleResults: any
  ): Promise<void> {
    try {
      const recommendations = await this.llmService.generateRecommendations({
        event,
        ruleResults,
        existingRules: Array.from(this.activeRules.values()),
        knowledgeBase: await this.knowledgeBase.getRelevantKnowledge(event),
      });

      for (const recommendation of recommendations) {
        await this.createRecommendation(recommendation);
        this.stats.recommendationsCreated++;
      }

      this.logger.info('Generated recommendations', { 
        count: recommendations.length,
        eventId: event.id 
      });
    } catch (error) {
      this.logger.error('Failed to generate recommendations', { 
        eventId: event.id, 
        error: error.message 
      });
    }
  }

  /**
   * Create a recommendation in the system
   */
  private async createRecommendation(recommendation: AIRecommendation): Promise<void> {
    try {
      // Store recommendation in knowledge base
      await this.knowledgeBase.storeRecommendation(recommendation);
      
      // Emit event for UI updates
      this.eventBus.emit('recommendation.created', recommendation);
      
      this.logger.info('Recommendation created', { 
        id: recommendation.id,
        type: recommendation.type,
        priority: recommendation.priority 
      });
    } catch (error) {
      this.logger.error('Failed to create recommendation', { 
        recommendationId: recommendation.id, 
        error: error.message 
      });
    }
  }

  /**
   * Update learning models with new event data
   */
  private async updateLearningModels(event: SecurityEvent, context: any): Promise<void> {
    try {
      // Update behavioral baselines
      await this.behavioralAnalytics.updateBaseline(event);
      
      // Update graph correlations
      await this.graphCorrelation.updateGraph(event, context);
      
      // Update knowledge base
      await this.knowledgeBase.updateWithEvent(event, context);
      
      this.logger.debug('Learning models updated', { eventId: event.id });
    } catch (error) {
      this.logger.error('Failed to update learning models', { 
        eventId: event.id, 
        error: error.message 
      });
    }
  }

  /**
   * Check if we have a similar rule for this event pattern
   */
  private hasSimilarRule(rule: DetectionRule, event: SecurityEvent): boolean {
    // Simple similarity check - can be enhanced with more sophisticated matching
    const eventType = event.eventType.toLowerCase();
    const ruleTechnique = rule.metadata.mitreTechniques[0]?.toLowerCase() || '';
    
    return eventType.includes(ruleTechnique) || ruleTechnique.includes(eventType);
  }

  /**
   * Load active rules from knowledge base
   */
  private async loadActiveRules(): Promise<void> {
    try {
      const rules = await this.knowledgeBase.getActiveRules();
      
      for (const rule of rules) {
        this.activeRules.set(rule.id, rule);
      }
      
      this.logger.info('Loaded active rules', { count: rules.length });
    } catch (error) {
      this.logger.error('Failed to load active rules', { error: error.message });
    }
  }

  /**
   * Start background processing tasks
   */
  private startBackgroundProcessing(): void {
    // Update knowledge base every hour
    setInterval(async () => {
      try {
        await this.knowledgeBase.updateThreatIntelligence();
      } catch (error) {
        this.logger.error('Failed to update threat intelligence', { error: error.message });
      }
    }, this.config.knowledge.updateInterval * 60 * 1000);

    // Clean up old data every 24 hours
    setInterval(async () => {
      try {
        await this.cleanupOldData();
      } catch (error) {
        this.logger.error('Failed to cleanup old data', { error: error.message });
      }
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  private async cleanupOldData(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      // Clean up old events from processing queue
      this.processingQueue = this.processingQueue.filter(
        event => event.timestamp > cutoffDate
      );
      
      // Clean up old behavioral data
      await this.behavioralAnalytics.cleanupOldData(cutoffDate);
      
      // Clean up old graph data
      await this.graphCorrelation.cleanupOldData(cutoffDate);
      
      this.logger.info('Old data cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup old data', { error: error.message });
    }
  }

  /**
   * Setup event handlers for inter-service communication
   */
  private setupEventHandlers(): void {
    this.eventBus.on('rule.updated', (rule: DetectionRule) => {
      this.activeRules.set(rule.id, rule);
      this.logger.info('Rule updated', { ruleId: rule.id });
    });

    this.eventBus.on('rule.deleted', (ruleId: string) => {
      this.activeRules.delete(ruleId);
      this.logger.info('Rule deleted', { ruleId });
    });

    this.eventBus.on('feedback.received', async (feedback: any) => {
      await this.processFeedback(feedback);
    });
  }

  /**
   * Process analyst feedback to improve AI models
   */
  private async processFeedback(feedback: any): Promise<void> {
    try {
      // Update behavioral analytics with feedback
      await this.behavioralAnalytics.processFeedback(feedback);
      
      // Update rule performance metrics
      if (feedback.ruleId) {
        await this.updateRulePerformance(feedback.ruleId, feedback);
      }
      
      // Update false positive reduction stats
      if (feedback.isFalsePositive) {
        this.stats.falsePositivesReduced++;
      }
      
      this.logger.info('Feedback processed', { 
        feedbackId: feedback.id,
        isFalsePositive: feedback.isFalsePositive 
      });
    } catch (error) {
      this.logger.error('Failed to process feedback', { 
        feedbackId: feedback.id, 
        error: error.message 
      });
    }
  }

  /**
   * Update rule performance based on feedback
   */
  private async updateRulePerformance(ruleId: string, feedback: any): Promise<void> {
    const rule = this.activeRules.get(ruleId);
    if (!rule) return;

    // Update performance metrics
    if (feedback.isFalsePositive) {
      rule.performance.falsePositives++;
    } else {
      rule.performance.truePositives++;
    }

    // Recalculate metrics
    const total = rule.performance.truePositives + rule.performance.falsePositives;
    rule.performance.accuracy = rule.performance.truePositives / total;
    rule.performance.precision = rule.performance.truePositives / 
      (rule.performance.truePositives + rule.performance.falsePositives);
    
    rule.performance.lastUpdated = new Date();

    // Store updated rule
    await this.knowledgeBase.updateRule(rule);
  }

  /**
   * Get agent statistics
   */
  getStats(): AgentStats {
    return { ...this.stats };
  }

  /**
   * Get active rules count
   */
  getActiveRulesCount(): number {
    return this.activeRules.size;
  }

  /**
   * Get processing queue size
   */
  getQueueSize(): number {
    return this.processingQueue.length;
  }

  /**
   * Shutdown the detection agent
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Detection Agent');
      
      // Stop background processing
      this.isProcessing = false;
      this.processingQueue = [];
      
      // Shutdown services
      await Promise.all([
        this.llmService.shutdown(),
        this.behavioralAnalytics.shutdown(),
        this.graphCorrelation.shutdown(),
        this.knowledgeBase.shutdown(),
      ]);
      
      this.logger.info('Detection Agent shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
    }
  }
}
