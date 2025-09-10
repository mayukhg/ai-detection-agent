/**
 * API Service for Frontend-Backend Communication
 * Handles all HTTP requests to the AI Detection Engineering Agent backend
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * API Response wrapper interface
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Security Event interface
 */
interface SecurityEvent {
  id: string;
  timestamp: string;
  source: string;
  eventType: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  normalizedData: any;
  metadata: any;
}

/**
 * Detection Rule interface
 */
interface DetectionRule {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'active' | 'draft' | 'testing' | 'disabled' | 'deprecated';
  category: string;
  technique: string;
  logic: any;
  metadata: any;
  performance: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * AI Recommendation interface
 */
interface AIRecommendation {
  id: string;
  type: 'new_rule' | 'tune_rule' | 'suppress_rule' | 'update_rule' | 'delete_rule';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number;
  impact: any;
  actions: any[];
  metadata: any;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Dashboard Overview interface
 */
interface DashboardOverview {
  coverage: number;
  totalAlerts: number;
  falsePositiveRate: number;
  activeRules: number;
  queueSize: number;
}

/**
 * Agent Statistics interface
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
 * API Service Class
 * Centralized service for all backend API communications
 */
export class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api/v1') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // EVENTS API
  // ============================================================================

  /**
   * Process a security event
   */
  async processEvent(event: SecurityEvent): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/events', event);
      return response.data;
    } catch (error) {
      console.error('Failed to process event:', error);
      throw error;
    }
  }

  /**
   * Get recent security events
   */
  async getEvents(params: PaginationParams = { page: 1, limit: 100 }): Promise<ApiResponse<SecurityEvent[]>> {
    try {
      const response = await this.api.get('/events', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get events:', error);
      throw error;
    }
  }

  // ============================================================================
  // RULES API
  // ============================================================================

  /**
   * Get all detection rules
   */
  async getRules(): Promise<ApiResponse<DetectionRule[]>> {
    try {
      const response = await this.api.get('/rules');
      return response.data;
    } catch (error) {
      console.error('Failed to get rules:', error);
      throw error;
    }
  }

  /**
   * Create a new detection rule
   */
  async createRule(rule: Omit<DetectionRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<DetectionRule>> {
    try {
      const response = await this.api.post('/rules', rule);
      return response.data;
    } catch (error) {
      console.error('Failed to create rule:', error);
      throw error;
    }
  }

  /**
   * Update an existing detection rule
   */
  async updateRule(id: string, updates: Partial<DetectionRule>): Promise<ApiResponse<DetectionRule>> {
    try {
      const response = await this.api.put(`/rules/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update rule:', error);
      throw error;
    }
  }

  /**
   * Delete a detection rule
   */
  async deleteRule(id: string): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/rules/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete rule:', error);
      throw error;
    }
  }

  // ============================================================================
  // RECOMMENDATIONS API
  // ============================================================================

  /**
   * Get AI recommendations
   */
  async getRecommendations(): Promise<ApiResponse<AIRecommendation[]>> {
    try {
      const response = await this.api.get('/recommendations');
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  }

  /**
   * Approve a recommendation
   */
  async approveRecommendation(id: string): Promise<ApiResponse> {
    try {
      const response = await this.api.post(`/recommendations/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('Failed to approve recommendation:', error);
      throw error;
    }
  }

  /**
   * Reject a recommendation
   */
  async rejectRecommendation(id: string): Promise<ApiResponse> {
    try {
      const response = await this.api.post(`/recommendations/${id}/reject`);
      return response.data;
    } catch (error) {
      console.error('Failed to reject recommendation:', error);
      throw error;
    }
  }

  // ============================================================================
  // ANALYTICS API
  // ============================================================================

  /**
   * Get analytics statistics
   */
  async getAnalyticsStats(): Promise<ApiResponse<AgentStats>> {
    try {
      const response = await this.api.get('/analytics/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get analytics stats:', error);
      throw error;
    }
  }

  // ============================================================================
  // DASHBOARD API
  // ============================================================================

  /**
   * Get dashboard overview data
   */
  async getDashboardOverview(): Promise<ApiResponse<DashboardOverview>> {
    try {
      const response = await this.api.get('/dashboard/overview');
      return response.data;
    } catch (error) {
      console.error('Failed to get dashboard overview:', error);
      throw error;
    }
  }

  // ============================================================================
  // WEBSOCKET CONNECTION
  // ============================================================================

  /**
   * Create WebSocket connection for real-time updates
   */
  createWebSocketConnection(): WebSocket {
    const wsUrl = this.baseURL.replace('http', 'ws').replace('/api/v1', '');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Join dashboard room
      ws.send(JSON.stringify({ type: 'join', room: 'dashboard' }));
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    delete this.api.defaults.headers.common['Authorization'];
  }

  /**
   * Update base URL
   */
  updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
    this.api.defaults.baseURL = newBaseURL;
  }
}

// Create default API service instance
export const apiService = new ApiService();

// Export types for use in components
export type {
  ApiResponse,
  PaginationParams,
  SecurityEvent,
  DetectionRule,
  AIRecommendation,
  DashboardOverview,
  AgentStats,
};
