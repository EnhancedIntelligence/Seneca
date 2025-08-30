import { NextRequest } from "next/server";
import { z } from "zod";
import {
  withApiHandler,
  authenticateRequest,
  verifyFamilyAccess,
  validateQueryParams,
  createSuccessResponse,
  createPaginatedResponse,
} from "@/lib/api-utils";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { aiConfig } from "@/lib/env";
import { ExternalAPIError } from "@/lib/errors";
import { callRPCWithFallback } from "@/lib/database-compatibility";

// Search request validation schema
const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  familyId: z.string().uuid(),
  similarity_threshold: z.coerce.number().min(0).max(1).default(0.8),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  category: z.string().optional(),
  child_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  include_ai_analysis: z.coerce.boolean().default(true),
});

type SearchQuery = z.infer<typeof searchQuerySchema>;

/**
 * Semantic Search API for Family Memories
 * Provides natural language search capabilities using vector embeddings
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  // Authenticate user
  const user = await authenticateRequest(request);

  // Validate query parameters
  const params = validateQueryParams(request, searchQuerySchema);

  // Verify family access
  await verifyFamilyAccess(user.id, params.familyId);

  // Perform semantic search
  const results = await performSemanticSearch(params);

  return createSuccessResponse({
    results: results.memories,
    query: params.query,
    total_results: results.total_count,
    similarity_threshold: params.similarity_threshold,
    search_metadata: {
      execution_time_ms: results.execution_time,
      embeddings_searched: results.embeddings_searched,
      query_embedding_generated: results.query_embedding_generated,
    },
  });
});

async function performSemanticSearch(params: SearchQuery): Promise<{
  memories: any[];
  total_count: number;
  execution_time: number;
  embeddings_searched: number;
  query_embedding_generated: boolean;
}> {
  const startTime = Date.now();
  const adminClient = createAdminClient();

  try {
    // Generate embedding for search query
    const queryEmbedding = await generateQueryEmbedding(params.query);

    // Use compatibility layer for semantic search
    const searchResults = await callRPCWithFallback(
      "search_memories_semantic",
      {
        query_text: params.query,
        query_embedding: queryEmbedding,
        family_id: params.familyId,
        similarity_threshold: params.similarity_threshold,
        result_limit: params.limit,
        result_offset: params.offset,
        category_filter: params.category,
        child_id_filter: params.child_id,
        date_from_filter: params.date_from,
        date_to_filter: params.date_to,
        include_ai_analysis: params.include_ai_analysis,
      },
    );

    const memories = searchResults || [];

    // Get total count for pagination using compatibility layer
    const countResult = await callRPCWithFallback(
      "count_semantic_search_results",
      {
        query_text: params.query,
        query_embedding: queryEmbedding,
        family_id: params.familyId,
        similarity_threshold: params.similarity_threshold,
        category_filter: params.category,
        child_id_filter: params.child_id,
        date_from_filter: params.date_from,
        date_to_filter: params.date_to,
      },
    );

    const totalCount =
      Array.isArray(countResult) && countResult.length > 0
        ? countResult[0]?.count || 0
        : memories.length;

    return {
      memories,
      total_count: totalCount,
      execution_time: Date.now() - startTime,
      embeddings_searched: memories.length,
      query_embedding_generated: true,
    };
  } catch (error) {
    console.error("Semantic search error:", error);
    throw error;
  }
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!aiConfig.openaiApiKey) {
    // Return dummy embedding for development
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.embeddingModel,
        input: query,
      }),
    });

    if (!response.ok) {
      throw new ExternalAPIError(
        "OpenAI Embeddings",
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  } catch (error) {
    console.error("Query embedding generation failed:", error);
    throw error;
  }
}
