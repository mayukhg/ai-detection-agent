/**
 * LLM Service for AI Detection Engineering Agent
 * Handles rule generation, evaluation, and recommendation generation using Large Language Models
 */

import { DetectionRule, AIRecommendation, SecurityEvent } from '@/types';
import { Logger } from '@/utils/logger';
import OpenAI from 'openai';

/**
 * LLM Service Configuration
 */
interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  baseURL?: string;
}

/**
 * Rule evaluation result from LLM
 */
interface RuleEvaluationResult {
  matches: boolean;
  confidence: number;
  reason: string;
  suggestions?: string[];
}

/**
 * Rule generation request
 */
interface RuleGenerationRequest {
  threatType: string;
  technique: string;
  dataSources: string[];
  context: string;
  examples?: SecurityEvent[];
}

/**
 * Recommendation generation request
 */
interface RecommendationRequest {
  event: SecurityEvent;
  ruleResults: any;
  existingRules: DetectionRule[];
  knowledgeBase: any;
}

/**
 * LLM Service for AI-powered detection engineering
 */
export class LLMService {
  private readonly logger: Logger;
  private readonly config: LLMConfig;
  private openai: OpenAI | null = null;
  private isInitialized: boolean = false;

  constructor(config: LLMConfig) {
    this.config = config;
    this.logger = new Logger('LLMService');
  }

  /**
   * Initialize the LLM service
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing LLM Service', { provider: this.config.provider });

      if (this.config.provider === 'openai') {
        this.openai = new OpenAI({
          apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
          baseURL: this.config.baseURL,
        });
      }

      // Test the connection
      await this.testConnection();
      
      this.isInitialized = true;
      this.logger.info('LLM Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LLM Service', { error: error.message });
      throw error;
    }
  }

  /**
   * Test LLM connection
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.generateCompletion('Test connection');
      if (!response) {
        throw new Error('No response from LLM');
      }
      this.logger.info('LLM connection test successful');
    } catch (error) {
      this.logger.error('LLM connection test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Evaluate a detection rule against an event using LLM
   */
  async evaluateRule(prompt: string): Promise<RuleEvaluationResult> {
    if (!this.isInitialized) {
      throw new Error('LLM Service not initialized');
    }

    try {
      const systemPrompt = `
You are an expert cybersecurity analyst evaluating detection rules. 
Analyze the provided rule and event data to determine if they match.
Consider behavioral patterns, threat indicators, and contextual information.
Respond with valid JSON only.
      `.trim();

      const response = await this.generateCompletion(prompt, systemPrompt);
      const result = this.parseJSONResponse(response);

      return {
        matches: result.matches || false,
        confidence: Math.max(0, Math.min(1, result.confidence || 0)),
        reason: result.reason || 'No reason provided',
        suggestions: result.suggestions || [],
      };
    } catch (error) {
      this.logger.error('Failed to evaluate rule', { error: error.message });
      return {
        matches: false,
        confidence: 0,
        reason: 'Evaluation failed due to error',
      };
    }
  }

