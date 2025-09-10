/**
 * Base class for all data source connectors
 * Provides common functionality for data normalization and event processing
 */

import { SecurityEvent, DataSourceType, NormalizedEventData, EventMetadata } from '@/types';
import { Logger } from '@/utils/logger';
import { EventNormalizer } from '@/utils/event-normalizer';

/**
 * Abstract base class that all data source connectors must extend
 * Provides common functionality for data ingestion, normalization, and error handling
 */
export abstract class BaseDataSource {
  protected readonly logger: Logger;
  protected readonly normalizer: EventNormalizer;
  protected readonly sourceType: DataSourceType;
  protected isConnected: boolean = false;
  protected lastHeartbeat: Date | null = null;
  protected errorCount: number = 0;
  protected readonly maxRetries: number = 3;
  protected readonly retryDelay: number = 5000; // 5 seconds

  constructor(sourceType: DataSourceType) {
    this.sourceType = sourceType;
    this.logger = new Logger(`DataSource:${sourceType}`);
    this.normalizer = new EventNormalizer();
  }

  /**
   * Initialize the data source connection
   * Must be implemented by each specific data source
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the data source
   * Must be implemented by each specific data source
   */
  abstract disconnect(): Promise<void>;

  /**
   * Start listening for events from the data source
   * Must be implemented by each specific data source
   */
  abstract startListening(): Promise<void>;

  /**
   * Stop listening for events from the data source
   * Must be implemented by each specific data source
   */
  abstract stopListening(): Promise<void>;

  /**
   * Test the connection to the data source
   * Must be implemented by each specific data source
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get the current status of the data source
   */
  getStatus(): {
    connected: boolean;
    lastHeartbeat: Date | null;
    errorCount: number;
    sourceType: DataSourceType;
  } {
    return {
      connected: this.isConnected,
      lastHeartbeat: this.lastHeartbeat,
      errorCount: this.errorCount,
      sourceType: this.sourceType,
    };
  }

  /**
   * Normalize raw data from the data source into a standard format
   * This method handles the common normalization logic
   */
  protected async normalizeEvent(
    rawData: Record<string, any>,
    eventType: string,
    severity: string
  ): Promise<SecurityEvent> {
    try {
      // Generate unique event ID
      const eventId = this.generateEventId();
      
      // Get current timestamp
      const timestamp = new Date();
      
      // Normalize the raw data using the event normalizer
      const normalizedData = await this.normalizer.normalize(rawData, this.sourceType);
      
      // Create event metadata
      const metadata: EventMetadata = {
        sourceSystem: this.sourceType,
        version: '1.0.0',
        processingTime: Date.now() - timestamp.getTime(),
        enrichmentApplied: ['geolocation', 'threat_intel', 'behavioral_analysis'],
        qualityScore: this.calculateQualityScore(rawData),
        tags: this.extractTags(rawData),
      };

      // Create the security event
      const securityEvent: SecurityEvent = {
        id: eventId,
        timestamp,
        source: this.sourceType,
        eventType,
        severity: this.mapSeverity(severity),
        rawData,
        normalizedData,
        metadata,
      };

      this.logger.debug('Event normalized successfully', { eventId, sourceType: this.sourceType });
      return securityEvent;
    } catch (error) {
      this.logger.error('Failed to normalize event', { error, rawData });
      throw new Error(`Event normalization failed: ${error.message}`);
    }
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${this.sourceType}-${timestamp}-${random}`;
  }

  /**
   * Map severity levels from data source to standard format
   */
  private mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'info',
      '1': 'critical',
      '2': 'high',
      '3': 'medium',
      '4': 'low',
      '5': 'info',
      'error': 'high',
      'warning': 'medium',
      'debug': 'info',
    };

    return severityMap[severity.toLowerCase()] || 'medium';
  }

  /**
   * Calculate data quality score based on completeness and validity
   */
  private calculateQualityScore(rawData: Record<string, any>): number {
    const requiredFields = this.getRequiredFields();
    const presentFields = requiredFields.filter(field => 
      rawData[field] !== undefined && rawData[field] !== null && rawData[field] !== ''
    );
    
    const completeness = presentFields.length / requiredFields.length;
    const validity = this.validateDataTypes(rawData);
    
    return Math.round((completeness * 0.7 + validity * 0.3) * 100);
  }

  /**
   * Get required fields for this data source type
   * Must be implemented by each specific data source
   */
  protected abstract getRequiredFields(): string[];

  /**
   * Validate data types in the raw data
   */
  private validateDataTypes(rawData: Record<string, any>): number {
    const validFields = Object.entries(rawData).filter(([key, value]) => {
      // Basic type validation - can be extended by specific data sources
      return value !== null && value !== undefined;
    });
    
    return validFields.length / Object.keys(rawData).length;
  }

  /**
   * Extract tags from raw data for categorization
   */
  private extractTags(rawData: Record<string, any>): string[] {
    const tags: string[] = [];
    
    // Extract common tags based on data content
    if (rawData.user) tags.push('user-activity');
    if (rawData.network) tags.push('network-activity');
    if (rawData.file) tags.push('file-activity');
    if (rawData.process) tags.push('process-activity');
    if (rawData.auth) tags.push('authentication');
    if (rawData.error) tags.push('error');
    
    return tags;
  }

  /**
   * Handle errors with exponential backoff retry
   */
  protected async handleError(error: Error, operation: string): Promise<void> {
    this.errorCount++;
    this.logger.error(`Error in ${operation}`, { error: error.message, errorCount: this.errorCount });

    if (this.errorCount >= this.maxRetries) {
      this.logger.error('Max retries exceeded, stopping operation', { operation });
      this.isConnected = false;
      throw error;
    }

    // Exponential backoff
    const delay = this.retryDelay * Math.pow(2, this.errorCount - 1);
    this.logger.info(`Retrying ${operation} in ${delay}ms`, { attempt: this.errorCount });
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Reset error count on successful operation
   */
  protected resetErrorCount(): void {
    this.errorCount = 0;
    this.lastHeartbeat = new Date();
  }

  /**
   * Validate configuration for the data source
   * Must be implemented by each specific data source
   */
  protected abstract validateConfig(): boolean;

  /**
   * Get configuration for the data source
   * Must be implemented by each specific data source
   */
  protected abstract getConfig(): Record<string, any>;
}
