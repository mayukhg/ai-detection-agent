/**
 * Knowledge Base Service
 * Manages threat intelligence, rules, and attack patterns
 */

import { 
  DetectionRule, 
  AIRecommendation, 
  ThreatIntelligence, 
  AttackPattern, 
  SecurityEvent 
} from '@/types';
import { Logger } from '@/utils/logger';
import { DatabaseService } from '../database/DatabaseService';
import axios from 'axios';

/**
 * Knowledge Base Configuration
 */
interface KnowledgeConfig {
  updateInterval: number; // minutes
  confidenceThreshold: number; // 0-1
  threatIntelSources: string[];
  mitreAttackApiUrl: string;
  maxRecommendations: number;
}

/**
 * Knowledge Base Service
 * Central repository for threat intelligence and detection rules
 */
export class KnowledgeBaseService {
  private readonly logger: Logger;
  private readonly config: KnowledgeConfig;
  private readonly database: DatabaseService;
  private isInitialized: boolean = false;
  private updateTimer: NodeJS.Timeout | null = null;
  private threatIntelCache: Map<string, ThreatIntelligence> = new Map();
  private attackPatternsCache: Map<string, AttackPattern> = new Map();

  constructor(config: KnowledgeConfig, database: DatabaseService) {
    this.config = config;
    this.database = database;
    this.logger = new Logger('KnowledgeBaseService');
  }