  /**
   * Generate a new detection rule using LLM
   */
  async generateRule(request: RuleGenerationRequest): Promise<DetectionRule> {
    if (!this.isInitialized) {
      throw new Error('LLM Service not initialized');
    }

    try {
      const prompt = this.buildRuleGenerationPrompt(request);
      const systemPrompt = `
You are an expert detection engineer creating security detection rules.
Generate a comprehensive detection rule based on the threat type and technique.
Consider MITRE ATT&CK framework, data source capabilities, and best practices.
Respond with valid JSON only.
      `.trim();

      const response = await this.generateCompletion(prompt, systemPrompt);
      const ruleData = this.parseJSONResponse(response);

      return this.buildDetectionRule(ruleData, request);
    } catch (error) {
      this.logger.error('Failed to generate rule', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate AI recommendations based on event analysis
   */
  async generateRecommendations(request: RecommendationRequest): Promise<AIRecommendation[]> {
    if (!this.isInitialized) {
      throw new Error('LLM Service not initialized');
    }

    try {
      const prompt = this.buildRecommendationPrompt(request);
      const systemPrompt = `
You are an expert security analyst providing recommendations for detection improvements.
Analyze the event, existing rules, and knowledge base to suggest actionable improvements.
Focus on reducing false positives, improving coverage, and optimizing detection accuracy.
Respond with valid JSON only.
      `.trim();

      const response = await this.generateCompletion(prompt, systemPrompt);
      const recommendations = this.parseJSONResponse(response);

      return Array.isArray(recommendations) 
        ? recommendations.map(rec => this.buildRecommendation(rec, request))
        : [this.buildRecommendation(recommendations, request)];
    } catch (error) {
      this.logger.error('Failed to generate recommendations', { error: error.message });
      return [];
    }
  }

  /**
   * Optimize an existing detection rule using LLM
   */
  async optimizeRule(rule: DetectionRule, feedback: any): Promise<DetectionRule> {
    if (!this.isInitialized) {
      throw new Error('LLM Service not initialized');
    }

    try {
      const prompt = this.buildRuleOptimizationPrompt(rule, feedback);
      const systemPrompt = `
You are an expert detection engineer optimizing security rules.
Improve the rule based on performance feedback and false positive analysis.
Maintain detection effectiveness while reducing noise.
Respond with valid JSON only.
      `.trim();

      const response = await this.generateCompletion(prompt, systemPrompt);
      const optimizedData = this.parseJSONResponse(response);

      return this.mergeRuleOptimizations(rule, optimizedData);
    } catch (error) {
      this.logger.error('Failed to optimize rule', { error: error.message });
      return rule; // Return original rule if optimization fails
    }
  }

  /**
   * Generate completion using the configured LLM
   */
  private async generateCompletion(
    prompt: string, 
    systemPrompt?: string
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const messages: any[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Build prompt for rule generation
   */
  private buildRuleGenerationPrompt(request: RuleGenerationRequest): string {
    return `
Generate a detection rule for the following requirements:

THREAT TYPE: ${request.threatType}
TECHNIQUE: ${request.technique}
DATA SOURCES: ${request.dataSources.join(', ')}
CONTEXT: ${request.context}

${request.examples ? `
EXAMPLE EVENTS:
${request.examples.map((event, i) => `
Event ${i + 1}:
- Type: ${event.eventType}
- Severity: ${event.severity}
- Entities: ${JSON.stringify(event.normalizedData.entities, null, 2)}
- Indicators: ${JSON.stringify(event.normalizedData.indicators, null, 2)}
`).join('\n')}
` : ''}

Generate a comprehensive detection rule with:
1. Clear rule logic and conditions
2. Appropriate thresholds and exceptions
3. MITRE ATT&CK technique mapping
4. Performance considerations
5. False positive mitigation

Respond with JSON:
{
  "name": "Rule Name",
  "description": "Detailed description",
  "technique": "T1234",
  "logic": {
    "query": "detection query",
    "conditions": [...],
    "thresholds": [...],
    "exceptions": [...]
  },
  "metadata": {
    "mitreTechniques": ["T1234"],
    "dataSources": ["edr", "siem"],
    "confidence": 0.8,
    "falsePositiveRate": 0.1
  }
}
    `.trim();
  }

  /**
   * Build prompt for recommendation generation
   */
  private buildRecommendationPrompt(request: RecommendationRequest): string {
    return `
Analyze the following security event and provide recommendations:

EVENT DETAILS:
- Type: ${request.event.eventType}
- Severity: ${request.event.severity}
- Source: ${request.event.source}
- Entities: ${JSON.stringify(request.event.normalizedData.entities, null, 2)}
- Indicators: ${JSON.stringify(request.event.normalizedData.indicators, null, 2)}

EXISTING RULES: ${request.existingRules.length} rules active
RULE RESULTS: ${JSON.stringify(request.ruleResults, null, 2)}

KNOWLEDGE BASE:
- Threat Intel: ${request.knowledgeBase.threatIntel?.length || 0} items
- Attack Patterns: ${request.knowledgeBase.attackPatterns?.length || 0} patterns

Provide actionable recommendations to:
1. Improve detection coverage
2. Reduce false positives
3. Optimize rule performance
4. Enhance threat intelligence

Respond with JSON array:
[
  {
    "type": "new_rule|tune_rule|suppress_rule|update_rule",
    "priority": "critical|high|medium|low",
    "title": "Recommendation title",
    "description": "Detailed description",
    "confidence": 0.8,
    "impact": {
      "detectionImprovement": 0.3,
      "falsePositiveReduction": 0.2,
      "resourceImpact": 0.1,
      "implementationEffort": 0.4,
      "riskLevel": "medium"
    },
    "actions": [
      {
        "type": "create_rule|modify_rule|suppress_alert",
        "description": "Action description",
        "parameters": {},
        "automated": true,
        "estimatedTime": 30
      }
    ]
  }
]
    `.trim();
  }

  /**
   * Build prompt for rule optimization
   */
  private buildRuleOptimizationPrompt(rule: DetectionRule, feedback: any): string {
    return `
Optimize the following detection rule based on performance feedback:

CURRENT RULE:
- Name: ${rule.name}
- Description: ${rule.description}
- Logic: ${rule.logic.query}
- Performance: ${JSON.stringify(rule.performance, null, 2)}

FEEDBACK DATA:
- False Positives: ${feedback.falsePositives || 0}
- True Positives: ${feedback.truePositives || 0}
- Accuracy: ${feedback.accuracy || 0}
- Common FP Patterns: ${JSON.stringify(feedback.commonPatterns || [], null, 2)}

Optimize the rule to:
1. Reduce false positives while maintaining detection capability
2. Improve performance and efficiency
3. Add appropriate exceptions and thresholds
4. Enhance rule logic based on feedback patterns

Respond with JSON:
{
  "optimizations": {
    "query": "optimized query",
    "conditions": [...],
    "thresholds": [...],
    "exceptions": [...]
  },
  "reasoning": "Explanation of optimizations",
  "expectedImprovement": {
    "falsePositiveReduction": 0.3,
    "accuracyImprovement": 0.1,
    "performanceGain": 0.2
  }
}
    `.trim();
  }

  /**
   * Parse JSON response from LLM
   */
  private parseJSONResponse(response: string): any {
    try {
      // Extract JSON from response if it's wrapped in markdown
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       response.match(/(\{[\s\S]*\})/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      return JSON.parse(jsonString);
    } catch (error) {
      this.logger.error('Failed to parse JSON response', { 
        response: response.substring(0, 200),
        error: error.message 
      });
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Build DetectionRule from LLM response
   */
  private buildDetectionRule(ruleData: any, request: RuleGenerationRequest): DetectionRule {
    return {
      id: this.generateRuleId(),
      name: ruleData.name || 'Generated Rule',
      description: ruleData.description || 'AI-generated detection rule',
      version: '1.0.0',
      status: 'draft',
      category: this.mapTechniqueToCategory(ruleData.technique),
      technique: ruleData.technique || 'T0000',
      logic: {
        query: ruleData.logic?.query || '',
        conditions: ruleData.logic?.conditions || [],
        actions: [{ type: 'alert', parameters: {}, priority: 1 }],
        thresholds: ruleData.logic?.thresholds || [],
        exceptions: ruleData.logic?.exceptions || [],
      },
      metadata: {
        author: 'AI Agent',
        tags: ['ai-generated', request.threatType],
        mitreTechniques: ruleData.metadata?.mitreTechniques || [ruleData.technique],
        dataSources: ruleData.metadata?.dataSources || request.dataSources,
        confidence: ruleData.metadata?.confidence || 0.8,
        falsePositiveRate: ruleData.metadata?.falsePositiveRate || 0.1,
        lastTested: new Date(),
      },
      performance: {
        totalMatches: 0,
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        lastUpdated: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Build AIRecommendation from LLM response
   */
  private buildRecommendation(recData: any, request: RecommendationRequest): AIRecommendation {
    return {
      id: this.generateRecommendationId(),
      type: recData.type || 'new_rule',
      priority: recData.priority || 'medium',
      title: recData.title || 'AI Recommendation',
      description: recData.description || 'AI-generated recommendation',
      confidence: recData.confidence || 0.8,
      impact: {
        detectionImprovement: recData.impact?.detectionImprovement || 0.3,
        falsePositiveReduction: recData.impact?.falsePositiveReduction || 0.2,
        resourceImpact: recData.impact?.resourceImpact || 0.1,
        implementationEffort: recData.impact?.implementationEffort || 0.4,
        riskLevel: recData.impact?.riskLevel || 'medium',
      },
      actions: recData.actions || [],
      metadata: {
        source: 'AI Agent',
        reasoning: recData.reasoning || 'AI analysis',
        alternatives: recData.alternatives || [],
        dependencies: recData.dependencies || [],
        rollbackPlan: recData.rollbackPlan || 'Revert to previous configuration',
      },
      createdAt: new Date(),
    };
  }

  /**
   * Merge rule optimizations with existing rule
   */
  private mergeRuleOptimizations(rule: DetectionRule, optimizations: any): DetectionRule {
    return {
      ...rule,
      logic: {
        ...rule.logic,
        ...optimizations.optimizations,
      },
      metadata: {
        ...rule.metadata,
        confidence: Math.min(1.0, rule.metadata.confidence + 0.1),
        lastTested: new Date(),
      },
      updatedAt: new Date(),
    };
  }

  /**
   * Map MITRE technique to rule category
   */
  private mapTechniqueToCategory(technique: string): any {
    const techniqueMap: Record<string, any> = {
      'T1055': 'malware',
      'T1021': 'lateral_movement',
      'T1543': 'persistence',
      'T1055': 'privilege_escalation',
      'T1027': 'defense_evasion',
      'T1003': 'credential_access',
      'T1018': 'discovery',
      'T1005': 'collection',
      'T1071': 'command_and_control',
      'T1041': 'exfiltration',
      'T1485': 'impact',
    };
    
    return techniqueMap[technique] || 'malware';
  }

  /**
   * Generate unique rule ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate unique recommendation ID
   */
  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Shutdown the LLM service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down LLM Service');
    this.isInitialized = false;
  }
}
