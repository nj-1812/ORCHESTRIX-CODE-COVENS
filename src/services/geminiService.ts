import { GoogleGenAI, Type } from "@google/genai";
import { TrendDataContract } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const safeParseJson = (text: string | undefined, fallback: any = {}) => {
  if (!text) return fallback;
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error('JSON Parse Error. Length:', text.length, 'Error:', e);
    // If it's a truncation error, we might try to close the JSON, 
    // but for now let's just return a partial or empty object to prevent crash
    // and maybe try a simpler regex-based recovery if needed.
    
    // Attempt basic recovery for truncated JSON (very naive)
    if (text.includes('{')) {
      try {
        // Try to find the last complete object or just return what we can
        // This is tricky, so we'll just return fallback for now but log it well
        return fallback;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
};

export const orchestratorAgent = async (query: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the Orchestrix Central Orchestrator. Your job is to analyze the research query: "${query}" and determine the complexity and the required specialized agents.
    
    Return a JSON object with:
    1. complexity: "low" | "medium" | "high"
    2. agents: string[] (e.g. ["planner", "searcher", "writer", "citer"])
    3. initialStrategy: string (a brief overview of how to approach this research)`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          complexity: { type: Type.STRING },
          agents: { type: Type.ARRAY, items: { type: Type.STRING } },
          initialStrategy: { type: Type.STRING }
        },
        required: ["complexity", "agents", "initialStrategy"]
      }
    }
  });
  
  return safeParseJson(response.text, { complexity: 'medium', agents: [], initialStrategy: '' });
};

export const plannerAgent = async (query: string, strategy: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the Orchestrix Planner Agent. Based on the query: "${query}" and the strategy: "${strategy}", create a detailed research plan. Keep it concise but comprehensive.
    
    Return a JSON object with:
    1. phases: { title: string, tasks: string[] }[]
    2. estimatedTime: string`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          estimatedTime: { type: Type.STRING }
        }
      }
    }
  });
  
  return safeParseJson(response.text, { phases: [], estimatedTime: '' });
};

export const searcherAgent = async (query: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the Orchestrix Search Engine Agent. Find relevant sources and information for: "${query}". 
    Focus on high-quality academic and news sources. Do not return excessively long snippets.
    
    Return a JSON object with:
    1. sources: { title: string, snippet: string, url: string }[]
    2. keyFindings: string[]`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                snippet: { type: Type.STRING },
                url: { type: Type.STRING }
              }
            }
          },
          keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  
  return safeParseJson(response.text, { sources: [], keyFindings: [] });
};

export const writerAgent = async (query: string, findings: string[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the Orchestrix Outline & Template Generator. Based on the query: "${query}" and findings: ${JSON.stringify(findings).substring(0, 10000)}, generate a comprehensive research outline.
    If the findings are too long, focus on the most important ones.
    
    Return a JSON object with:
    1. title: string
    2. sections: { heading: string, content: string[] }[]`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                content: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    }
  });
  
  return safeParseJson(response.text, { title: query, sections: [] });
};

export const citerAgent = async (sources: any[], style: 'APA' | 'MLA' = 'APA') => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the Orchestrix Citation Generator. Format the following sources in ${style} style: ${JSON.stringify(sources).substring(0, 10000)}.
    
    Return a JSON object with:
    1. citations: string[]`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          citations: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  
  return safeParseJson(response.text, { citations: [] });
};

export const rankerAgent = async (query: string, results: any[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the Orchestrix Relevance Ranking Agent. 
    Analyze the following academic search results for the query: "${query}".
    
    For each result, provide:
    1. A relevance score (0-100).
    2. A brief explanation of why this result is relevant.
    3. A formatted citation in APA style.
    
    Results: ${JSON.stringify(results).substring(0, 15000)}
    
    Return a JSON object with:
    1. rankedResults: { id: string, score: number, relevanceExplanation: string, citation: string }[]`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rankedResults: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                score: { type: Type.NUMBER },
                relevanceExplanation: { type: Type.STRING },
                citation: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  
  return safeParseJson(response.text, { rankedResults: [] });
};