  /**
   * Initialize the knowledge base service
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Knowledge Base Service');

      // Load existing data from database
      await this.loadExistingData();

      // Start background updates
      this.startBackgroundUpdates();

      this.isInitialized = true;
      this.logger.info('Knowledge Base Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Knowledge Base Service', { error: error.message });
      throw error;
    }
  }

  /**
   * Enrich security event with knowledge base data
   */
  async enrichEvent(event: SecurityEvent): Promise<{
    threatMatches: ThreatIntelligence[];
    attackPatterns: AttackPattern[];
    recommendations: string[];
  }> {
    if (!this.isInitialized) {
      throw new Error('Knowledge Base Service not initialized');
    }

    try {
      const threatMatches = await this.findThreatMatches(event);
      const attackPatterns = await this.findAttackPatterns(event);
      const recommendations = this.generateEnrichmentRecommendations(threatMatches, attackPatterns);

      this.logger.debug('Event enriched', {
        eventId: event.id,
        threatMatches: threatMatches.length,
        attackPatterns: attackPatterns.length,
      });

      return {
        threatMatches,
        attackPatterns,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Failed to enrich event', { 
        eventId: event.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find threat intelligence matches for event
   */
  private async findThreatMatches(event: SecurityEvent): Promise<ThreatIntelligence[]> {
    const matches: ThreatIntelligence[] = [];

    // Check IOCs in the event
    for (const ioc of event.normalizedData.indicators.iocs) {
      const threatIntel = this.threatIntelCache.get(ioc.value);
      if (threatIntel && threatIntel.confidence >= this.config.confidenceThreshold) {
        matches.push(threatIntel);
      }
    }

    // Check behavioral indicators
    for (const behavior of event.normalizedData.indicators.behaviors) {
      const matchingThreats = Array.from(this.threatIntelCache.values()).filter(
        threat => threat.description.toLowerCase().includes(behavior.type.toLowerCase())
      );
      matches.push(...matchingThreats);
    }

    // Check network indicators
    if (event.normalizedData.context.network) {
      const network = event.normalizedData.context.network;
      if (network.domain) {
        const domainThreats = Array.from(this.threatIntelCache.values()).filter(
          threat => threat.value === network.domain
        );
        matches.push(...domainThreats);
      }
    }

    return matches;
  }

  /**
   * Find attack patterns matching event
   */
  private async findAttackPatterns(event: SecurityEvent): Promise<AttackPattern[]> {
    const patterns: AttackPattern[] = [];

    // Match by event type
    const eventTypePatterns = Array.from(this.attackPatternsCache.values()).filter(
      pattern => pattern.technique.toLowerCase().includes(event.eventType.toLowerCase())
    );
    patterns.push(...eventTypePatterns);

    // Match by data sources
    const dataSourcePatterns = Array.from(this.attackPatternsCache.values()).filter(
      pattern => pattern.dataSources.includes(event.source)
    );
    patterns.push(...dataSourcePatterns);

    // Match by entities
    for (const [entityType, entities] of Object.entries(event.normalizedData.entities)) {
      const entityPatterns = Array.from(this.attackPatternsCache.values()).filter(
        pattern => pattern.dataSources.includes(entityType)
      );
      patterns.push(...entityPatterns);
    }

    return patterns;
  }

  /**
   * Generate enrichment recommendations
   */
  private generateEnrichmentRecommendations(
    threatMatches: ThreatIntelligence[], 
    attackPatterns: AttackPattern[]
  ): string[] {
    const recommendations: string[] = [];

    if (threatMatches.length > 0) {
      recommendations.push(`Found ${threatMatches.length} threat intelligence matches`);
    }

    if (attackPatterns.length > 0) {
      recommendations.push(`Identified ${attackPatterns.length} potential attack patterns`);
    }

    const highConfidenceThreats = threatMatches.filter(t => t.confidence > 0.8);
    if (highConfidenceThreats.length > 0) {
      recommendations.push(`${highConfidenceThreats.length} high-confidence threats require immediate attention`);
    }

    return recommendations;
  }

  /**
   * Get active detection rules
   */
  async getActiveRules(): Promise<DetectionRule[]> {
    try {
      return await this.database.getActiveRules();
    } catch (error) {
      this.logger.error('Failed to get active rules', { error: error.message });
      return [];
    }
  }

  /**
   * Store recommendation in knowledge base
   */
  async storeRecommendation(recommendation: AIRecommendation): Promise<void> {
    try {
      await this.database.storeRecommendation(recommendation);
      this.logger.info('Recommendation stored', { id: recommendation.id });
    } catch (error) {
      this.logger.error('Failed to store recommendation', { 
        id: recommendation.id, 
        error: error.message 
      });
    }
  }

  /**
   * Update rule in knowledge base
   */
  async updateRule(rule: DetectionRule): Promise<void> {
    try {
      await this.database.updateRule(rule);
      this.logger.info('Rule updated', { id: rule.id });
    } catch (error) {
      this.logger.error('Failed to update rule', { 
        id: rule.id, 
        error: error.message 
      });
    }
  }

  /**
   * Get relevant knowledge for event analysis
   */
  async getRelevantKnowledge(event: SecurityEvent): Promise<{
    threatIntel: ThreatIntelligence[];
    attackPatterns: AttackPattern[];
    rules: DetectionRule[];
  }> {
    try {
      const [threatIntel, attackPatterns, rules] = await Promise.all([
        this.findThreatMatches(event),
        this.findAttackPatterns(event),
        this.getActiveRules(),
      ]);

      return {
        threatIntel,
        attackPatterns,
        rules,
      };
    } catch (error) {
      this.logger.error('Failed to get relevant knowledge', { 
        eventId: event.id, 
        error: error.message 
      });
      return {
        threatIntel: [],
        attackPatterns: [],
        rules: [],
      };
    }
  }

  /**
   * Update threat intelligence from external sources
   */
  async updateThreatIntelligence(): Promise<void> {
    try {
      this.logger.info('Updating threat intelligence');

      for (const source of this.config.threatIntelSources) {
        await this.updateFromSource(source);
      }

      // Update MITRE ATT&CK data
      await this.updateMitreAttackData();

      this.logger.info('Threat intelligence update completed');
    } catch (error) {
      this.logger.error('Failed to update threat intelligence', { error: error.message });
    }
  }

  /**
   * Update from specific threat intelligence source
   */
  private async updateFromSource(source: string): Promise<void> {
    try {
      const response = await axios.get(source, { timeout: 30000 });
      const data = response.data;

      if (Array.isArray(data)) {
        for (const item of data) {
          const threatIntel = this.parseThreatIntelligence(item);
          if (threatIntel) {
            this.threatIntelCache.set(threatIntel.id, threatIntel);
            await this.database.storeThreatIntelligence(threatIntel);
          }
        }
      }

      this.logger.info('Updated from source', { source, count: data.length });
    } catch (error) {
      this.logger.error('Failed to update from source', { source, error: error.message });
    }
  }

  /**
   * Parse threat intelligence from external source
   */
  private parseThreatIntelligence(data: any): ThreatIntelligence | null {
    try {
      return {
        id: data.id || `threat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: data.type || 'unknown',
        value: data.value || data.indicator || data.ioc,
        description: data.description || data.summary || 'No description available',
        confidence: data.confidence || 0.5,
        severity: data.severity || 'medium',
        source: data.source || 'external',
        firstSeen: new Date(data.firstSeen || Date.now()),
        lastSeen: new Date(data.lastSeen || Date.now()),
        tags: data.tags || [],
        references: data.references || [],
        mitigation: data.mitigation || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse threat intelligence', { data, error: error.message });
      return null;
    }
  }

  /**
   * Update MITRE ATT&CK data
   */
  private async updateMitreAttackData(): Promise<void> {
    try {
      const response = await axios.get(this.config.mitreAttackApiUrl, { timeout: 30000 });
      const techniques = response.data.objects || [];

      for (const technique of techniques) {
        if (technique.type === 'attack-pattern') {
          const attackPattern = this.parseAttackPattern(technique);
          if (attackPattern) {
            this.attackPatternsCache.set(attackPattern.id, attackPattern);
            await this.database.storeAttackPattern(attackPattern);
          }
        }
      }

      this.logger.info('MITRE ATT&CK data updated', { count: techniques.length });
    } catch (error) {
      this.logger.error('Failed to update MITRE ATT&CK data', { error: error.message });
    }
  }

  /**
   * Parse attack pattern from MITRE data
   */
  private parseAttackPattern(data: any): AttackPattern | null {
    try {
      return {
        id: data.external_references?.[0]?.external_id || data.id,
        name: data.name,
        description: data.description || 'No description available',
        technique: data.external_references?.[0]?.external_id || 'T0000',
        tactics: data.kill_chain_phases?.map((phase: any) => phase.phase_name) || [],
        platforms: data.x_mitre_platforms || [],
        dataSources: data.x_mitre_data_sources || [],
        detection: data.x_mitre_detection || [],
        mitigation: data.x_mitre_mitigations?.map((m: any) => m.description) || [],
        references: data.external_references?.map((ref: any) => ref.url) || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse attack pattern', { data, error: error.message });
      return null;
    }
  }

  /**
   * Load existing data from database
   */
  private async loadExistingData(): Promise<void> {
    try {
      const [threatIntel, attackPatterns] = await Promise.all([
        this.database.getThreatIntelligence(),
        this.database.getAttackPatterns(),
      ]);

      // Load threat intelligence into cache
      for (const threat of threatIntel) {
        this.threatIntelCache.set(threat.id, threat);
      }

      // Load attack patterns into cache
      for (const pattern of attackPatterns) {
        this.attackPatternsCache.set(pattern.id, pattern);
      }

      this.logger.info('Loaded existing data', {
        threatIntel: threatIntel.length,
        attackPatterns: attackPatterns.length,
      });
    } catch (error) {
      this.logger.error('Failed to load existing data', { error: error.message });
    }
  }

  /**
   * Start background updates
   */
  private startBackgroundUpdates(): void {
    this.updateTimer = setInterval(async () => {
      try {
        await this.updateThreatIntelligence();
      } catch (error) {
        this.logger.error('Background update failed', { error: error.message });
      }
    }, this.config.updateInterval * 60 * 1000);
  }

  /**
   * Update with event data for learning
   */
  async updateWithEvent(event: SecurityEvent, context: any): Promise<void> {
    try {
      // Update threat intelligence with new IOCs
      for (const ioc of event.normalizedData.indicators.iocs) {
        const existingThreat = this.threatIntelCache.get(ioc.value);
        if (existingThreat) {
          existingThreat.lastSeen = event.timestamp;
          existingThreat.confidence = Math.min(1.0, existingThreat.confidence + 0.01);
          await this.database.storeThreatIntelligence(existingThreat);
        }
      }

      // Learn from behavioral patterns
      if (context.behavioral?.anomalies) {
        for (const anomaly of context.behavioral.anomalies) {
          // Create new threat intelligence entry for significant anomalies
          if (anomaly.severity > 0.8) {
            const threatIntel: ThreatIntelligence = {
              id: `behavioral_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              type: 'behavioral_anomaly',
              value: anomaly.description,
              description: `Behavioral anomaly: ${anomaly.description}`,
              confidence: anomaly.confidence,
              severity: anomaly.severity > 0.9 ? 'high' : 'medium',
              source: 'behavioral_analysis',
              firstSeen: event.timestamp,
              lastSeen: event.timestamp,
              tags: ['behavioral', 'anomaly'],
              references: [],
              mitigation: ['Review user activity', 'Implement additional monitoring'],
            };

            this.threatIntelCache.set(threatIntel.id, threatIntel);
            await this.database.storeThreatIntelligence(threatIntel);
          }
        }
      }

      this.logger.debug('Knowledge base updated with event', { eventId: event.id });
    } catch (error) {
      this.logger.error('Failed to update knowledge base with event', { 
        eventId: event.id, 
        error: error.message 
      });
    }
  }

  /**
   * Shutdown the knowledge base service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Knowledge Base Service');
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.isInitialized = false;
  }
}
