/**
 * Core type definitions for the AI Detection Engineering Agent
 * Defines interfaces for data sources, AI processing, and API contracts
 */

// ============================================================================
// DATA SOURCE TYPES
// ============================================================================

/**
 * Base interface for all security events from various data sources
 * Provides a normalized structure for the AI agent to process
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  source: DataSourceType;
  eventType: string;
  severity: EventSeverity;
  rawData: Record<string, any>;
  normalizedData: NormalizedEventData;
  metadata: EventMetadata;
  correlationId?: string;
}

/**
 * Normalized event data structure that all data sources must conform to
 * This ensures consistent processing by the AI agent regardless of source
 */
export interface NormalizedEventData {
  // Entity Information
  entities: {
    users: EntityInfo[];
    hosts: EntityInfo[];
    networks: EntityInfo[];
    processes: EntityInfo[];
    files: EntityInfo[];
  };
  
  // Event Context
  context: {
    action: string;
    resource: string;
    location: GeographicInfo;
    network: NetworkInfo;
    time: TemporalInfo;
  };
  
  // Security Indicators
  indicators: {
    iocs: IndicatorOfCompromise[];
    behaviors: BehavioralIndicator[];
    anomalies: AnomalyIndicator[];
  };
  
  // Risk Assessment
  risk: {
    score: number;
    factors: RiskFactor[];
    confidence: number;
  };
}

/**
 * Entity information structure for users, hosts, processes, etc.
 */
export interface EntityInfo {
  id: string;
  name: string;
  type: EntityType;
  attributes: Record<string, any>;
  relationships: EntityRelationship[];
}

/**
 * Geographic information for location-based analysis
 */
export interface GeographicInfo {
  country?: string;
  region?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone?: string;
}

/**
 * Network information for network-based analysis
 */
export interface NetworkInfo {
  sourceIp?: string;
  destinationIp?: string;
  sourcePort?: number;
  destinationPort?: number;
  protocol?: string;
  domain?: string;
  url?: string;
  userAgent?: string;
}

/**
 * Temporal information for time-based analysis
 */
export interface TemporalInfo {
  timestamp: Date;
  timezone: string;
  businessHours: boolean;
  dayOfWeek: number;
  hourOfDay: number;
}

/**
 * Indicator of Compromise (IOC) structure
 */
export interface IndicatorOfCompromise {
  type: IoCType;
  value: string;
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
}

/**
 * Behavioral indicator for anomaly detection
 */
export interface BehavioralIndicator {
  type: BehaviorType;
  description: string;
  confidence: number;
  baseline: number;
  deviation: number;
  timeframe: string;
}

/**
 * Anomaly indicator for unusual patterns
 */
export interface AnomalyIndicator {
  type: AnomalyType;
  description: string;
  severity: number;
  confidence: number;
  context: string;
}

/**
 * Risk factor contributing to overall risk score
 */
export interface RiskFactor {
  type: RiskFactorType;
  description: string;
  weight: number;
  value: number;
  impact: string;
}

/**
 * Entity relationship for graph correlation
 */
export interface EntityRelationship {
  target: string;
  relationship: RelationshipType;
  strength: number;
  lastSeen: Date;
}

/**
 * Event metadata for processing context
 */
export interface EventMetadata {
  sourceSystem: string;
  version: string;
  processingTime: number;
  enrichmentApplied: string[];
  qualityScore: number;
  tags: string[];
}

// ============================================================================
// AI AGENT TYPES
// ============================================================================

/**
 * Detection rule structure for the AI agent
 */
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  category: RuleCategory;
  technique: string; // MITRE ATT&CK technique
  logic: RuleLogic;
  metadata: RuleMetadata;
  performance: RulePerformance;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rule logic structure for AI-generated rules
 */
export interface RuleLogic {
  query: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  thresholds: RuleThreshold[];
  exceptions: RuleException[];
}

/**
 * Rule condition for detection logic
 */
export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  weight: number;
  required: boolean;
}

/**
 * Rule action to take when conditions are met
 */
export interface RuleAction {
  type: ActionType;
  parameters: Record<string, any>;
  priority: number;
}

/**
 * Rule threshold for alert generation
 */
export interface RuleThreshold {
  metric: string;
  value: number;
  operator: ThresholdOperator;
  timeframe: string;
}

/**
 * Rule exception for false positive reduction
 */
export interface RuleException {
  condition: RuleCondition;
  reason: string;
  createdBy: string;
  createdAt: Date;
}

/**
 * Rule metadata for management and tracking
 */
export interface RuleMetadata {
  author: string;
  tags: string[];
  mitreTechniques: string[];
  dataSources: DataSourceType[];
  confidence: number;
  falsePositiveRate: number;
  lastTested: Date;
}

/**
 * Rule performance metrics
 */
export interface RulePerformance {
  totalMatches: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastUpdated: Date;
}

/**
 * AI recommendation structure
 */
export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  priority: Priority;
  title: string;
  description: string;
  confidence: number;
  impact: RecommendationImpact;
  actions: RecommendationAction[];
  metadata: RecommendationMetadata;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Recommendation impact assessment
 */
export interface RecommendationImpact {
  detectionImprovement: number;
  falsePositiveReduction: number;
  resourceImpact: number;
  implementationEffort: number;
  riskLevel: RiskLevel;
}

/**
 * Recommendation action to implement
 */