export const pdfSummarizerAgent = async (paperTitle: string, paperText: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following paper details and provide a structured summary.
    Title: ${paperTitle}
    Full Text/Abstract: ${paperText.substring(0, 30000)}
    
    Return the response in this exact format:
    - Abstract Compression: (1-2 sentences)
    - Key Contributions: (Bullet points)
    - Methodology: (Brief description)
    - Limitations: (Inferred or stated)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          abstract: { type: Type.STRING, description: "Abstract Compression (1-2 sentences)" },
          contributions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key Contributions (Bullet points)" },
          methodology: { type: Type.STRING, description: "Methodology (Brief description)" },
          limitations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Limitations (Inferred or stated)" },
          sentiment: { type: Type.STRING, description: "Overall sentiment of the findings (positive, negative, neutral, inconclusive)" }
        },
        required: ["abstract", "contributions", "methodology", "limitations", "sentiment"]
      }
    }
  });
  
  return safeParseJson(response.text, { abstract: '', contributions: [], methodology: '', limitations: [], sentiment: 'neutral' });
};

export const pdfCriticalAnalyzerAgent = async (paperTitle: string, paperText: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Perform a critical analysis of this paper: "${paperTitle}".
    Focus on the validity of the results, the strength of the evidence, and the overall tone.
    
    Paper Text: ${paperText.substring(0, 30000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          criticalReview: { type: Type.STRING },
          evidenceStrength: { type: Type.STRING, description: "weak, moderate, strong" },
          sentiment: { type: Type.STRING, description: "positive, negative, neutral, inconclusive" }
        },
        required: ["criticalReview", "evidenceStrength", "sentiment"]
      }
    }
  });
  
  return safeParseJson(response.text, { criticalReview: '', evidenceStrength: 'moderate', sentiment: 'neutral' });
};

/**
 * Conflict Resolution Orchestrator
 * Compares outputs from Summarizer and Critical Analyzer.
 */
export const conflictResolutionOrchestrator = async (paperTitle: string, paperText: string) => {
  const [summary, analysis] = await Promise.all([
    pdfSummarizerAgent(paperTitle, paperText),
    pdfCriticalAnalyzerAgent(paperTitle, paperText)
  ]);

  const hasConflict = summary.sentiment !== analysis.sentiment;

  if (hasConflict) {
    return {
      status: "CONFLICT_DETECTED",
      message: "The Summarization and Analysis agents have provided diverging views.",
      details: {
        summarizer_view: summary,
        analyzer_view: analysis
      },
      action_required: "Please review the raw data or provide additional constraints."
    };
  }

  return {
    status: "SUCCESS",
    data: summary,
    analysis: analysis
  };
};

export const conflictResolutionAgent = async (summaryA: string, summaryB: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Compare these two analyses of the same paper set. 
    Identify any direct contradictions (e.g., Agent A says 'positive results', Agent B says 'inconclusive').
    
    Analysis A: ${summaryA}
    Analysis B: ${summaryB}
    
    Return a JSON object with:
    1. hasConflict: boolean
    2. conflicts: string[] (list of specific contradictions)
    3. unifiedView: string (a synthesis that acknowledges the different interpretations)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasConflict: { type: Type.BOOLEAN },
          conflicts: { type: Type.ARRAY, items: { type: Type.STRING } },
          unifiedView: { type: Type.STRING }
        },
        required: ["hasConflict", "conflicts", "unifiedView"]
      }
    }
  });
  
  return safeParseJson(response.text, { hasConflict: false, conflicts: [], unifiedView: '' });
};

export const crossPaperSynthesisAgent = async (summaries: { title: string, analysis: any }[]) => {
  const combinedSummaries = summaries.map(s => `Paper: ${s.title}\nAbstract/Analysis: ${JSON.stringify(s.analysis)}`).join('\n\n');
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Review these research papers:
    ${combinedSummaries}
    
    Provide a high-level synthesis paragraph that identifies:
    1. Common themes across the papers.
    2. Direct contradictions or differing results.
    3. Clear research gaps that remain unaddressed.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          commonThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
          contradictions: { type: Type.ARRAY, items: { type: Type.STRING } },
          researchGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          synthesisParagraph: { type: Type.STRING }
        },
        required: ["commonThemes", "contradictions", "researchGaps", "synthesisParagraph"]
      }
    }
  });
  
  return safeParseJson(response.text, { commonThemes: [], contradictions: [], researchGaps: [], synthesisParagraph: '' });
};

