/**
 * Behavioral Analytics Service
 * Analyzes user and entity behavior patterns for anomaly detection
 */

import { SecurityEvent, BehavioralBaseline, BehaviorPattern, BehaviorMetrics } from '@/types';
import { Logger } from '@/utils/logger';
import { DatabaseService } from '../database/DatabaseService';

/**
 * Behavioral Analytics Configuration
 */
interface BehavioralConfig {
  baselineWindow: number; // hours
  anomalyThreshold: number; // 0-1
  learningRate: number; // 0-1
  minSamplesForBaseline: number;
  updateInterval: number; // minutes
}

/**
 * Behavioral analysis result
 */
interface BehavioralResult {
  anomalies: BehaviorAnomaly[];
  riskScore: number;
  confidence: number;
  baselineComparison: BaselineComparison;
  recommendations: string[];
}

/**
 * Behavior anomaly detected
 */
interface BehaviorAnomaly {
  type: string;
  description: string;
  severity: number;
  confidence: number;
  deviation: number;
  baseline: number;
  current: number;
  timeframe: string;
}

/**
 * Baseline comparison metrics
 */
interface BaselineComparison {
  overallDeviation: number;
  patternDeviations: Record<string, number>;
  riskFactors: string[];
  normalPatterns: number;
  anomalousPatterns: number;
}

/**
 * Behavioral Analytics Service
 * Implements machine learning-based behavioral analysis
 */
export class BehavioralAnalytics {
  private readonly logger: Logger;
  private readonly config: BehavioralConfig;
  private readonly database: DatabaseService;
  private baselines: Map<string, BehavioralBaseline> = new Map();
  private isInitialized: boolean = false;
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(config: BehavioralConfig, database: DatabaseService) {
    this.config = config;
    this.database = database;
    this.logger = new Logger('BehavioralAnalytics');
  }