export interface RecommendationAction {
  type: ActionType;
  description: string;
  parameters: Record<string, any>;
  automated: boolean;
  estimatedTime: number;
}

/**
 * Recommendation metadata
 */
export interface RecommendationMetadata {
  source: string;
  reasoning: string;
  alternatives: string[];
  dependencies: string[];
  rollbackPlan: string;
}

// ============================================================================
// KNOWLEDGE BASE TYPES
// ============================================================================

/**
 * Threat intelligence entry
 */
export interface ThreatIntelligence {
  id: string;
  type: ThreatType;
  value: string;
  description: string;
  confidence: number;
  severity: ThreatSeverity;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  references: string[];
  mitigation: string[];
}

/**
 * Attack pattern from MITRE ATT&CK
 */
export interface AttackPattern {
  id: string;
  name: string;
  description: string;
  technique: string;
  tactics: string[];
  platforms: string[];
  dataSources: string[];
  detection: string[];
  mitigation: string[];
  references: string[];
}

/**
 * Behavioral baseline for anomaly detection
 */
export interface BehavioralBaseline {
  entityId: string;
  entityType: EntityType;
  patterns: BehaviorPattern[];
  metrics: BehaviorMetrics;
  lastUpdated: Date;
  confidence: number;
}

/**
 * Behavior pattern for baseline comparison
 */
export interface BehaviorPattern {
  type: BehaviorType;
  frequency: number;
  timing: TimingPattern;
  context: string[];
  variance: number;
}

/**
 * Behavior metrics for statistical analysis
 */
export interface BehaviorMetrics {
  mean: number;
  median: number;
  standardDeviation: number;
  percentiles: Record<number, number>;
  outliers: number[];
}

/**
 * Timing pattern for behavioral analysis
 */
export interface TimingPattern {
  businessHours: number;
  afterHours: number;
  weekends: number;
  holidays: number;
  peakHours: number[];
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  timestamp: Date;
  requestId: string;
  processingTime: number;
  version: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// ENUMS
// ============================================================================

export enum DataSourceType {
  EDR = 'edr',
  SIEM = 'siem',
  CLOUD = 'cloud',
  FRAUD = 'fraud',
  APM = 'apm'
}

export enum EventSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum EntityType {
  USER = 'user',
  HOST = 'host',
  PROCESS = 'process',
  FILE = 'file',
  NETWORK = 'network',
  DOMAIN = 'domain',
  IP = 'ip'
}

export enum IoCType {
  IP_ADDRESS = 'ip_address',
  DOMAIN = 'domain',
  URL = 'url',
  HASH = 'hash',
  EMAIL = 'email',
  REGISTRY_KEY = 'registry_key',
  FILE_PATH = 'file_path'
}

export enum BehaviorType {
  LOGIN_PATTERN = 'login_pattern',
  DATA_ACCESS = 'data_access',
  NETWORK_COMMUNICATION = 'network_communication',
  FILE_OPERATIONS = 'file_operations',
  PROCESS_EXECUTION = 'process_execution',
  PRIVILEGE_ESCALATION = 'privilege_escalation'
}

export enum AnomalyType {
  STATISTICAL = 'statistical',
  TEMPORAL = 'temporal',
  BEHAVIORAL = 'behavioral',
  NETWORK = 'network',
  SYSTEM = 'system'
}

export enum RiskFactorType {
  SEVERITY = 'severity',
  CONFIDENCE = 'confidence',
  FREQUENCY = 'frequency',
  IMPACT = 'impact',
  LIKELIHOOD = 'likelihood'
}

export enum RelationshipType {
  COMMUNICATES_WITH = 'communicates_with',
  ACCESSES = 'accesses',
  EXECUTES = 'executes',
  OWNS = 'owns',
  CONTAINS = 'contains',
  SIMILAR_TO = 'similar_to'
}

export enum RuleStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  TESTING = 'testing',
  DISABLED = 'disabled',
  DEPRECATED = 'deprecated'
}

export enum RuleCategory {
  MALWARE = 'malware',
  LATERAL_MOVEMENT = 'lateral_movement',
  PERSISTENCE = 'persistence',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DEFENSE_EVASION = 'defense_evasion',
  CREDENTIAL_ACCESS = 'credential_access',
  DISCOVERY = 'discovery',
  COLLECTION = 'collection',
  COMMAND_AND_CONTROL = 'command_and_control',
  EXFILTRATION = 'exfiltration',
  IMPACT = 'impact'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  REGEX = 'regex',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

export enum ActionType {
  ALERT = 'alert',
  BLOCK = 'block',
  QUARANTINE = 'quarantine',
  LOG = 'log',
  NOTIFY = 'notify',
  ESCALATE = 'escalate',
  SUPPRESS = 'suppress'
}

export enum ThresholdOperator {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal'
}

export enum RecommendationType {
  NEW_RULE = 'new_rule',
  TUNE_RULE = 'tune_rule',
  SUPPRESS_RULE = 'suppress_rule',
  UPDATE_RULE = 'update_rule',
  DELETE_RULE = 'delete_rule'
}

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ThreatType {
  MALWARE = 'malware',
  PHISHING = 'phishing',
  RANSOMWARE = 'ransomware',
  APT = 'apt',
  INSIDER_THREAT = 'insider_threat',
  DDoS = 'ddos',
  BRUTE_FORCE = 'brute_force',
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  CSRF = 'csrf'
}

export enum ThreatSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}
