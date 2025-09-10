/**
 * Event Normalizer
 * Transforms raw data from various sources into standardized SecurityEvent format
 */

import { SecurityEvent, DataSourceType, NormalizedEventData, EntityInfo, EntityType } from '@/types';
import { Logger } from './logger';

/**
 * Event Normalizer
 * Handles data transformation and normalization from different data sources
 */
export class EventNormalizer {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('EventNormalizer');
  }

  /**
   * Normalize raw data from any data source into standard format
   */
  async normalize(
    rawData: Record<string, any>, 
    sourceType: DataSourceType
  ): Promise<NormalizedEventData> {
    try {
      this.logger.debug('Normalizing event data', { sourceType });

      // Extract entities based on source type
      const entities = await this.extractEntities(rawData, sourceType);
      
      // Extract context information
      const context = this.extractContext(rawData, sourceType);
      
      // Extract security indicators
      const indicators = this.extractIndicators(rawData, sourceType);
      
      // Calculate risk assessment
      const risk = this.calculateRisk(rawData, sourceType);

      const normalizedData: NormalizedEventData = {
        entities,
        context,
        indicators,
        risk,
      };

      this.logger.debug('Event normalized successfully', { 
        sourceType,
        entityCount: Object.values(entities).flat().length,
        indicatorCount: indicators.iocs.length + indicators.behaviors.length + indicators.anomalies.length
      });

      return normalizedData;
    } catch (error) {
      this.logger.error('Failed to normalize event data', { 
        sourceType, 
        error: error.message,
        rawData: JSON.stringify(rawData).substring(0, 200)
      });
      throw error;
    }
  }

  /**
   * Extract entities from raw data based on source type
   */
  private async extractEntities(
    rawData: Record<string, any>, 
    sourceType: DataSourceType
  ): Promise<{
    users: EntityInfo[];
    hosts: EntityInfo[];
    networks: EntityInfo[];
    processes: EntityInfo[];
    files: EntityInfo[];
  }> {
    const entities = {
      users: [] as EntityInfo[],
      hosts: [] as EntityInfo[],
      networks: [] as EntityInfo[],
      processes: [] as EntityInfo[],
      files: [] as EntityInfo[],
    };

    switch (sourceType) {
      case DataSourceType.EDR:
        entities.users = this.extractEDRUsers(rawData);
        entities.hosts = this.extractEDRHosts(rawData);
        entities.processes = this.extractEDRProcesses(rawData);
        entities.files = this.extractEDRFiles(rawData);
        entities.networks = this.extractEDRNetworks(rawData);
        break;

      case DataSourceType.SIEM:
        entities.users = this.extractSIEMUsers(rawData);
        entities.hosts = this.extractSIEMHosts(rawData);
        entities.networks = this.extractSIEMNetworks(rawData);
        break;

      case DataSourceType.CLOUD:
        entities.users = this.extractCloudUsers(rawData);
        entities.hosts = this.extractCloudHosts(rawData);
        entities.networks = this.extractCloudNetworks(rawData);
        break;

      case DataSourceType.FRAUD:
        entities.users = this.extractFraudUsers(rawData);
        entities.networks = this.extractFraudNetworks(rawData);
        break;

      case DataSourceType.APM:
        entities.users = this.extractAPMUsers(rawData);
        entities.hosts = this.extractAPMHosts(rawData);
        entities.processes = this.extractAPMProcesses(rawData);
        break;

      default:
        this.logger.warn('Unknown source type for entity extraction', { sourceType });
    }

    return entities;
  }

  /**
   * Extract EDR users
   */
  private extractEDRUsers(rawData: Record<string, any>): EntityInfo[] {
    const users: EntityInfo[] = [];

    if (rawData.process?.user) {
      users.push({
        id: rawData.process.user,
        name: rawData.process.user,
        type: EntityType.USER,
        attributes: {
          working_directory: rawData.process.working_directory,
          process_id: rawData.process.pid,
        },
        relationships: [],
      });
    }

    return users;
  }

  /**
   * Extract EDR hosts
   */
  private extractEDRHosts(rawData: Record<string, any>): EntityInfo[] {
    const hosts: EntityInfo[] = [];

    if (rawData.host) {
      hosts.push({
        id: rawData.host.hostname || rawData.host.ip_address,
        name: rawData.host.hostname || 'Unknown Host',
        type: EntityType.HOST,
        attributes: {
          ip_address: rawData.host.ip_address,
          os: rawData.host.os,
          agent_version: rawData.host.agent_version,
        },
        relationships: [],
      });
    }

    return hosts;
  }

  /**
   * Extract EDR processes
   */
  private extractEDRProcesses(rawData: Record<string, any>): EntityInfo[] {
    const processes: EntityInfo[] = [];

    if (rawData.process) {
      processes.push({
        id: rawData.process.pid?.toString() || 'unknown',
        name: rawData.process.name || 'Unknown Process',
        type: EntityType.PROCESS,
        attributes: {
          command_line: rawData.process.command_line,
          parent_pid: rawData.process.parent_pid,
          parent_name: rawData.process.parent_name,
          working_directory: rawData.process.working_directory,
        },
        relationships: [],
      });
    }

    return processes;
  }

  /**
   * Extract EDR files
   */
  private extractEDRFiles(rawData: Record<string, any>): EntityInfo[] {
    const files: EntityInfo[] = [];

    if (rawData.file) {
      files.push({
        id: rawData.file.hash?.sha256 || rawData.file.path,
        name: rawData.file.name || 'Unknown File',
        type: EntityType.FILE,
        attributes: {
          path: rawData.file.path,
          size: rawData.file.size,
          permissions: rawData.file.permissions,
          hashes: rawData.file.hash,
        },
        relationships: [],
      });
    }

    return files;
  }

  /**
   * Extract EDR networks
   */
  private extractEDRNetworks(rawData: Record<string, any>): EntityInfo[] {
    const networks: EntityInfo[] = [];

    if (rawData.network) {
      networks.push({
        id: `${rawData.network.source_ip}-${rawData.network.destination_ip}`,
        name: rawData.network.domain || rawData.network.destination_ip,
        type: EntityType.NETWORK,
        attributes: {
          source_ip: rawData.network.source_ip,
          destination_ip: rawData.network.destination_ip,
          source_port: rawData.network.source_port,
          destination_port: rawData.network.destination_port,
          protocol: rawData.network.protocol,
          domain: rawData.network.domain,
          url: rawData.network.url,
        },
        relationships: [],
      });
    }

    return networks;
  }

  /**
   * Extract SIEM users
   */
  private extractSIEMUsers(rawData: Record<string, any>): EntityInfo[] {
    const users: EntityInfo[] = [];

    if (rawData.user || rawData.username) {
      users.push({
        id: rawData.user || rawData.username,
        name: rawData.user || rawData.username,
        type: EntityType.USER,
        attributes: {
          domain: rawData.domain,
          session_id: rawData.session_id,
        },
        relationships: [],
      });
    }

    return users;
  }

  /**
   * Extract SIEM hosts
   */
  private extractSIEMHosts(rawData: Record<string, any>): EntityInfo[] {
    const hosts: EntityInfo[] = [];

    if (rawData.host || rawData.src_ip || rawData.dst_ip) {
      hosts.push({
        id: rawData.host || rawData.src_ip || rawData.dst_ip,
        name: rawData.host || 'Unknown Host',
        type: EntityType.HOST,
        attributes: {
          ip_address: rawData.src_ip || rawData.dst_ip,
          os: rawData.os,
        },
        relationships: [],
      });
    }

    return hosts;
  }

  /**
   * Extract SIEM networks
   */
  private extractSIEMNetworks(rawData: Record<string, any>): EntityInfo[] {
    const networks: EntityInfo[] = [];

    if (rawData.src_ip && rawData.dst_ip) {
      networks.push({
        id: `${rawData.src_ip}-${rawData.dst_ip}`,
        name: rawData.dst_ip,
        type: EntityType.NETWORK,
        attributes: {
          source_ip: rawData.src_ip,
          destination_ip: rawData.dst_ip,
          source_port: rawData.src_port,
          destination_port: rawData.dst_port,
          protocol: rawData.protocol,
        },
        relationships: [],
      });
    }

    return networks;
  }

  /**
   * Extract Cloud users
   */
  private extractCloudUsers(rawData: Record<string, any>): EntityInfo[] {
    const users: EntityInfo[] = [];

    if (rawData.userIdentity || rawData.user) {
      users.push({
        id: rawData.userIdentity?.arn || rawData.user,
        name: rawData.userIdentity?.userName || rawData.user,
        type: EntityType.USER,
        attributes: {
          arn: rawData.userIdentity?.arn,
          type: rawData.userIdentity?.type,
          principalId: rawData.userIdentity?.principalId,
        },
        relationships: [],
      });
    }

    return users;
  }

  /**
   * Extract Cloud hosts
   */
  private extractCloudHosts(rawData: Record<string, any>): EntityInfo[] {
    const hosts: EntityInfo[] = [];

    if (rawData.sourceIPAddress || rawData.userAgent) {
      hosts.push({
        id: rawData.sourceIPAddress || 'cloud-host',
        name: rawData.sourceIPAddress || 'Cloud Host',
        type: EntityType.HOST,
        attributes: {
          ip_address: rawData.sourceIPAddress,
          user_agent: rawData.userAgent,
          region: rawData.awsRegion,
        },
        relationships: [],
      });
    }

    return hosts;
  }

  /**
   * Extract Cloud networks
   */
  private extractCloudNetworks(rawData: Record<string, any>): EntityInfo[] {
    const networks: EntityInfo[] = [];

    if (rawData.sourceIPAddress) {
      networks.push({
        id: rawData.sourceIPAddress,
        name: rawData.sourceIPAddress,
        type: EntityType.NETWORK,
        attributes: {
          source_ip: rawData.sourceIPAddress,
          region: rawData.awsRegion,
          service: rawData.eventSource,
        },
        relationships: [],
      });
    }

    return networks;
  }

  /**
   * Extract Fraud users
   */
  private extractFraudUsers(rawData: Record<string, any>): EntityInfo[] {
    const users: EntityInfo[] = [];

    if (rawData.user_id || rawData.customer_id) {
      users.push({
        id: rawData.user_id || rawData.customer_id,
        name: rawData.user_id || rawData.customer_id,
        type: EntityType.USER,
        attributes: {
          customer_id: rawData.customer_id,
          account_id: rawData.account_id,
          risk_score: rawData.risk_score,
        },
        relationships: [],
      });
    }

    return users;
  }

  /**
   * Extract Fraud networks
   */
  private extractFraudNetworks(rawData: Record<string, any>): EntityInfo[] {
    const networks: EntityInfo[] = [];

    if (rawData.ip_address || rawData.device_id) {
      networks.push({
        id: rawData.ip_address || rawData.device_id,
        name: rawData.ip_address || rawData.device_id,
        type: EntityType.NETWORK,
        attributes: {
          ip_address: rawData.ip_address,
          device_id: rawData.device_id,
          location: rawData.location,
        },
        relationships: [],
      });
    }

    return networks;
  }

  /**
   * Extract APM users
   */
  private extractAPMUsers(rawData: Record<string, any>): EntityInfo[] {
    const users: EntityInfo[] = [];

    if (rawData.user_id || rawData.session_id) {
      users.push({
        id: rawData.user_id || rawData.session_id,
        name: rawData.user_id || rawData.session_id,
        type: EntityType.USER,
        attributes: {
          session_id: rawData.session_id,
          user_agent: rawData.user_agent,
        },
        relationships: [],
      });
    }

    return users;
  }

  /**
   * Extract APM hosts
   */
  private extractAPMHosts(rawData: Record<string, any>): EntityInfo[] {
    const hosts: EntityInfo[] = [];

    if (rawData.host || rawData.server) {
      hosts.push({
        id: rawData.host || rawData.server,
        name: rawData.host || rawData.server,
        type: EntityType.HOST,
        attributes: {
          hostname: rawData.host,
          server: rawData.server,
          environment: rawData.environment,
        },
        relationships: [],
      });
    }

    return hosts;
  }

  /**
   * Extract APM processes
   */
  private extractAPMProcesses(rawData: Record<string, any>): EntityInfo[] {
    const processes: EntityInfo[] = [];

    if (rawData.service || rawData.process) {
      processes.push({
        id: rawData.service || rawData.process,
        name: rawData.service || rawData.process,
        type: EntityType.PROCESS,
        attributes: {
          service: rawData.service,
          process: rawData.process,
          version: rawData.version,
        },
        relationships: [],
      });
    }

    return processes;
  }

  /**
   * Extract context information
   */
  private extractContext(rawData: Record<string, any>, sourceType: DataSourceType): any {
    return {
      action: this.extractAction(rawData, sourceType),
      resource: this.extractResource(rawData, sourceType),
      location: this.extractLocation(rawData, sourceType),
      network: this.extractNetworkContext(rawData, sourceType),
      time: this.extractTimeContext(rawData, sourceType),
    };
  }

  /**
   * Extract action from raw data
   */
  private extractAction(rawData: Record<string, any>, sourceType: DataSourceType): string {
    switch (sourceType) {
      case DataSourceType.EDR:
        return rawData.event_type || rawData.action || 'unknown';
      case DataSourceType.SIEM:
        return rawData.event_type || rawData.action || 'unknown';
      case DataSourceType.CLOUD:
        return rawData.eventName || rawData.action || 'unknown';
      case DataSourceType.FRAUD:
        return rawData.transaction_type || rawData.action || 'unknown';
      case DataSourceType.APM:
        return rawData.operation || rawData.action || 'unknown';
      default:
        return 'unknown';
    }
  }

  /**
   * Extract resource from raw data
   */
  private extractResource(rawData: Record<string, any>, sourceType: DataSourceType): string {
    switch (sourceType) {
      case DataSourceType.EDR:
        return rawData.file?.path || rawData.process?.name || 'unknown';
      case DataSourceType.SIEM:
        return rawData.resource || rawData.target || 'unknown';
      case DataSourceType.CLOUD:
        return rawData.resource || rawData.resourceName || 'unknown';
      case DataSourceType.FRAUD:
        return rawData.transaction_id || rawData.account_id || 'unknown';
      case DataSourceType.APM:
        return rawData.service || rawData.endpoint || 'unknown';
      default:
        return 'unknown';
    }
  }

  /**
   * Extract location information
   */
  private extractLocation(rawData: Record<string, any>, sourceType: DataSourceType): any {
    return {
      country: rawData.country || rawData.geo?.country,
      region: rawData.region || rawData.geo?.region,
      city: rawData.city || rawData.geo?.city,
      coordinates: rawData.coordinates || rawData.geo?.coordinates,
      timezone: rawData.timezone || rawData.geo?.timezone,
    };
  }

  /**
   * Extract network context
   */
  private extractNetworkContext(rawData: Record<string, any>, sourceType: DataSourceType): any {
    switch (sourceType) {
      case DataSourceType.EDR:
        return {
          sourceIp: rawData.network?.source_ip,
          destinationIp: rawData.network?.destination_ip,
          sourcePort: rawData.network?.source_port,
          destinationPort: rawData.network?.destination_port,
          protocol: rawData.network?.protocol,
          domain: rawData.network?.domain,
          url: rawData.network?.url,
          userAgent: rawData.user_agent,
        };
      case DataSourceType.SIEM:
        return {
          sourceIp: rawData.src_ip,
          destinationIp: rawData.dst_ip,
          sourcePort: rawData.src_port,
          destinationPort: rawData.dst_port,
          protocol: rawData.protocol,
          domain: rawData.domain,
          url: rawData.url,
          userAgent: rawData.user_agent,
        };
      case DataSourceType.CLOUD:
        return {
          sourceIp: rawData.sourceIPAddress,
          destinationIp: rawData.destinationIPAddress,
          protocol: rawData.protocol,
          domain: rawData.domain,
          url: rawData.url,
          userAgent: rawData.userAgent,
        };
      case DataSourceType.FRAUD:
        return {
          sourceIp: rawData.ip_address,
          domain: rawData.domain,
          url: rawData.url,
          userAgent: rawData.user_agent,
        };
      case DataSourceType.APM:
        return {
          sourceIp: rawData.client_ip,
          domain: rawData.host,
          url: rawData.url,
          userAgent: rawData.user_agent,
        };
      default:
        return {};
    }
  }

  /**
   * Extract time context
   */
  private extractTimeContext(rawData: Record<string, any>, sourceType: DataSourceType): any {
    const timestamp = this.parseTimestamp(rawData, sourceType);
    const date = new Date(timestamp);

    return {
      timestamp,
      timezone: rawData.timezone || 'UTC',
      businessHours: this.isBusinessHours(date),
      dayOfWeek: date.getDay(),
      hourOfDay: date.getHours(),
    };
  }

  /**
   * Parse timestamp from raw data
   */
  private parseTimestamp(rawData: Record<string, any>, sourceType: DataSourceType): Date {
    const timestampFields = ['timestamp', 'time', 'created_at', 'event_time', 'datetime'];
    
    for (const field of timestampFields) {
      if (rawData[field]) {
        const parsed = new Date(rawData[field]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return new Date();
  }

  /**
   * Check if time is during business hours
   */
  private isBusinessHours(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  }

  /**
   * Extract security indicators
   */
  private extractIndicators(rawData: Record<string, any>, sourceType: DataSourceType): any {
    return {
      iocs: this.extractIOCs(rawData, sourceType),
      behaviors: this.extractBehaviors(rawData, sourceType),
      anomalies: this.extractAnomalies(rawData, sourceType),
    };
  }

  /**
   * Extract Indicators of Compromise
   */
  private extractIOCs(rawData: Record<string, any>, sourceType: DataSourceType): any[] {
    const iocs: any[] = [];

    // Extract IP addresses
    const ipFields = ['ip', 'ip_address', 'src_ip', 'dst_ip', 'source_ip', 'destination_ip'];
    for (const field of ipFields) {
      if (rawData[field] && this.isValidIP(rawData[field])) {
        iocs.push({
          type: 'ip_address',
          value: rawData[field],
          confidence: 0.8,
          source: sourceType,
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
      }
    }

    // Extract domains
    const domainFields = ['domain', 'hostname', 'fqdn'];
    for (const field of domainFields) {
      if (rawData[field] && this.isValidDomain(rawData[field])) {
        iocs.push({
          type: 'domain',
          value: rawData[field],
          confidence: 0.7,
          source: sourceType,
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
      }
    }

    // Extract file hashes
    if (rawData.file?.hash) {
      const hashFields = ['md5', 'sha1', 'sha256'];
      for (const field of hashFields) {
        if (rawData.file.hash[field]) {
          iocs.push({
            type: 'hash',
            value: rawData.file.hash[field],
            confidence: 0.9,
            source: sourceType,
            firstSeen: new Date(),
            lastSeen: new Date(),
          });
        }
      }
    }

    return iocs;
  }

  /**
   * Extract behavioral indicators
   */
  private extractBehaviors(rawData: Record<string, any>, sourceType: DataSourceType): any[] {
    const behaviors: any[] = [];

    // Process execution behavior
    if (rawData.process || rawData.command_line) {
      behaviors.push({
        type: 'process_execution',
        description: `Process executed: ${rawData.process?.name || 'unknown'}`,
        confidence: 0.8,
        baseline: 0.5,
        deviation: 0.3,
        timeframe: '1h',
      });
    }

    // Network communication behavior
    if (rawData.network || rawData.src_ip || rawData.dst_ip) {
      behaviors.push({
        type: 'network_communication',
        description: 'Network communication detected',
        confidence: 0.7,
        baseline: 0.4,
        deviation: 0.3,
        timeframe: '1h',
      });
    }

    // File access behavior
    if (rawData.file || rawData.file_path) {
      behaviors.push({
        type: 'file_operations',
        description: 'File access detected',
        confidence: 0.6,
        baseline: 0.3,
        deviation: 0.3,
        timeframe: '1h',
      });
    }

    return behaviors;
  }

  /**
   * Extract anomaly indicators
   */
  private extractAnomalies(rawData: Record<string, any>, sourceType: DataSourceType): any[] {
    const anomalies: any[] = [];

    // High severity events are anomalies
    const severity = rawData.severity || rawData.level || 'medium';
    if (severity === 'high' || severity === 'critical' || severity === 'error') {
      anomalies.push({
        type: 'behavioral',
        description: `High severity event: ${severity}`,
        severity: 0.8,
        confidence: 0.9,
        context: `${sourceType} detection`,
      });
    }

    // Threat detections are anomalies
    if (rawData.threat || rawData.malware || rawData.attack) {
      anomalies.push({
        type: 'statistical',
        description: `Threat detected: ${rawData.threat?.name || 'unknown'}`,
        severity: 0.9,
        confidence: rawData.threat?.confidence || 0.8,
        context: `${sourceType} threat detection`,
      });
    }

    return anomalies;
  }

  /**
   * Calculate risk assessment
   */
  private calculateRisk(rawData: Record<string, any>, sourceType: DataSourceType): any {
    let score = 0;
    const factors: any[] = [];

    // Base score from severity
    const severity = rawData.severity || rawData.level || 'medium';
    const severityScores = { critical: 0.9, high: 0.7, medium: 0.5, low: 0.3, info: 0.1 };
    score += severityScores[severity as keyof typeof severityScores] || 0.5;

    factors.push({
      type: 'severity',
      description: `Event severity: ${severity}`,
      weight: 0.4,
      value: severityScores[severity as keyof typeof severityScores] || 0.5,
      impact: 'Detection confidence',
    });

    // Threat confidence bonus
    if (rawData.threat?.confidence) {
      score += rawData.threat.confidence * 0.3;
      factors.push({
        type: 'confidence',
        description: `Threat confidence: ${rawData.threat.confidence}`,
        weight: 0.3,
        value: rawData.threat.confidence,
        impact: 'Threat detection accuracy',
      });
    }

    // Risk score from data source
    if (rawData.risk_score) {
      score += rawData.risk_score * 0.2;
      factors.push({
        type: 'risk_score',
        description: `Source risk score: ${rawData.risk_score}`,
        weight: 0.2,
        value: rawData.risk_score,
        impact: 'Source-specific risk assessment',
      });
    }

    return {
      score: Math.min(1.0, score),
      factors,
      confidence: 0.8,
    };
  }

  /**
   * Validate IP address
   */
  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Validate domain name
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }
}