export const researchAssistantAgent = async (query: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Research query: "${query}"`,
    config: {
      systemInstruction: `You are a research assistant. When given a research query, respond ONLY with a valid JSON object in this exact shape:
{
  "papers": [
    {
      "title": "...",
      "authors": "Author A, Author B",
      "year": 2023,
      "summary": "2-3 sentence summary of this paper's contribution",
      "tags": ["tag1","tag2","tag3"]
    }
  ],
  "analysis": "A 3-5 sentence synthesised analysis of the research landscape for this query, highlighting trends, gaps, and key findings across the papers."
}
Generate 4-6 realistic, relevant papers for the query. Tags should be short keyword phrases.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          papers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                authors: { type: Type.STRING },
                year: { type: Type.NUMBER },
                summary: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          analysis: { type: Type.STRING }
        }
      }
    }
  });

  return safeParseJson(response.text, { papers: [], analysis: '' });
};

export const universalSummarizerAgent = async (source: string, isUrl: boolean = false) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: isUrl 
      ? `Please provide a comprehensive synthesis of the content at this URL: ${source}. Focus on key findings, methodology, and conclusions.`
      : `Please provide a comprehensive synthesis of the following text: ${source.substring(0, 50000)}. Focus on key findings, methodology, and conclusions.`,
    config: {
      tools: isUrl ? [{ urlContext: {} }] : [],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          synthesis: { type: Type.STRING },
          conclusions: { type: Type.STRING },
          metadata: {
            type: Type.OBJECT,
            properties: {
              sourceType: { type: Type.STRING },
              estimatedReadTime: { type: Type.STRING }
            }
          }
        },
        required: ["summary", "keyPoints", "synthesis", "conclusions"]
      }
    }
  });

  return safeParseJson(response.text, { summary: '', keyPoints: [], synthesis: '', conclusions: '' });
};

export const assistantAgent = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: "You are the Orchestrix Personal Assistant. You help users navigate the platform and provide guidance on their research. Be professional, helpful, and concise."
    }
  });
  
  return response.text;
};

/**
 * Autocorrect Agent
 * Fixes grammar, spelling, and tone of research notes.
 */
export async function autocorrectAgent(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      You are a research assistant. 
      Autocorrect and improve the following text for clarity, grammar, and academic tone. 
      Preserve the core meaning and any technical terms.
      
      Text to improve:
      "${text}"
      
      Return ONLY the improved text.
    `,
  });

  return response.text?.trim() || text;
}

export const analysisAgent = async (papers: any[]): Promise<TrendDataContract> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the Orchestrix Analysis Agent. Synthesize the following research papers into a structured trend report.
    
    Papers: ${JSON.stringify(papers).substring(0, 20000)}
    
    Return a JSON object that strictly follows the TrendDataContract.`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metadata: {
            type: Type.OBJECT,
            properties: {
              timestamp: { type: Type.STRING },
              version: { type: Type.STRING }
            },
            required: ["timestamp", "version"]
          },
          analysis_payload: {
            type: Type.OBJECT,
            properties: {
              key_trends: { type: Type.ARRAY, items: { type: Type.STRING } },
              citation_matrix: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    year: { type: Type.NUMBER },
                    citations: { type: Type.NUMBER }
                  },
                  required: ["title", "year", "citations"]
                }
              },
              unresolved_questions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["key_trends", "citation_matrix", "unresolved_questions"]
          }
        },
        required: ["metadata", "analysis_payload"]
      }
    }
  });

  return safeParseJson(response.text, {
    metadata: { timestamp: new Date().toISOString(), version: "2.0-Phase2" },
    analysis_payload: { key_trends: [], citation_matrix: [], unresolved_questions: [] }
  });
};

