import { createAdminClient } from './server-only/admin-client'
import { MemoryEntry, Child, Family } from './database'
import { aiConfig } from './env'
import { 
  ProcessingError, 
  ExternalAPIError, 
  handleError 
} from './errors'
import { StatusCompat, mapProcessingAnalyticsFields } from './database-compatibility'

interface AIProcessingResult {
  milestoneDetected: boolean
  category?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  tags?: string[]
  summary?: string
  ageAtMemory?: number
  confidenceScore?: number
  processingCost?: number
  processingTime?: number
  embedding?: number[]
  insights?: string[]
  emotions?: string[]
  developmentalStage?: string
}

interface MemoryAnalysisContext {
  memory: MemoryEntry
  child?: Child
  family?: Family
  processingStartTime: number
}

class AIProcessor {
  private adminClient = createAdminClient()
  private openaiApiKey: string
  private model: string
  private embeddingModel: string

  constructor() {
    this.openaiApiKey = aiConfig.openaiApiKey
    this.model = aiConfig.model
    this.embeddingModel = aiConfig.embeddingModel
    
    if (!this.openaiApiKey) {
      console.warn('OpenAI API key not configured - AI processing will be simulated')
    }
  }

  async processMemory(memoryId: string): Promise<void> {
    const processingStartTime = Date.now()
    
    try {
      // Fetch memory with full context
      const context = await this.getMemoryContext(memoryId)
      
      // Update status to processing
      await this.updateMemoryStatus(memoryId, 'processing')

      // Process with AI
      const result = await this.analyzeMemoryContent(context)

      // Generate embedding for semantic search
      const embedding = await this.generateEmbedding(context.memory.content)
      
      // Update memory with comprehensive results
      await this.updateMemoryWithResults(memoryId, {
        ...result,
        embedding,
        processingTime: Date.now() - processingStartTime
      })

      // Update status to completed
      await this.updateMemoryStatus(memoryId, 'completed')

      // Log processing analytics
      await this.logProcessingAnalytics(memoryId, result, processingStartTime)

      console.log(`Successfully processed memory ${memoryId} in ${Date.now() - processingStartTime}ms`)

    } catch (error) {
      console.error(`Failed to process memory ${memoryId}:`, error)
      
      // Update status to failed
      await this.updateMemoryStatus(memoryId, 'failed')
      
      // Log failure analytics
      await this.logProcessingFailure(memoryId, error, processingStartTime)
      
      throw handleError(error, { memoryId, processingTime: Date.now() - processingStartTime })
    }
  }

  private async getMemoryContext(memoryId: string): Promise<MemoryAnalysisContext> {
    const { data: memory, error } = await this.adminClient
      .from('memory_entries')
      .select(`
        *,
        children (
          id,
          name,
          birth_date,
          gender,
          notes
        ),
        families (
          id,
          name,
          description
        )
      `)
      .eq('id', memoryId)
      .single()

    if (error || !memory) {
      throw new ProcessingError(`Memory not found: ${memoryId}`, { memoryId, error })
    }

    return {
      memory,
      child: (memory as any).children as Child | undefined,
      family: (memory as any).families as Family | undefined,
      processingStartTime: Date.now()
    }
  }

