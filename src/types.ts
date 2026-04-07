export type AgentType = 'orchestrator' | 'planner' | 'searcher' | 'writer' | 'citer' | 'assistant';

export interface AgentStatus {
  type: AgentType;
  name: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  progress: number;
  message?: string;
}

export interface AcademicResult {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  url: string | null;
  citation: string;
  score: number;
  relevanceExplanation: string;
}

export interface ChatMessage {
  id: number;
  role: string;
  text: string;
  timestamp: string;
}

export interface Snapshot {
  id: number;
  version: number;
  query: string;
  result_count: number;
  top_result: string;
  timestamp: string;
}

export interface ResearchProject {
  id: string;
  userId: string;
  name: string;
  query: string;
  status: 'planning' | 'searching' | 'writing' | 'completed';
  progress: number;
  version: number;
  outline?: string;
  citations?: string[];
  academicResults?: AcademicResult[];
  chatMessages?: ChatMessage[];
  snapshots?: Snapshot[];
  content?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface TrendDataContract {
  metadata: {
    timestamp: string;
    version: string;
  };
  analysis_payload: {
    key_trends: string[];
    citation_matrix: {
      title: string;
      year: number;
      citations: number;
    }[];
    unresolved_questions: string[];
  };
}

export interface ResearchRoadmap {
  agent: "roadmap";
  input_contract_verified: boolean;
  received_trend_report: boolean;
  roadmap: {
    title: string;
    generated_for_query: string;
    section_1_foundational_papers: {
      description: string;
      papers: {
        rank: number;
        paper_id: string;
        title: string;
        year: number;
        citation_count: number;
        why_foundational: string;
        read_before: string[];
        estimated_read_time_hours: number;
      }[];
    };
    section_2_gap_areas: {
      description: string;
      gaps: {
        gap_id: string;
        gap_title: string;
        gap_description: string;
        evidence_from_papers: string[];
        evidence_from_trend: string;
        potential_contribution_type: "empirical" | "theoretical" | "methodological" | "survey";
        difficulty: "high" | "medium" | "low";
        opportunity_score: number;
      }[];
    };
    section_3_next_query_suggestions: {
      description: string;
      queries: {
        query_id: string;
        query_text: string;
        rationale: string;
        targets_gap_id: string;
        trigger_agent: "Discovery" | "Analysis" | "Roadmap";
        expected_paper_types: ("survey" | "empirical" | "benchmark" | "theoretical")[];
        priority: "high" | "medium" | "low";
      }[];
    };
  };
  timestamp: string;
}

export interface Paper {
  source: string;
  title: string;
  authors: string;
  year: number | null;
  abstract: string;
  citationCount: number | null;
  url: string | null;
  doi: string | null;
  score?: number;
  relevanceScore?: number;
}
