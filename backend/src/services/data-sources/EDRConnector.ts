/**
 * EDR (Endpoint Detection and Response) Data Source Connector
 * Handles data ingestion from EDR systems like CrowdStrike, SentinelOne, etc.
 */

import { BaseDataSource } from './BaseDataSource';
import { DataSourceType, SecurityEvent } from '@/types';
import axios, { AxiosInstance } from 'axios';
import { Logger } from '@/utils/logger';

/**
 * EDR-specific configuration interface
 */
interface EDRConfig {
  apiUrl: string;
  apiKey: string;
  clientId: string;
  pollingInterval: number;
  batchSize: number;
  eventTypes: string[];
  severityThreshold: string;
}

/**
 * EDR API response structure
 */
interface EDRResponse {
  success: boolean;
  data: {
    events: EDRRawEvent[];
    pagination: {
      next: string | null;
      total: number;
    };
  };
  error?: string;
}

/**
 * Raw EDR event structure
 */
interface EDRRawEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  host: {
    hostname: string;
    ip_address: string;
    os: string;
    agent_version: string;
  };
  process: {
    pid: number;
    name: string;
    command_line: string;
    parent_pid: number;
    parent_name: string;
    user: string;
    working_directory: string;
  };
  file: {
    name: string;
    path: string;
    hash: {
      md5: string;
      sha1: string;
      sha256: string;
    };
    size: number;
    permissions: string;
  };
  network: {
    source_ip: string;
    destination_ip: string;
    source_port: number;
    destination_port: number;
    protocol: string;
    domain: string;
    url: string;
  };
  registry: {
    key: string;
    value: string;
    action: string;
  };
  threat: {
    name: string;
    category: string;
    confidence: number;
    iocs: string[];
  };
  metadata: {
    source: string;
    version: string;
    tags: string[];
  };
}

/**
 * EDR Data Source Connector
 * Implements specific logic for EDR systems
 */
export class EDRConnector extends BaseDataSource {
  private config: EDRConfig;
  private httpClient: AxiosInstance;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastEventTimestamp: string | null = null;

  constructor(config: EDRConfig) {
    super(DataSourceType.EDR);
    this.config = config;
    this.httpClient = this.createHttpClient();
  }