  private async analyzeMemoryContent(context: MemoryAnalysisContext): Promise<AIProcessingResult> {
    if (!this.openaiApiKey) {
      return this.simulateAIProcessing(context)
    }

    try {
      const prompt = this.buildAdvancedAnalysisPrompt(context)
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are Seneca, an advanced AI family companion specializing in child development and family memory analysis. You analyze family memories with deep psychological insight, developmental understanding, and emotional intelligence. 

Your analysis should provide:
1. Developmental milestone detection with confidence scores
2. Emotional analysis and sentiment patterns
3. Family dynamics and relationships insights
4. Personalized recommendations for family growth
5. Age-appropriate developmental context
6. Long-term pattern recognition

Return your analysis as valid JSON only, no additional text.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new ExternalAPIError(
          'OpenAI',
          `API request failed: ${response.status} ${response.statusText}`,
          { status: response.status, statusText: response.statusText }
        )
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new ExternalAPIError('OpenAI', 'No content returned from API')
      }

      // Calculate processing cost (approximate)
      const processingCost = this.calculateProcessingCost(
        data.usage?.prompt_tokens || 0,
        data.usage?.completion_tokens || 0
      )

      // Parse the structured response
      const result = this.parseAIResponse(content)
      
      return {
        ...result,
        processingCost,
        confidenceScore: this.calculateConfidenceScore(result)
      }

    } catch (error) {
      console.error('AI processing failed, falling back to simulation:', error)
      
      if (error instanceof ExternalAPIError) {
        throw error
      }
      
      return this.simulateAIProcessing(context)
    }
  }

  private buildAdvancedAnalysisPrompt(context: MemoryAnalysisContext): string {
    const { memory, child, family } = context
    
    const childInfo = child ? {
      name: child.name,
      birthDate: child.birth_date,
      gender: child.gender,
      notes: child.notes,
      ageInMonths: child.birth_date ? this.calculateAgeInMonths(child.birth_date) : null
    } : null

    const familyInfo = family ? {
      name: family.name,
      description: family.description
    } : null

    return `
Analyze this family memory with advanced psychological and developmental insight:

**Family Context:**
${familyInfo ? `
- Family: ${familyInfo.name}
- Description: ${familyInfo.description || 'No description'}
` : '- No family context available'}

**Child Context:**
${childInfo ? `
- Name: ${childInfo.name}
- Age: ${childInfo.ageInMonths ? `${childInfo.ageInMonths} months` : 'Unknown'}
- Gender: ${childInfo.gender || 'Not specified'}
- Notes: ${childInfo.notes || 'No additional notes'}
` : '- No specific child associated'}

**Memory Details:**
- Content: "${memory.content}"
- Title: "${memory.title || 'No title'}"
- Date: ${memory.memory_date || memory.created_at}
- Location: ${memory.location_name || 'Not specified'}
        - Existing Tags: ${memory.tags?.join(', ') || 'None'}

**Current Analysis Request:**
Please provide a comprehensive analysis as a JSON object with these fields:

{
  "milestoneDetected": boolean,
  "category": string, // (first_steps, first_words, birthday, holiday, achievement, daily_life, emotional_growth, social_interaction, cognitive_development, physical_development, creative_expression, etc.)
  "sentiment": "positive" | "neutral" | "negative",
  "tags": string[], // relevant keywords/tags
  "summary": string, // brief 1-2 sentence summary
  "ageAtMemory": number | null, // age in months if calculable
  "insights": string[], // 3-5 developmental/psychological insights
  "emotions": string[], // detected emotions in the memory
  "developmentalStage": string, // appropriate developmental stage description
  "recommendations": string[] // 2-3 personalized recommendations for family
}

Focus on:
1. Developmental appropriateness and milestones
2. Emotional patterns and family dynamics
3. Long-term implications for child development
4. Practical recommendations for parents
5. Cultural and contextual sensitivity

Return only valid JSON, no additional text.
`
  }

  private calculateAgeInMonths(birthDate: string): number | null {
    try {
      const birth = new Date(birthDate)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - birth.getTime())
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)) // Average days per month
      return diffMonths
    } catch (error) {
      return null
    }
  }

  private calculateProcessingCost(promptTokens: number, completionTokens: number): number {
    // GPT-4 pricing (approximate as of 2024)
    const promptCostPer1k = 0.03 // $0.03 per 1K tokens
    const completionCostPer1k = 0.06 // $0.06 per 1K tokens
    
    const promptCost = (promptTokens / 1000) * promptCostPer1k
    const completionCost = (completionTokens / 1000) * completionCostPer1k
    
    return Math.round((promptCost + completionCost) * 10000) / 10000 // Round to 4 decimal places
  }

  private calculateConfidenceScore(result: AIProcessingResult): number {
    // Simple confidence scoring based on completeness of analysis
    let score = 0.5 // Base score
    
    if (result.milestoneDetected) score += 0.1
    if (result.category) score += 0.1
    if (result.sentiment) score += 0.1
    if (result.tags && result.tags.length > 0) score += 0.1
    if (result.summary) score += 0.1
    if (result.insights && result.insights.length > 0) score += 0.1
    
    return Math.min(1.0, score)
  }

  private parseAIResponse(content: string): AIProcessingResult {
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content]

      const jsonString = jsonMatch[1] || content
      return JSON.parse(jsonString.trim())
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      // Return basic analysis if parsing fails
      return {
        milestoneDetected: false,
        category: 'daily_life',
        sentiment: 'positive',
        tags: ['memory'],
        summary: 'A family memory'
      }
    }
  }

  private async generateEmbedding(content: string): Promise<number[]> {
    if (!this.openaiApiKey) {
      // Return a dummy embedding for development
      return new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: content,
        }),
      })

      if (!response.ok) {
        throw new ExternalAPIError(
          'OpenAI Embeddings',
          `API request failed: ${response.status} ${response.statusText}`,
          { status: response.status, statusText: response.statusText }
        )
      }

      const data = await response.json()
      return data.data[0]?.embedding || []

    } catch (error) {
      console.error('Embedding generation failed:', error)
      // Return a dummy embedding on failure
      return new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
    }
  }

  private async logProcessingAnalytics(
    memoryId: string,
    result: AIProcessingResult,
    startTime: number
  ): Promise<void> {
    try {
      const processingTime = Date.now() - startTime
      
      await this.adminClient
        .from('processing_analytics')
        .insert({
          memory_id: memoryId,
          stage: 'ai_analysis',
          status: 'completed',
          duration_ms: processingTime,
          tokens_used: result.processingCost ? Math.round(result.processingCost * 33333) : null, // Rough estimate
          model_version: this.model,
          error_message: null,
          metadata: {
            success: true,
            milestone_detected: result.milestoneDetected,
            confidence_score: result.confidenceScore,
            cost_usd: result.processingCost
          },
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log processing analytics:', error)
      // Don't throw - analytics failure shouldn't break processing
    }
  }

  private async logProcessingFailure(
    memoryId: string,
    error: any,
    startTime: number
  ): Promise<void> {
    try {
      const processingTime = Date.now() - startTime
      
      await this.adminClient
        .from('processing_analytics')
        .insert({
          memory_id: memoryId,
          stage: 'ai_analysis',
          status: 'failed',
          duration_ms: processingTime,
          tokens_used: null,
          model_version: this.model,
          error_message: error instanceof Error ? error.message : String(error),
          metadata: {
            success: false,
            milestone_detected: false,
            confidence_score: null,
            cost_usd: null
          },
          created_at: new Date().toISOString()
        })
    } catch (analyticsError) {
      console.error('Failed to log processing failure:', analyticsError)
    }
  }

  private simulateAIProcessing(context: MemoryAnalysisContext): AIProcessingResult {
    // Enhanced simulation for development/testing
    const content = context.memory.content.toLowerCase()
    
    const milestoneKeywords = [
      'first', 'walked', 'talking', 'birthday', 'tooth', 'crawling', 
      'potty', 'school', 'graduation', 'learned', 'smile', 'laugh'
    ]
    
    const milestoneDetected = milestoneKeywords.some(keyword => 
      content.includes(keyword)
    )

    let category = 'daily_life'
    if (content.includes('birthday')) category = 'birthday'
    else if (content.includes('holiday') || content.includes('christmas') || content.includes('halloween')) category = 'holiday'
    else if (content.includes('first') || content.includes('learned')) category = 'achievement'
    else if (content.includes('school')) category = 'education'
    else if (content.includes('play')) category = 'social_interaction'
    else if (content.includes('creative') || content.includes('draw')) category = 'creative_expression'

    const positiveWords = ['happy', 'joy', 'love', 'amazing', 'wonderful', 'excited', 'proud', 'smile']
    const negativeWords = ['sad', 'cry', 'upset', 'difficult', 'hard', 'frustrated']
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
    if (positiveWords.some(word => content.includes(word))) sentiment = 'positive'
    else if (negativeWords.some(word => content.includes(word))) sentiment = 'negative'

    return {
      milestoneDetected,
      category,
      sentiment,
      tags: [category, sentiment, 'simulated'],
      summary: `A ${sentiment} family memory about ${category.replace('_', ' ')}`,
      ageAtMemory: context.child?.birth_date ? this.calculateAgeInMonths(context.child.birth_date) ?? undefined : undefined,
      confidenceScore: 0.7, // Moderate confidence for simulation
      processingCost: 0.001, // Minimal cost for simulation
      insights: [
        'This memory shows typical developmental patterns',
        'Family bonding activities are important for child development',
        'Documenting these moments helps track progress'
      ],
      emotions: sentiment === 'positive' ? ['joy', 'happiness'] : sentiment === 'negative' ? ['frustration', 'sadness'] : ['calm', 'neutral'],
      developmentalStage: context.child ? 'Age-appropriate development' : 'General family bonding'
    }
  }

  private async updateMemoryStatus(
    memoryId: string, 
    status: 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    const { error } = await this.adminClient
      .from('memory_entries')
      .update({ processing_status: status })
      .eq('id', memoryId)

    if (error) {
      console.error(`Failed to update memory status to ${status}:`, error)
      throw error
    }
  }

  private async updateMemoryWithResults(
    memoryId: string, 
    result: AIProcessingResult
  ): Promise<void> {
    const updateData: any = {
      milestone_detected: result.milestoneDetected,
      category: result.category,
      sentiment_score: this.mapSentimentToScore(result.sentiment),
      confidence_score: result.confidenceScore,
      processing_cost: result.processingCost,
      ai_analysis: {
        summary: result.summary,
        insights: result.insights,
        emotions: result.emotions,
        developmentalStage: result.developmentalStage,
        ageAtMemory: result.ageAtMemory,
        processingTime: result.processingTime,
        model: this.model,
        timestamp: new Date().toISOString()
      },
      processed_at: new Date().toISOString()
    }

    // Update tags if provided
    if (result.tags && result.tags.length > 0) {
      updateData.tags = result.tags
    }

    // Store embedding for semantic search
    if (result.embedding && result.embedding.length > 0) {
      updateData.embedding = result.embedding
    }

    const { error } = await this.adminClient
      .from('memory_entries')
      .update(updateData)
      .eq('id', memoryId)

    if (error) {
      console.error('Failed to update memory with AI results:', error)
      throw new ProcessingError('Failed to update memory with AI results', { 
        memoryId, 
        error: error.message 
      })
    }
  }

  private mapSentimentToScore(sentiment?: 'positive' | 'neutral' | 'negative'): number {
    switch (sentiment) {
      case 'positive': return 1.0
      case 'negative': return -1.0
      case 'neutral':
      default: return 0.0
    }
  }

  async batchProcessMemories(limit: number = 10): Promise<number> {
    const { data: pendingMemories, error } = await this.adminClient
      .from('memory_entries')
      .select('id')
      .eq('processing_status', StatusCompat.toNew('pending'))
      .limit(limit)

    if (error) {
      console.error('Failed to fetch pending memories:', error)
      return 0
    }

    if (!pendingMemories || pendingMemories.length === 0) {
      return 0
    }

    let processedCount = 0
    for (const memory of pendingMemories) {
      try {
        await this.processMemory(memory.id)
        processedCount++
      } catch (error) {
        console.error(`Failed to process memory ${memory.id}:`, error)
        // Continue with next memory
      }
    }

    return processedCount
  }
}

export const aiProcessor = new AIProcessor()

export async function processMemoryWithAI(memoryId: string): Promise<void> {
  return aiProcessor.processMemory(memoryId)
}

export async function batchProcessMemories(limit?: number): Promise<number> {
  return aiProcessor.batchProcessMemories(limit)
}