  /**
   * Initialize the behavioral analytics service
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Behavioral Analytics');

      // Load existing baselines from database
      await this.loadBaselines();

      // Start baseline update timer
      this.startBaselineUpdates();

      this.isInitialized = true;
      this.logger.info('Behavioral Analytics initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Behavioral Analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze a security event for behavioral anomalies
   */
  async analyzeEvent(event: SecurityEvent): Promise<BehavioralResult> {
    if (!this.isInitialized) {
      throw new Error('Behavioral Analytics not initialized');
    }

    try {
      const anomalies: BehaviorAnomaly[] = [];
      let totalRiskScore = 0;
      let totalConfidence = 0;
      let analysisCount = 0;

      // Analyze each entity in the event
      for (const [entityType, entities] of Object.entries(event.normalizedData.entities)) {
        for (const entity of entities) {
          const entityAnalysis = await this.analyzeEntityBehavior(entity, event);
          
          if (entityAnalysis.anomalies.length > 0) {
            anomalies.push(...entityAnalysis.anomalies);
            totalRiskScore += entityAnalysis.riskScore;
            totalConfidence += entityAnalysis.confidence;
            analysisCount++;
          }
        }
      }

      // Calculate overall metrics
      const riskScore = analysisCount > 0 ? totalRiskScore / analysisCount : 0;
      const confidence = analysisCount > 0 ? totalConfidence / analysisCount : 0;

      // Generate baseline comparison
      const baselineComparison = await this.generateBaselineComparison(event, anomalies);

      // Generate recommendations
      const recommendations = this.generateRecommendations(anomalies, baselineComparison);

      const result: BehavioralResult = {
        anomalies,
        riskScore,
        confidence,
        baselineComparison,
        recommendations,
      };

      this.logger.debug('Behavioral analysis completed', {
        eventId: event.id,
        anomalies: anomalies.length,
        riskScore,
        confidence,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to analyze event behavior', { 
        eventId: event.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Analyze behavior for a specific entity
   */
  private async analyzeEntityBehavior(
    entity: any, 
    event: SecurityEvent
  ): Promise<{
    anomalies: BehaviorAnomaly[];
    riskScore: number;
    confidence: number;
  }> {
    const entityId = entity.id;
    const entityType = entity.type;
    const baseline = this.baselines.get(entityId);

    if (!baseline) {
      // No baseline exists, create initial baseline
      await this.createInitialBaseline(entityId, entityType, event);
      return { anomalies: [], riskScore: 0, confidence: 0 };
    }

    const anomalies: BehaviorAnomaly[] = [];
    let totalRiskScore = 0;
    let totalConfidence = 0;
    let analysisCount = 0;

    // Analyze each behavior pattern
    for (const pattern of baseline.patterns) {
      const currentValue = this.extractPatternValue(event, pattern.type);
      const analysis = this.analyzePattern(pattern, currentValue, event.timestamp);

      if (analysis.isAnomaly) {
        anomalies.push({
          type: pattern.type,
          description: this.generateAnomalyDescription(pattern, analysis),
          severity: analysis.severity,
          confidence: analysis.confidence,
          deviation: analysis.deviation,
          baseline: pattern.frequency,
          current: currentValue,
          timeframe: this.getTimeframe(event.timestamp),
        });

        totalRiskScore += analysis.severity * analysis.confidence;
        totalConfidence += analysis.confidence;
        analysisCount++;
      }
    }

    return {
      anomalies,
      riskScore: analysisCount > 0 ? totalRiskScore / analysisCount : 0,
      confidence: analysisCount > 0 ? totalConfidence / analysisCount : 0,
    };
  }

  /**
   * Analyze a specific behavior pattern
   */
  private analyzePattern(
    pattern: BehaviorPattern, 
    currentValue: number, 
    timestamp: Date
  ): {
    isAnomaly: boolean;
    severity: number;
    confidence: number;
    deviation: number;
  } {
    // Calculate statistical deviation
    const mean = pattern.frequency;
    const stdDev = pattern.variance;
    const zScore = stdDev > 0 ? Math.abs(currentValue - mean) / stdDev : 0;

    // Determine if this is an anomaly
    const isAnomaly = zScore > this.config.anomalyThreshold;

    // Calculate severity based on deviation
    const severity = Math.min(1.0, zScore / 3.0); // Cap at 1.0 for 3+ standard deviations

    // Calculate confidence based on baseline strength
    const confidence = Math.min(1.0, pattern.frequency / 100); // More samples = higher confidence

    // Calculate deviation percentage
    const deviation = stdDev > 0 ? (Math.abs(currentValue - mean) / mean) * 100 : 0;

    return {
      isAnomaly,
      severity,
      confidence,
      deviation,
    };
  }

  /**
   * Extract pattern value from event
   */
  private extractPatternValue(event: SecurityEvent, patternType: string): number {
    switch (patternType) {
      case 'login_pattern':
        return event.normalizedData.entities.users.length;
      case 'data_access':
        return event.normalizedData.entities.files.length;
      case 'network_communication':
        return event.normalizedData.entities.networks.length;
      case 'file_operations':
        return event.normalizedData.entities.files.length;
      case 'process_execution':
        return event.normalizedData.entities.processes.length;
      case 'privilege_escalation':
        return event.normalizedData.risk.score;
      default:
        return 1; // Default to 1 for unknown patterns
    }
  }

  /**
   * Generate anomaly description
   */
  private generateAnomalyDescription(pattern: BehaviorPattern, analysis: any): string {
    const deviationPercent = Math.round(analysis.deviation);
    
    if (analysis.deviation > 200) {
      return `Extreme ${pattern.type} activity: ${deviationPercent}% above normal`;
    } else if (analysis.deviation > 100) {
      return `High ${pattern.type} activity: ${deviationPercent}% above normal`;
    } else if (analysis.deviation > 50) {
      return `Elevated ${pattern.type} activity: ${deviationPercent}% above normal`;
    } else {
      return `Unusual ${pattern.type} activity: ${deviationPercent}% deviation from normal`;
    }
  }

  /**
   * Get timeframe string for anomaly
   */
  private getTimeframe(timestamp: Date): string {
    const hour = timestamp.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Create initial baseline for new entity
   */
  private async createInitialBaseline(
    entityId: string, 
    entityType: string, 
    event: SecurityEvent
  ): Promise<void> {
    const baseline: BehavioralBaseline = {
      entityId,
      entityType: entityType as any,
      patterns: this.initializePatterns(),
      metrics: this.initializeMetrics(),
      lastUpdated: new Date(),
      confidence: 0.1, // Low confidence for new baseline
    };

    this.baselines.set(entityId, baseline);
    await this.database.storeBaseline(baseline);

    this.logger.info('Created initial baseline', { entityId, entityType });
  }

  /**
   * Initialize behavior patterns
   */
  private initializePatterns(): BehaviorPattern[] {
    return [
      {
        type: 'login_pattern',
        frequency: 0,
        timing: { businessHours: 0, afterHours: 0, weekends: 0, holidays: 0, peakHours: [] },
        context: [],
        variance: 0,
      },
      {
        type: 'data_access',
        frequency: 0,
        timing: { businessHours: 0, afterHours: 0, weekends: 0, holidays: 0, peakHours: [] },
        context: [],
        variance: 0,
      },
      {
        type: 'network_communication',
        frequency: 0,
        timing: { businessHours: 0, afterHours: 0, weekends: 0, holidays: 0, peakHours: [] },
        context: [],
        variance: 0,
      },
      {
        type: 'file_operations',
        frequency: 0,
        timing: { businessHours: 0, afterHours: 0, weekends: 0, holidays: 0, peakHours: [] },
        context: [],
        variance: 0,
      },
      {
        type: 'process_execution',
        frequency: 0,
        timing: { businessHours: 0, afterHours: 0, weekends: 0, holidays: 0, peakHours: [] },
        context: [],
        variance: 0,
      },
    ];
  }

  /**
   * Initialize behavior metrics
   */
  private initializeMetrics(): BehaviorMetrics {
    return {
      mean: 0,
      median: 0,
      standardDeviation: 0,
      percentiles: {},
      outliers: [],
    };
  }

  /**
   * Generate baseline comparison
   */
  private async generateBaselineComparison(
    event: SecurityEvent, 
    anomalies: BehaviorAnomaly[]
  ): Promise<BaselineComparison> {
    const patternDeviations: Record<string, number> = {};
    const riskFactors: string[] = [];
    let normalPatterns = 0;
    let anomalousPatterns = 0;

    // Analyze each entity's baseline
    for (const [entityType, entities] of Object.entries(event.normalizedData.entities)) {
      for (const entity of entities) {
        const baseline = this.baselines.get(entity.id);
        if (baseline) {
          for (const pattern of baseline.patterns) {
            const currentValue = this.extractPatternValue(event, pattern.type);
            const deviation = pattern.frequency > 0 
              ? Math.abs(currentValue - pattern.frequency) / pattern.frequency 
              : 0;

            patternDeviations[pattern.type] = deviation;

            if (deviation > this.config.anomalyThreshold) {
              anomalousPatterns++;
              riskFactors.push(`${pattern.type} deviation`);
            } else {
              normalPatterns++;
            }
          }
        }
      }
    }

    const overallDeviation = Object.values(patternDeviations).reduce((sum, dev) => sum + dev, 0) / 
      Object.keys(patternDeviations).length;

    return {
      overallDeviation,
      patternDeviations,
      riskFactors,
      normalPatterns,
      anomalousPatterns,
    };
  }

  /**
   * Generate behavioral recommendations
   */
  private generateRecommendations(
    anomalies: BehaviorAnomaly[], 
    comparison: BaselineComparison
  ): string[] {
    const recommendations: string[] = [];

    if (anomalies.length > 0) {
      recommendations.push(`Investigate ${anomalies.length} behavioral anomalies detected`);
    }

    if (comparison.overallDeviation > 0.5) {
      recommendations.push('High overall behavioral deviation - consider user training');
    }

    if (comparison.riskFactors.length > 3) {
      recommendations.push('Multiple risk factors detected - comprehensive review recommended');
    }

    const criticalAnomalies = anomalies.filter(a => a.severity > 0.8);
    if (criticalAnomalies.length > 0) {
      recommendations.push(`${criticalAnomalies.length} critical behavioral anomalies require immediate attention`);
    }

    return recommendations;
  }

  /**
   * Update baseline with new event data
   */
  async updateBaseline(event: SecurityEvent): Promise<void> {
    try {
      for (const [entityType, entities] of Object.entries(event.normalizedData.entities)) {
        for (const entity of entities) {
          const entityId = entity.id;
          let baseline = this.baselines.get(entityId);

          if (!baseline) {
            await this.createInitialBaseline(entityId, entityType, event);
            baseline = this.baselines.get(entityId);
          }

          if (baseline) {
            await this.updateEntityBaseline(baseline, event);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to update baseline', { 
        eventId: event.id, 
        error: error.message 
      });
    }
  }

  /**
   * Update baseline for specific entity
   */
  private async updateEntityBaseline(baseline: BehavioralBaseline, event: SecurityEvent): Promise<void> {
    // Update each pattern with new data
    for (const pattern of baseline.patterns) {
      const currentValue = this.extractPatternValue(event, pattern.type);
      
      // Update frequency using exponential moving average
      pattern.frequency = (1 - this.config.learningRate) * pattern.frequency + 
                         this.config.learningRate * currentValue;

      // Update variance
      const deviation = Math.abs(currentValue - pattern.frequency);
      pattern.variance = (1 - this.config.learningRate) * pattern.variance + 
                        this.config.learningRate * deviation;

      // Update timing patterns
      this.updateTimingPattern(pattern, event.timestamp);
    }

    // Update metrics
    baseline.metrics = this.calculateMetrics(baseline.patterns);
    baseline.lastUpdated = new Date();
    baseline.confidence = Math.min(1.0, baseline.confidence + 0.01);

    // Store updated baseline
    this.baselines.set(baseline.entityId, baseline);
    await this.database.storeBaseline(baseline);
  }

  /**
   * Update timing pattern based on event timestamp
   */
  private updateTimingPattern(pattern: BehaviorPattern, timestamp: Date): void {
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    const isWeekend = day === 0 || day === 6;
    const isBusinessHours = hour >= 9 && hour <= 17;

    if (isBusinessHours && !isWeekend) {
      pattern.timing.businessHours++;
    } else if (!isBusinessHours && !isWeekend) {
      pattern.timing.afterHours++;
    } else if (isWeekend) {
      pattern.timing.weekends++;
    }

    // Update peak hours
    if (!pattern.timing.peakHours.includes(hour)) {
      pattern.timing.peakHours.push(hour);
    }
  }

  /**
   * Calculate behavior metrics from patterns
   */
  private calculateMetrics(patterns: BehaviorPattern[]): BehaviorMetrics {
    const frequencies = patterns.map(p => p.frequency);
    const sortedFrequencies = [...frequencies].sort((a, b) => a - b);

    return {
      mean: frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length,
      median: sortedFrequencies[Math.floor(sortedFrequencies.length / 2)],
      standardDeviation: this.calculateStandardDeviation(frequencies),
      percentiles: this.calculatePercentiles(sortedFrequencies),
      outliers: this.detectOutliers(frequencies),
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentiles
   */
  private calculatePercentiles(sortedValues: number[]): Record<number, number> {
    const percentiles: Record<number, number> = {};
    const percentilesToCalculate = [25, 50, 75, 90, 95, 99];

    for (const p of percentilesToCalculate) {
      const index = Math.floor((p / 100) * (sortedValues.length - 1));
      percentiles[p] = sortedValues[index] || 0;
    }

    return percentiles;
  }

  /**
   * Detect outliers using IQR method
   */
  private detectOutliers(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(val => val < lowerBound || val > upperBound);
  }

  /**
   * Load baselines from database
   */
  private async loadBaselines(): Promise<void> {
    try {
      const baselines = await this.database.getBaselines();
      
      for (const baseline of baselines) {
        this.baselines.set(baseline.entityId, baseline);
      }

      this.logger.info('Loaded baselines', { count: baselines.length });
    } catch (error) {
      this.logger.error('Failed to load baselines', { error: error.message });
    }
  }

  /**
   * Start baseline update timer
   */
  private startBaselineUpdates(): void {
    this.updateTimer = setInterval(async () => {
      try {
        await this.cleanupOldBaselines();
      } catch (error) {
        this.logger.error('Failed to cleanup old baselines', { error: error.message });
      }
    }, this.config.updateInterval * 60 * 1000);
  }

  /**
   * Cleanup old baselines
   */
  private async cleanupOldBaselines(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    for (const [entityId, baseline] of this.baselines.entries()) {
      if (baseline.lastUpdated < cutoffDate) {
        this.baselines.delete(entityId);
        await this.database.deleteBaseline(entityId);
      }
    }
  }

  /**
   * Process analyst feedback to improve baselines
   */
  async processFeedback(feedback: any): Promise<void> {
    try {
      if (feedback.entityId && feedback.isFalsePositive) {
        const baseline = this.baselines.get(feedback.entityId);
        if (baseline) {
          // Adjust baseline to reduce false positives
          baseline.confidence = Math.max(0.1, baseline.confidence - 0.05);
          await this.database.storeBaseline(baseline);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process feedback', { error: error.message });
    }
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(cutoffDate: Date): Promise<void> {
    try {
      await this.database.cleanupBaselines(cutoffDate);
      this.logger.info('Behavioral analytics cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup old data', { error: error.message });
    }
  }

  /**
   * Shutdown the behavioral analytics service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Behavioral Analytics');
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.isInitialized = false;
  }
}