export const roadmapAgent = async (query: string, trendData?: TrendDataContract, userNotes: string = ""): Promise<any> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `System: You are the Roadmap Agent for Orchestrix.
    Input Data (Trend Contract): ${JSON.stringify(trendData || {})}
    User Original Goal: ${query}
    User Notes: ${userNotes || "None"}

    Task: Produce a Research Roadmap with 3 specific sections.
    Crucial Instruction: For each 'branch' or 'step' in the roadmap (specifically in the Next Query Suggestions), explicitly name which Agent (Discovery, Analysis, or Roadmap) the user should use to complete that step.

    Structure:
    1. Foundational Papers: (Ranked by citations/year from the contract).
    2. Gap Areas: (Questions that are currently unanswered).
    3. Next Query Suggestions: (Actionable search queries). 
       - Format: [Query] -> "Trigger [Agent Name]"
    
    Return a JSON object that strictly follows the ResearchRoadmap contract.`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          agent: { type: Type.STRING, enum: ["roadmap"] },
          input_contract_verified: { type: Type.BOOLEAN },
          received_trend_report: { type: Type.BOOLEAN },
          roadmap: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              generated_for_query: { type: Type.STRING },
              section_1_foundational_papers: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  papers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        rank: { type: Type.NUMBER },
                        paper_id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        year: { type: Type.NUMBER },
                        citation_count: { type: Type.NUMBER },
                        why_foundational: { type: Type.STRING },
                        read_before: { type: Type.ARRAY, items: { type: Type.STRING } },
                        estimated_read_time_hours: { type: Type.NUMBER }
                      },
                      required: ["rank", "paper_id", "title", "year", "citation_count", "why_foundational", "read_before", "estimated_read_time_hours"]
                    }
                  }
                },
                required: ["description", "papers"]
              },
              section_2_gap_areas: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  gaps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        gap_id: { type: Type.STRING },
                        gap_title: { type: Type.STRING },
                        gap_description: { type: Type.STRING },
                        evidence_from_papers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        evidence_from_trend: { type: Type.STRING },
                        potential_contribution_type: { type: Type.STRING, enum: ["empirical", "theoretical", "methodological", "survey"] },
                        difficulty: { type: Type.STRING, enum: ["high", "medium", "low"] },
                        opportunity_score: { type: Type.NUMBER }
                      },
                      required: ["gap_id", "gap_title", "gap_description", "evidence_from_papers", "evidence_from_trend", "potential_contribution_type", "difficulty", "opportunity_score"]
                    }
                  }
                },
                required: ["description", "gaps"]
              },
              section_3_next_query_suggestions: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  queries: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        query_id: { type: Type.STRING },
                        query_text: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                        targets_gap_id: { type: Type.STRING },
                        trigger_agent: { type: Type.STRING, enum: ["Discovery", "Analysis", "Roadmap"] },
                        expected_paper_types: { type: Type.ARRAY, items: { type: Type.STRING, enum: ["survey", "empirical", "benchmark", "theoretical"] } },
                        priority: { type: Type.STRING, enum: ["high", "medium", "low"] }
                      },
                      required: ["query_id", "query_text", "rationale", "targets_gap_id", "trigger_agent", "expected_paper_types", "priority"]
                    }
                  }
                },
                required: ["description", "queries"]
              }
            },
            required: ["title", "generated_for_query", "section_1_foundational_papers", "section_2_gap_areas", "section_3_next_query_suggestions"]
          },
          timestamp: { type: Type.STRING }
        },
        required: ["agent", "input_contract_verified", "received_trend_report", "roadmap", "timestamp"]
      }
    }
  });

  return safeParseJson(response.text, { 
    agent: "roadmap", 
    input_contract_verified: true, 
    received_trend_report: !!trendData,
    roadmap: {
      title: "Research Roadmap",
      generated_for_query: query,
      section_1_foundational_papers: { description: "", papers: [] },
      section_2_gap_areas: { description: "", gaps: [] },
      section_3_next_query_suggestions: { description: "", queries: [] }
    },
    timestamp: new Date().toISOString()
  });
};
