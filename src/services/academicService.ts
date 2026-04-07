import { AcademicResult } from '../types';

export async function searchAcademicPapers(query: string, offset: number = 0, limit: number = 10): Promise<{ results: any[], total: number }> {
  const fields = 'title,authors,year,abstract,url,citationCount,venue,publicationDate';
  const url = `/api/academic/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&fields=${fields}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Semantic Scholar API error: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      results: data.data || [],
      total: data.total || 0
    };
  } catch (error) {
    console.error('Academic Search Error:', error);
    return { results: [], total: 0 };
  }
}
