/**
 * Graph Correlation Engine
 * Analyzes entity relationships and network patterns for threat correlation
 */

import { SecurityEvent, EntityRelationship, RelationshipType } from '@/types';
import { Logger } from '@/utils/logger';
import { DatabaseService } from '../database/DatabaseService';
import neo4j, { Driver, Session } from 'neo4j-driver';

/**
 * Graph Correlation Configuration
 */
interface GraphConfig {
  correlationWindow: number; // hours
  minCorrelationStrength: number; // 0-1
  maxGraphSize: number;
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  updateInterval: number; // minutes
}

/**
 * Correlation result
 */
interface CorrelationResult {
  correlations: EntityCorrelation[];
  networkStrength: number;
  threatChains: ThreatChain[];
  riskScore: number;
  recommendations: string[];
}

/**
 * Entity correlation
 */
interface EntityCorrelation {
  sourceEntity: string;
  targetEntity: string;
  relationship: RelationshipType;
  strength: number;
  confidence: number;
  evidence: string[];
  lastSeen: Date;
}

/**
 * Threat chain analysis
 */
interface ThreatChain {
  entities: string[];
  relationships: EntityCorrelation[];
  riskScore: number;
  pattern: string;
  description: string;
}

/**
 * Graph node for Neo4j
 */
interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

/**
 * Graph edge for Neo4j
 */
interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  properties: Record<string, any>;
}

/**
 * Graph Correlation Engine
 * Implements graph-based analysis for threat correlation
 */
export class GraphCorrelationEngine {
  private readonly logger: Logger;
  private readonly config: GraphConfig;
  private readonly database: DatabaseService;
  private driver: Driver | null = null;
  private isInitialized: boolean = false;
  private updateTimer: NodeJS.Timeout | null = null;
  private graphCache: Map<string, any> = new Map();

  constructor(config: GraphConfig, database: DatabaseService) {
    this.config = config;
    this.database = database;
    this.logger = new Logger('GraphCorrelationEngine');
  }