  /**
   * Create HTTP client with EDR-specific configuration
   */
  private createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-ID': this.config.clientId,
      },
      timeout: 30000,
    });
  }

  /**
   * Connect to EDR system
   */
  async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to EDR system', { apiUrl: this.config.apiUrl });
      
      // Test connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to EDR system');
      }

      this.isConnected = true;
      this.resetErrorCount();
      this.logger.info('Successfully connected to EDR system');
    } catch (error) {
      await this.handleError(error as Error, 'connect');
      throw error;
    }
  }

  /**
   * Disconnect from EDR system
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.info('Disconnecting from EDR system');
      
      // Stop polling
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      this.isConnected = false;
      this.logger.info('Successfully disconnected from EDR system');
    } catch (error) {
      this.logger.error('Error during disconnect', { error: error.message });
    }
  }

  /**
   * Start listening for EDR events
   */
  async startListening(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to EDR system');
    }

    this.logger.info('Starting EDR event polling', { 
      interval: this.config.pollingInterval,
      batchSize: this.config.batchSize 
    });

    // Start polling for events
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollEvents();
      } catch (error) {
        await this.handleError(error as Error, 'pollEvents');
      }
    }, this.config.pollingInterval);
  }

  /**
   * Stop listening for EDR events
   */
  async stopListening(): Promise<void> {
    this.logger.info('Stopping EDR event polling');
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Test connection to EDR system
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('EDR connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Poll for new events from EDR system
   */
  private async pollEvents(): Promise<void> {
    try {
      const params: Record<string, any> = {
        limit: this.config.batchSize,
        event_types: this.config.eventTypes.join(','),
        severity: this.config.severityThreshold,
      };

      if (this.lastEventTimestamp) {
        params.since = this.lastEventTimestamp;
      }

      const response = await this.httpClient.get<EDRResponse>('/events', { params });
      
      if (response.data.success && response.data.data.events.length > 0) {
        await this.processEvents(response.data.data.events);
        
        // Update last event timestamp
        const lastEvent = response.data.data.events[response.data.data.events.length - 1];
        this.lastEventTimestamp = lastEvent.timestamp;
      }

      this.resetErrorCount();
    } catch (error) {
      await this.handleError(error as Error, 'pollEvents');
    }
  }

  /**
   * Process raw EDR events
   */
  private async processEvents(rawEvents: EDRRawEvent[]): Promise<void> {
    this.logger.info('Processing EDR events', { count: rawEvents.length });

    for (const rawEvent of rawEvents) {
      try {
        const securityEvent = await this.normalizeEDREvent(rawEvent);
        await this.emitEvent(securityEvent);
      } catch (error) {
        this.logger.error('Failed to process EDR event', { 
          eventId: rawEvent.event_id, 
          error: error.message 
        });
      }
    }
  }

  /**
   * Normalize EDR event to standard SecurityEvent format
   */
  private async normalizeEDREvent(rawEvent: EDRRawEvent): Promise<SecurityEvent> {
    const normalizedData = {
      entities: {
        users: [{
          id: rawEvent.process.user,
          name: rawEvent.process.user,
          type: 'user' as const,
          attributes: {
            working_directory: rawEvent.process.working_directory,
          },
          relationships: [],
        }],
        hosts: [{
          id: rawEvent.host.hostname,
          name: rawEvent.host.hostname,
          type: 'host' as const,
          attributes: {
            ip_address: rawEvent.host.ip_address,
            os: rawEvent.host.os,
            agent_version: rawEvent.host.agent_version,
          },
          relationships: [],
        }],
        processes: [{
          id: rawEvent.process.pid.toString(),
          name: rawEvent.process.name,
          type: 'process' as const,
          attributes: {
            command_line: rawEvent.process.command_line,
            parent_pid: rawEvent.process.parent_pid,
            parent_name: rawEvent.process.parent_name,
            working_directory: rawEvent.process.working_directory,
          },
          relationships: [],
        }],
        files: rawEvent.file ? [{
          id: rawEvent.file.hash.sha256,
          name: rawEvent.file.name,
          type: 'file' as const,
          attributes: {
            path: rawEvent.file.path,
            size: rawEvent.file.size,
            permissions: rawEvent.file.permissions,
            hashes: rawEvent.file.hash,
          },
          relationships: [],
        }] : [],
        networks: rawEvent.network ? [{
          id: `${rawEvent.network.source_ip}-${rawEvent.network.destination_ip}`,
          name: rawEvent.network.domain || rawEvent.network.destination_ip,
          type: 'network' as const,
          attributes: {
            source_ip: rawEvent.network.source_ip,
            destination_ip: rawEvent.network.destination_ip,
            source_port: rawEvent.network.source_port,
            destination_port: rawEvent.network.destination_port,
            protocol: rawEvent.network.protocol,
            domain: rawEvent.network.domain,
            url: rawEvent.network.url,
          },
          relationships: [],
        }] : [],
      },
      context: {
        action: rawEvent.event_type,
        resource: rawEvent.file?.path || rawEvent.process.name,
        location: {
          // EDR typically doesn't provide geographic info
        },
        network: rawEvent.network ? {
          sourceIp: rawEvent.network.source_ip,
          destinationIp: rawEvent.network.destination_ip,
          sourcePort: rawEvent.network.source_port,
          destinationPort: rawEvent.network.destination_port,
          protocol: rawEvent.network.protocol,
          domain: rawEvent.network.domain,
          url: rawEvent.network.url,
        } : {},
        time: {
          timestamp: new Date(rawEvent.timestamp),
          timezone: 'UTC',
          businessHours: this.isBusinessHours(new Date(rawEvent.timestamp)),
          dayOfWeek: new Date(rawEvent.timestamp).getDay(),
          hourOfDay: new Date(rawEvent.timestamp).getHours(),
        },
      },
      indicators: {
        iocs: rawEvent.threat?.iocs || [],
        behaviors: this.extractBehavioralIndicators(rawEvent),
        anomalies: this.extractAnomalyIndicators(rawEvent),
      },
      risk: {
        score: this.calculateRiskScore(rawEvent),
        factors: this.extractRiskFactors(rawEvent),
        confidence: rawEvent.threat?.confidence || 0.5,
      },
    };

    return this.normalizeEvent(rawEvent, rawEvent.event_type, rawEvent.severity);
  }

  /**
   * Extract behavioral indicators from EDR event
   */
  private extractBehavioralIndicators(rawEvent: EDRRawEvent): any[] {
    const indicators = [];

    // Process execution patterns
    if (rawEvent.process) {
      indicators.push({
        type: 'process_execution',
        description: `Process ${rawEvent.process.name} executed`,
        confidence: 0.8,
        baseline: 0.5,
        deviation: 0.3,
        timeframe: '1h',
      });
    }

    // File access patterns
    if (rawEvent.file) {
      indicators.push({
        type: 'file_operations',
        description: `File ${rawEvent.file.name} accessed`,
        confidence: 0.7,
        baseline: 0.4,
        deviation: 0.3,
        timeframe: '1h',
      });
    }

    // Network communication patterns
    if (rawEvent.network) {
      indicators.push({
        type: 'network_communication',
        description: `Network communication to ${rawEvent.network.destination_ip}`,
        confidence: 0.6,
        baseline: 0.3,
        deviation: 0.3,
        timeframe: '1h',
      });
    }

    return indicators;
  }

  /**
   * Extract anomaly indicators from EDR event
   */
  private extractAnomalyIndicators(rawEvent: EDRRawEvent): any[] {
    const indicators = [];

    // High severity events are anomalies
    if (rawEvent.severity === 'high' || rawEvent.severity === 'critical') {
      indicators.push({
        type: 'behavioral',
        description: `High severity event: ${rawEvent.event_type}`,
        severity: 0.8,
        confidence: 0.9,
        context: 'EDR detection',
      });
    }

    // Threat detections are anomalies
    if (rawEvent.threat) {
      indicators.push({
        type: 'statistical',
        description: `Threat detected: ${rawEvent.threat.name}`,
        severity: 0.9,
        confidence: rawEvent.threat.confidence,
        context: 'EDR threat detection',
      });
    }

    return indicators;
  }

  /**
   * Calculate risk score for EDR event
   */
  private calculateRiskScore(rawEvent: EDRRawEvent): number {
    let score = 0;

    // Base score from severity
    const severityScores = { critical: 0.9, high: 0.7, medium: 0.5, low: 0.3, info: 0.1 };
    score += severityScores[rawEvent.severity as keyof typeof severityScores] || 0.5;

    // Threat confidence bonus
    if (rawEvent.threat) {
      score += rawEvent.threat.confidence * 0.3;
    }

    // Process execution risk
    if (rawEvent.process && this.isSuspiciousProcess(rawEvent.process.name)) {
      score += 0.2;
    }

    // File access risk
    if (rawEvent.file && this.isSuspiciousFile(rawEvent.file.path)) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Extract risk factors from EDR event
   */
  private extractRiskFactors(rawEvent: EDRRawEvent): any[] {
    const factors = [];

    factors.push({
      type: 'severity',
      description: `Event severity: ${rawEvent.severity}`,
      weight: 0.4,
      value: rawEvent.severity === 'critical' ? 1.0 : rawEvent.severity === 'high' ? 0.8 : 0.5,
      impact: 'Detection confidence',
    });

    if (rawEvent.threat) {
      factors.push({
        type: 'confidence',
        description: `Threat confidence: ${rawEvent.threat.confidence}`,
        weight: 0.3,
        value: rawEvent.threat.confidence,
        impact: 'Threat detection accuracy',
      });
    }

    return factors;
  }

  /**
   * Check if process is suspicious
   */
  private isSuspiciousProcess(processName: string): boolean {
    const suspiciousProcesses = [
      'powershell.exe', 'cmd.exe', 'wscript.exe', 'cscript.exe',
      'regsvr32.exe', 'rundll32.exe', 'mshta.exe'
    ];
    return suspiciousProcesses.some(name => 
      processName.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Check if file path is suspicious
   */
  private isSuspiciousFile(filePath: string): boolean {
    const suspiciousPaths = [
      '/temp/', '/tmp/', '/appdata/', '/windows/system32/',
      'startup', 'runonce', 'shell:startup'
    ];
    return suspiciousPaths.some(path => 
      filePath.toLowerCase().includes(path.toLowerCase())
    );
  }

  /**
   * Check if time is during business hours
   */
  private isBusinessHours(timestamp: Date): boolean {
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  }

  /**
   * Emit normalized event to the event bus
   */
  private async emitEvent(securityEvent: SecurityEvent): Promise<void> {
    // This would typically emit to an event bus or message queue
    // For now, we'll just log the event
    this.logger.info('EDR event processed', { 
      eventId: securityEvent.id,
      eventType: securityEvent.eventType,
      severity: securityEvent.severity 
    });
  }

  /**
   * Get required fields for EDR data source
   */
  protected getRequiredFields(): string[] {
    return ['event_id', 'timestamp', 'event_type', 'severity', 'host'];
  }

  /**
   * Validate EDR configuration
   */
  protected validateConfig(): boolean {
    return !!(
      this.config.apiUrl &&
      this.config.apiKey &&
      this.config.clientId &&
      this.config.pollingInterval > 0 &&
      this.config.batchSize > 0
    );
  }

  /**
   * Get EDR configuration
   */
  protected getConfig(): Record<string, any> {
    return {
      ...this.config,
      apiKey: '***REDACTED***', // Don't expose API key in logs
    };
  }
}