  /**
   * Initialize the graph correlation engine
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Graph Correlation Engine');

      // Initialize Neo4j driver
      this.driver = neo4j.driver(
        this.config.neo4jUri,
        neo4j.auth.basic(this.config.neo4jUser, this.config.neo4jPassword)
      );

      // Test connection
      await this.testConnection();

      // Create indexes and constraints
      await this.createIndexes();

      // Start background processing
      this.startBackgroundProcessing();

      this.isInitialized = true;
      this.logger.info('Graph Correlation Engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Graph Correlation Engine', { error: error.message });
      throw error;
    }
  }

  /**
   * Test Neo4j connection
   */
  private async testConnection(): Promise<void> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
      this.logger.info('Neo4j connection test successful');
    } catch (error) {
      this.logger.error('Neo4j connection test failed', { error: error.message });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create Neo4j indexes and constraints
   */
  private async createIndexes(): Promise<void> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    try {
      // Create constraints
      await session.run('CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE');
      
      // Create indexes
      await session.run('CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)');
      await session.run('CREATE INDEX relationship_type IF NOT EXISTS FOR ()-[r:RELATES_TO]-() ON (r.type)');
      await session.run('CREATE INDEX relationship_strength IF NOT EXISTS FOR ()-[r:RELATES_TO]-() ON (r.strength)');
      
      this.logger.info('Neo4j indexes and constraints created');
    } catch (error) {
      this.logger.error('Failed to create indexes', { error: error.message });
    } finally {
      await session.close();
    }
  }

  /**
   * Correlate a security event with existing graph data
   */
  async correlateEvent(event: SecurityEvent): Promise<CorrelationResult> {
    if (!this.isInitialized) {
      throw new Error('Graph Correlation Engine not initialized');
    }

    try {
      this.logger.debug('Correlating event', { eventId: event.id });

      // Extract entities from event
      const entities = this.extractEntities(event);
      
      // Find correlations for each entity
      const correlations: EntityCorrelation[] = [];
      let totalStrength = 0;
      let correlationCount = 0;

      for (const entity of entities) {
        const entityCorrelations = await this.findEntityCorrelations(entity, event.timestamp);
        correlations.push(...entityCorrelations);
        
        if (entityCorrelations.length > 0) {
          totalStrength += entityCorrelations.reduce((sum, corr) => sum + corr.strength, 0);
          correlationCount += entityCorrelations.length;
        }
      }

      // Calculate network strength
      const networkStrength = correlationCount > 0 ? totalStrength / correlationCount : 0;

      // Find threat chains
      const threatChains = await this.findThreatChains(entities, correlations);

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(correlations, threatChains);

      // Generate recommendations
      const recommendations = this.generateRecommendations(correlations, threatChains);

      const result: CorrelationResult = {
        correlations,
        networkStrength,
        threatChains,
        riskScore,
        recommendations,
      };

      // Update graph with new event data
      await this.updateGraph(event, entities, correlations);

      this.logger.debug('Event correlation completed', {
        eventId: event.id,
        correlations: correlations.length,
        threatChains: threatChains.length,
        riskScore,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to correlate event', { 
        eventId: event.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Extract entities from security event
   */
  private extractEntities(event: SecurityEvent): GraphNode[] {
    const entities: GraphNode[] = [];

    // Extract all entities from the event
    for (const [entityType, entityList] of Object.entries(event.normalizedData.entities)) {
      for (const entity of entityList) {
        entities.push({
          id: entity.id,
          labels: [entityType, 'Entity'],
          properties: {
            name: entity.name,
            type: entity.type,
            ...entity.attributes,
            lastSeen: event.timestamp,
            source: event.source,
          },
        });
      }
    }

    return entities;
  }

  /**
   * Find correlations for a specific entity
   */
  private async findEntityCorrelations(
    entity: GraphNode, 
    timestamp: Date
  ): Promise<EntityCorrelation[]> {
    if (!this.driver) {
      return [];
    }

    const session = this.driver.session();
    try {
      const cutoffTime = new Date(timestamp.getTime() - this.config.correlationWindow * 60 * 60 * 1000);
      
      const query = `
        MATCH (e1:Entity {id: $entityId})-[r:RELATES_TO]-(e2:Entity)
        WHERE r.lastSeen >= $cutoffTime
        RETURN e2.id as targetId, r.type as relationship, r.strength as strength, 
               r.confidence as confidence, r.evidence as evidence, r.lastSeen as lastSeen
        ORDER BY r.strength DESC
      `;

      const result = await session.run(query, {
        entityId: entity.id,
        cutoffTime: cutoffTime.toISOString(),
      });

      const correlations: EntityCorrelation[] = [];
      
      for (const record of result.records) {
        const strength = record.get('strength');
        if (strength >= this.config.minCorrelationStrength) {
          correlations.push({
            sourceEntity: entity.id,
            targetEntity: record.get('targetId'),
            relationship: record.get('relationship') as RelationshipType,
            strength,
            confidence: record.get('confidence'),
            evidence: record.get('evidence') || [],
            lastSeen: new Date(record.get('lastSeen')),
          });
        }
      }

      return correlations;
    } catch (error) {
      this.logger.error('Failed to find entity correlations', { 
        entityId: entity.id, 
        error: error.message 
      });
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Find threat chains in the correlation network
   */
  private async findThreatChains(
    entities: GraphNode[], 
    correlations: EntityCorrelation[]
  ): Promise<ThreatChain[]> {
    const threatChains: ThreatChain[] = [];
    const entityIds = entities.map(e => e.id);

    // Group correlations by connected components
    const components = this.findConnectedComponents(correlations);
    
    for (const component of components) {
      if (component.length >= 3) { // Minimum chain length
        const chain = this.analyzeThreatChain(component, correlations);
        if (chain.riskScore > 0.5) {
          threatChains.push(chain);
        }
      }
    }

    return threatChains;
  }

  /**
   * Find connected components in correlation graph
   */
  private findConnectedComponents(correlations: EntityCorrelation[]): string[][] {
    const graph = new Map<string, Set<string>>();
    
    // Build adjacency list
    for (const corr of correlations) {
      if (!graph.has(corr.sourceEntity)) {
        graph.set(corr.sourceEntity, new Set());
      }
      if (!graph.has(corr.targetEntity)) {
        graph.set(corr.targetEntity, new Set());
      }
      
      graph.get(corr.sourceEntity)!.add(corr.targetEntity);
      graph.get(corr.targetEntity)!.add(corr.sourceEntity);
    }

    // Find connected components using DFS
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const entity of graph.keys()) {
      if (!visited.has(entity)) {
        const component: string[] = [];
        this.dfs(entity, graph, visited, component);
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Depth-first search for connected components
   */
  private dfs(
    entity: string, 
    graph: Map<string, Set<string>>, 
    visited: Set<string>, 
    component: string[]
  ): void {
    visited.add(entity);
    component.push(entity);

    const neighbors = graph.get(entity) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfs(neighbor, graph, visited, component);
      }
    }
  }

  /**
   * Analyze a threat chain
   */
  private analyzeThreatChain(
    entities: string[], 
    correlations: EntityCorrelation[]
  ): ThreatChain {
    const chainCorrelations = correlations.filter(corr => 
      entities.includes(corr.sourceEntity) && entities.includes(corr.targetEntity)
    );

    const riskScore = this.calculateChainRiskScore(entities, chainCorrelations);
    const pattern = this.identifyThreatPattern(entities, chainCorrelations);
    const description = this.generateThreatDescription(entities, chainCorrelations, pattern);

    return {
      entities,
      relationships: chainCorrelations,
      riskScore,
      pattern,
      description,
    };
  }

  /**
   * Calculate risk score for threat chain
   */
  private calculateChainRiskScore(
    entities: string[], 
    correlations: EntityCorrelation[]
  ): number {
    if (correlations.length === 0) return 0;

    const avgStrength = correlations.reduce((sum, corr) => sum + corr.strength, 0) / correlations.length;
    const avgConfidence = correlations.reduce((sum, corr) => sum + corr.confidence, 0) / correlations.length;
    const chainLength = entities.length;
    
    // Risk increases with chain length and correlation strength
    const lengthFactor = Math.min(1.0, chainLength / 10);
    const strengthFactor = avgStrength;
    const confidenceFactor = avgConfidence;

    return (lengthFactor * 0.4 + strengthFactor * 0.4 + confidenceFactor * 0.2);
  }

  /**
   * Identify threat pattern in chain
   */
  private identifyThreatPattern(
    entities: string[], 
    correlations: EntityCorrelation[]
  ): string {
    const relationshipTypes = correlations.map(corr => corr.relationship);
    const uniqueTypes = [...new Set(relationshipTypes)];

    if (uniqueTypes.includes('communicates_with') && uniqueTypes.includes('accesses')) {
      return 'lateral_movement';
    } else if (uniqueTypes.includes('executes') && uniqueTypes.includes('accesses')) {
      return 'privilege_escalation';
    } else if (uniqueTypes.includes('communicates_with') && uniqueTypes.length > 2) {
      return 'command_and_control';
    } else if (uniqueTypes.includes('accesses') && uniqueTypes.length > 3) {
      return 'data_exfiltration';
    } else {
      return 'suspicious_activity';
    }
  }

  /**
   * Generate threat description
   */
  private generateThreatDescription(
    entities: string[], 
    correlations: EntityCorrelation[], 
    pattern: string
  ): string {
    const entityCount = entities.length;
    const correlationCount = correlations.length;
    const avgStrength = correlations.reduce((sum, corr) => sum + corr.strength, 0) / correlations.length;

    return `Threat chain detected: ${pattern} pattern involving ${entityCount} entities with ${correlationCount} relationships (avg strength: ${avgStrength.toFixed(2)})`;
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    correlations: EntityCorrelation[], 
    threatChains: ThreatChain[]
  ): number {
    if (correlations.length === 0 && threatChains.length === 0) return 0;

    const correlationRisk = correlations.length > 0 
      ? correlations.reduce((sum, corr) => sum + corr.strength * corr.confidence, 0) / correlations.length
      : 0;

    const chainRisk = threatChains.length > 0
      ? threatChains.reduce((sum, chain) => sum + chain.riskScore, 0) / threatChains.length
      : 0;

    return Math.min(1.0, (correlationRisk * 0.6 + chainRisk * 0.4));
  }

  /**
   * Generate recommendations based on correlations
   */
  private generateRecommendations(
    correlations: EntityCorrelation[], 
    threatChains: ThreatChain[]
  ): string[] {
    const recommendations: string[] = [];

    if (correlations.length > 10) {
      recommendations.push('High correlation density detected - investigate for coordinated attack');
    }

    if (threatChains.length > 0) {
      const criticalChains = threatChains.filter(chain => chain.riskScore > 0.8);
      if (criticalChains.length > 0) {
        recommendations.push(`${criticalChains.length} critical threat chains require immediate investigation`);
      }
    }

    const strongCorrelations = correlations.filter(corr => corr.strength > 0.8);
    if (strongCorrelations.length > 5) {
      recommendations.push('Multiple strong correlations detected - consider implementing additional monitoring');
    }

    const lateralMovement = threatChains.filter(chain => chain.pattern === 'lateral_movement');
    if (lateralMovement.length > 0) {
      recommendations.push('Lateral movement patterns detected - review network segmentation');
    }

    return recommendations;
  }

  /**
   * Update graph with new event data
   */
  private async updateGraph(
    event: SecurityEvent, 
    entities: GraphNode[], 
    correlations: EntityCorrelation[]
  ): Promise<void> {
    if (!this.driver) {
      return;
    }

    const session = this.driver.session();
    try {
      // Create or update entities
      for (const entity of entities) {
        await this.createOrUpdateEntity(session, entity);
      }

      // Create or update relationships
      for (const correlation of correlations) {
        await this.createOrUpdateRelationship(session, correlation);
      }

      // Create event-specific relationships
      await this.createEventRelationships(session, event, entities);

    } catch (error) {
      this.logger.error('Failed to update graph', { 
        eventId: event.id, 
        error: error.message 
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Create or update entity in Neo4j
   */
  private async createOrUpdateEntity(session: Session, entity: GraphNode): Promise<void> {
    const query = `
      MERGE (e:Entity {id: $id})
      SET e += $properties
      SET e:${entity.labels.join(':')}
    `;

    await session.run(query, {
      id: entity.id,
      properties: entity.properties,
    });
  }

  /**
   * Create or update relationship in Neo4j
   */
  private async createOrUpdateRelationship(
    session: Session, 
    correlation: EntityCorrelation
  ): Promise<void> {
    const query = `
      MATCH (e1:Entity {id: $sourceId}), (e2:Entity {id: $targetId})
      MERGE (e1)-[r:RELATES_TO {type: $relationship}]->(e2)
      SET r.strength = $strength,
          r.confidence = $confidence,
          r.evidence = $evidence,
          r.lastSeen = $lastSeen
    `;

    await session.run(query, {
      sourceId: correlation.sourceEntity,
      targetId: correlation.targetEntity,
      relationship: correlation.relationship,
      strength: correlation.strength,
      confidence: correlation.confidence,
      evidence: correlation.evidence,
      lastSeen: correlation.lastSeen.toISOString(),
    });
  }

  /**
   * Create event-specific relationships
   */
  private async createEventRelationships(
    session: Session, 
    event: SecurityEvent, 
    entities: GraphNode[]
  ): Promise<void> {
    // Create relationships between entities in the same event
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const query = `
          MATCH (e1:Entity {id: $id1}), (e2:Entity {id: $id2})
          MERGE (e1)-[r:CO_OCCURRED_IN]->(e2)
          SET r.eventId = $eventId,
              r.timestamp = $timestamp,
              r.strength = 0.5,
              r.confidence = 0.8
        `;

        await session.run(query, {
          id1: entities[i].id,
          id2: entities[j].id,
          eventId: event.id,
          timestamp: event.timestamp.toISOString(),
        });
      }
    }
  }

  /**
   * Update graph with new event data
   */
  async updateGraph(event: SecurityEvent, context: any): Promise<void> {
    // This method is called by the DetectionAgent
    // The actual graph update is handled in correlateEvent
    this.logger.debug('Graph update requested', { eventId: event.id });
  }

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    this.updateTimer = setInterval(async () => {
      try {
        await this.cleanupOldData();
        await this.optimizeGraph();
      } catch (error) {
        this.logger.error('Background processing failed', { error: error.message });
      }
    }, this.config.updateInterval * 60 * 1000);
  }

  /**
   * Cleanup old data from graph
   */
  private async cleanupOldData(): Promise<void> {
    if (!this.driver) return;

    const session = this.driver.session();
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      // Remove old relationships
      await session.run(`
        MATCH ()-[r:RELATES_TO]->()
        WHERE r.lastSeen < $cutoffDate
        DELETE r
      `, { cutoffDate: cutoffDate.toISOString() });

      // Remove orphaned entities
      await session.run(`
        MATCH (e:Entity)
        WHERE NOT (e)-[:RELATES_TO]-()
        AND e.lastSeen < $cutoffDate
        DELETE e
      `, { cutoffDate: cutoffDate.toISOString() });

      this.logger.info('Graph cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup old data', { error: error.message });
    } finally {
      await session.close();
    }
  }

  /**
   * Optimize graph performance
   */
  private async optimizeGraph(): Promise<void> {
    if (!this.driver) return;

    const session = this.driver.session();
    try {
      // Update relationship strengths based on recency
      await session.run(`
        MATCH ()-[r:RELATES_TO]->()
        SET r.strength = r.strength * 
          CASE 
            WHEN r.lastSeen > datetime() - duration('P7D') THEN 1.0
            WHEN r.lastSeen > datetime() - duration('P30D') THEN 0.8
            ELSE 0.5
          END
      `);

      this.logger.debug('Graph optimization completed');
    } catch (error) {
      this.logger.error('Failed to optimize graph', { error: error.message });
    } finally {
      await session.close();
    }
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(cutoffDate: Date): Promise<void> {
    // This method is called by the DetectionAgent
    // The actual cleanup is handled in the background timer
    this.logger.debug('Cleanup requested', { cutoffDate });
  }

  /**
   * Shutdown the graph correlation engine
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Graph Correlation Engine');
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
    
    this.isInitialized = false;
  }
}
