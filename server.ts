import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import Database from "better-sqlite3";

import { XMLParser } from "fast-xml-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DATABASE INITIALIZATION ---
const db = new Database("research_vault.db");
db.pragma("foreign_keys = ON");

// Simple in-memory cache for academic searches
const academicCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 100;

// Helper for fetching with retries (useful for rate-limited APIs)
async function fetchWithRetry(url: string, options: any = {}, retries = 7, backoff = 3000) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429 && i < retries - 1) {
      // Check for Retry-After header (Semantic Scholar sometimes provides this)
      const retryAfter = response.headers.get("Retry-After");
      let wait = 0;
      
      if (retryAfter) {
        // Retry-After can be in seconds or a full date string
        wait = isNaN(Number(retryAfter)) 
          ? (new Date(retryAfter).getTime() - Date.now()) 
          : Number(retryAfter) * 1000;
      }
      
      // Fallback to exponential backoff if header is missing or invalid
      if (!wait || wait <= 0) {
        wait = (backoff * Math.pow(2, i)) + (Math.random() * 1000);
      }

      console.log(`[RETRY] Rate limited (429). Attempt ${i + 1}/${retries}. Waiting ${Math.round(wait)}ms...`);
      await new Promise(resolve => setTimeout(resolve, wait));
      continue;
    }
    return response;
  }
  return fetch(url, options);
}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    synthesis TEXT,
    version REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    title TEXT,
    abstract TEXT,
    summary TEXT,
    analysis TEXT,
    user_notes TEXT DEFAULT '',
    url TEXT,
    tags TEXT DEFAULT '[]',
    query_id INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    version REAL NOT NULL,
    query TEXT,
    result_count INTEGER,
    top_result TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_id INTEGER,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (query_id) REFERENCES queries (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    query TEXT,
    interval_hours INTEGER,
    last_run DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    color TEXT DEFAULT '#7c5cfc',
    tags TEXT DEFAULT '[]',
    linked_paper_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (linked_paper_id) REFERENCES papers (id) ON DELETE SET NULL
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- FEATURE: SESSION MANAGEMENT ---
  app.get("/api/sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM sessions ORDER BY created_at DESC").all();
    res.json(sessions);
  });

  app.post("/api/sessions", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Session name required" });

    try {
      const existing = db.prepare("SELECT * FROM sessions WHERE name = ?").get(name);
      if (existing) return res.json(existing);

      const result = db.prepare("INSERT INTO sessions (name) VALUES (?)").run(name);
      res.json({ id: result.lastInsertRowid, name, created_at: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions/:id", (req, res) => {
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const papers = db.prepare("SELECT * FROM papers WHERE session_id = ?").all(req.params.id);
    const queries = db.prepare("SELECT * FROM queries WHERE session_id = ?").all(req.params.id);
    const chatMessages = db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC").all(req.params.id);
    const snapshots = db.prepare("SELECT * FROM snapshots WHERE session_id = ? ORDER BY timestamp DESC").all(req.params.id);
    const analyses = db.prepare(`
      SELECT a.* FROM analyses a
      JOIN queries q ON a.query_id = q.id
      WHERE q.session_id = ?
    `).all(req.params.id);

    res.json({ 
      ...session, 
      papers: papers.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') })), 
      queries, 
      chatMessages,
      snapshots,
      analyses 
    });
  });

  app.post("/api/sessions/:id/queries", (req, res) => {
    const { text } = req.body;
    const sessionId = req.params.id;
    try {
      const result = db.prepare("INSERT INTO queries (session_id, text) VALUES (?, ?)").run(sessionId, text);
      res.json({ id: result.lastInsertRowid, text });
    } catch (err) {
      res.status(500).json({ error: "Failed to add query" });
    }
  });

  app.post("/api/sessions/:id/chat", (req, res) => {
    const { role, text } = req.body;
    const sessionId = req.params.id;
    try {
      const result = db.prepare("INSERT INTO chat_messages (session_id, role, text) VALUES (?, ?, ?)").run(sessionId, role, text);
      res.json({ id: result.lastInsertRowid, role, text, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: "Failed to add chat message" });
    }
  });

  app.post("/api/sessions/:id/snapshots", (req, res) => {
    const { version, query, result_count, top_result } = req.body;
    const sessionId = req.params.id;
    try {
      const result = db.prepare(`
        INSERT INTO snapshots (session_id, version, query, result_count, top_result)
        VALUES (?, ?, ?, ?, ?)
      `).run(sessionId, version, query, result_count, top_result);
      res.json({ id: result.lastInsertRowid, version, query, result_count, top_result });
    } catch (err) {
      res.status(500).json({ error: "Failed to create snapshot" });
    }
  });

  app.patch("/api/sessions/:id/version", (req, res) => {
    const { version } = req.body;
    try {
      db.prepare("UPDATE sessions SET version = ? WHERE id = ?").run(version, req.params.id);
      res.json({ success: true, version });
    } catch (err) {
      res.status(500).json({ error: "Failed to update version" });
    }
  });

  app.get("/api/sessions/:id/export", (req, res) => {
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const papers = db.prepare("SELECT * FROM papers WHERE session_id = ?").all(req.params.id);
    const queries = db.prepare("SELECT * FROM queries WHERE session_id = ?").all(req.params.id);
    const chatMessages = db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC").all(req.params.id);
    const snapshots = db.prepare("SELECT * FROM snapshots WHERE session_id = ? ORDER BY timestamp DESC").all(req.params.id);
    
    const exportData = {
      project_info: {
        name: session.name,
        current_version: session.version,
        created_at: session.created_at
      },
      global_search_registry: queries.map(q => q.text),
      browsing_history: papers.map(p => p.url).filter(Boolean),
      chat_history: chatMessages.map(m => ({
        timestamp: m.timestamp,
        role: m.role,
        text: m.text
      })),
      version_snapshots: snapshots.reduce((acc: any, s) => {
        acc[`v${s.version}`] = {
          query: s.query,
          timestamp: s.timestamp,
          result_count: s.result_count,
          top_result: s.top_result
        };
        return acc;
      }, {})
    };

    res.json(exportData);
  });

  app.post("/api/queries/:id/analysis", (req, res) => {
    const { text } = req.body;
    const queryId = req.params.id;
    try {
      const result = db.prepare("INSERT INTO analyses (query_id, text) VALUES (?, ?)").run(queryId, text);
      res.json({ id: result.lastInsertRowid, text });
    } catch (err) {
      res.status(500).json({ error: "Failed to add analysis" });
    }
  });

  app.patch("/api/sessions/:id/synthesis", (req, res) => {
    const { synthesis } = req.body;
    try {
      db.prepare("UPDATE sessions SET synthesis = ? WHERE id = ?").run(synthesis, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update synthesis" });
    }
  });

  app.post("/api/sessions/:id/papers", (req, res) => {
    const { title, abstract, summary, analysis, url, tags, query_id } = req.body;
    const sessionId = req.params.id;

    try {
      const result = db.prepare(`
        INSERT INTO papers (session_id, title, abstract, summary, analysis, url, tags, query_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sessionId, title, abstract, summary, analysis, url, JSON.stringify(tags || []), query_id || null);
      res.json({ id: result.lastInsertRowid, title });
    } catch (err) {
      res.status(500).json({ error: "Failed to add paper" });
    }
  });

  app.patch("/api/papers/:id/notes", (req, res) => {
    const { notes } = req.body;
    try {
      db.prepare("UPDATE papers SET user_notes = ? WHERE id = ?").run(notes, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update notes" });
    }
  });

  app.get("/api/compare-sessions", (req, res) => {
    const { idA, idB } = req.query;
    if (!idA || !idB) return res.status(400).json({ error: "Two session IDs required" });

    const getSessionData = (id: any) => {
      const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
      if (!session) return null;
      const papers = db.prepare("SELECT * FROM papers WHERE session_id = ?").all(id);
      const queries = db.prepare("SELECT * FROM queries WHERE session_id = ?").all(id);
      const analyses = db.prepare(`
        SELECT a.* FROM analyses a
        JOIN queries q ON a.query_id = q.id
        WHERE q.session_id = ?
      `).all(id);
      return { 
        ...session, 
        papers: papers.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') })), 
        queries, 
        analyses 
      };
    };

    res.json({
      sessionA: getSessionData(idA),
      sessionB: getSessionData(idB)
    });
  });

  // --- FEATURE: NOTES MANAGEMENT ---
  app.get("/api/notes", (req, res) => {
    const notes = db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all();
    res.json(notes.map(n => ({ ...n, tags: JSON.parse(n.tags) })));
  });

  app.post("/api/notes", (req, res) => {
    const { title, content, color, tags, linked_paper_id } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO notes (title, content, color, tags, linked_paper_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(title || "", content || "", color || "#7c5cfc", JSON.stringify(tags || []), linked_paper_id || null);
      
      const newNote = db.prepare("SELECT * FROM notes WHERE id = ?").get(result.lastInsertRowid);
      res.json({ ...newNote, tags: JSON.parse(newNote.tags) });
    } catch (err) {
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  app.put("/api/notes/:id", (req, res) => {
    const { title, content, color, tags, linked_paper_id } = req.body;
    try {
      db.prepare(`
        UPDATE notes 
        SET title = ?, content = ?, color = ?, tags = ?, linked_paper_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, content, color, JSON.stringify(tags || []), linked_paper_id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // --- FEATURE: SCHEDULED RESEARCH DIGEST ---
  app.post("/api/subscribe-digest", (req, res) => {
    const { userId, query, intervalHours } = req.body;
    if (!userId || !query || !intervalHours) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = db.prepare(`
      INSERT INTO subscriptions (user_id, query, interval_hours)
      VALUES (?, ?, ?)
    `).run(userId, query, intervalHours);

    // Schedule the recurring job
    cron.schedule(`0 */${intervalHours} * * *`, () => {
      console.log(`[SCHEDULED] Running digest for ${userId}: ${query}`);
      db.prepare("UPDATE subscriptions SET last_run = CURRENT_TIMESTAMP WHERE id = ?").run(result.lastInsertRowid);
    });

    res.json({ status: "Subscribed", nextRun: `In ${intervalHours} hours` });
  });

  // --- FEATURE: ACADEMIC SEARCH PROXY ---
  app.get("/api/academic/search", async (req, res) => {
    const { query, offset, limit, fields } = req.query;
    const cacheKey = `ss_${query}_${offset}_${limit}_${fields}`;

    // Check cache
    const cached = academicCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`[CACHE] Hit: ${cacheKey}`);
      return res.json(cached.data);
    }

    const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1/paper/search';
    const url = `${SEMANTIC_SCHOLAR_API}?query=${encodeURIComponent(query as string)}&offset=${offset || 0}&limit=${limit || 10}&fields=${fields || 'title,authors,year,abstract,url,citationCount,venue,publicationDate,relevanceScore'}`;

    const headers: Record<string, string> = {};
    if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
      headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
    }

    try {
      const response = await fetchWithRetry(url, { headers });
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Semantic Scholar API error: ${errorText}` });
      }
      const data = await response.json();

      // Update cache
      academicCache.set(cacheKey, { data, timestamp: Date.now() });
      if (academicCache.size > MAX_CACHE_SIZE) {
        const firstKey = academicCache.keys().next().value;
        if (firstKey) academicCache.delete(firstKey);
      }

      res.json(data);
    } catch (error) {
      console.error('Proxy Error:', error);
      res.status(500).json({ error: 'Failed to fetch from Semantic Scholar' });
    }
  });

  // Proxy for OpenAlex
  app.get("/api/openalex/search", async (req, res) => {
    const { query, page, perPage, minYear } = req.query;
    let url = `https://api.openalex.org/works?search=${encodeURIComponent(query as string)}&per-page=${perPage || 5}&page=${page || 1}&select=id,title,authorships,publication_year,abstract_inverted_index,cited_by_count,doi`;
    if (minYear) url += `&filter=publication_year:>${parseInt(minYear as string) - 1}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      const results = data.results.map((item: any) => ({
        title: item.title,
        authors: item.authorships.map((a: any) => a.author.display_name),
        year: item.publication_year,
        link: item.id
      }));

      res.json({ source: "OpenAlex", results });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch from OpenAlex' });
    }
  });

  // Proxy for arXiv
  app.get("/api/arxiv/search", async (req, res) => {
    const { query, maxResults } = req.query;
    const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(query as string)}&start=0&max_results=${maxResults || 5}`;

    try {
      const response = await fetch(url);
      const xmlData = await response.text();
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
      });
      const jsonObj = parser.parse(xmlData);
      
      const feed = jsonObj.feed;
      let entries = feed.entry || [];
      if (!Array.isArray(entries)) entries = [entries];

      const results = entries.map((entry: any) => ({
        title: entry.title?.replace(/\n/g, ' ').trim(),
        authors: Array.isArray(entry.author) 
          ? entry.author.map((a: any) => a.name) 
          : [entry.author?.name].filter(Boolean),
        summary: entry.summary?.replace(/\n/g, ' ').trim(),
        link: entry.id
      }));

      res.json({ source: "arXiv", results });
    } catch (error) {
      console.error('arXiv Error:', error);
      res.status(500).json({ error: 'Failed to fetch from arXiv' });
    }
  });

  // Combined Search Endpoint
  app.get("/api/search/all", async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query required" });

    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const [openalexRes, arxivRes] = await Promise.all([
        fetch(`${baseUrl}/api/openalex/search?query=${encodeURIComponent(query as string)}`),
        fetch(`${baseUrl}/api/arxiv/search?query=${encodeURIComponent(query as string)}`)
      ]);

      const openalexData = await openalexRes.json();
      const arxivData = await arxivRes.json();

      res.json({
        query,
        sources: [openalexData, arxivData]
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch combined results' });
    }
  });

  // --- FEATURE: PEER SANDBOX ---
  const sandbox_permissions: Record<string, string[]> = {
    "draft_paper_001": ["PI_Smith", "PostDoc_Jane", "Student_Kevin", "guest-user-123"]
  };

  app.get("/api/sandbox/:draft_id", (req, res) => {
    const { draft_id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "User ID required" });
    }

    const allowedUsers = sandbox_permissions[draft_id] || [];
    if (!allowedUsers.includes(user_id as string)) {
      return res.status(403).json({ error: "Access Denied: You are not a designated peer reviewer for this sandbox." });
    }
    
    res.json({
      status: "Private Sandbox Active",
      content: "Full Draft PDF Content Here... This is a highly confidential research preprint regarding neural architecture efficiency. The proposed model achieves 40% reduction in FLOPs while maintaining 99% accuracy on ImageNet-1K.",
      feedback_threads: [
        { author: "PI_Smith", text: "The methodology section needs more detail on the hyperparameter tuning.", timestamp: "2026-04-05T10:00:00Z" },
        { author: "PostDoc_Jane", text: "I've verified the results in Figure 2. They look solid.", timestamp: "2026-04-06T09:30:00Z" }
      ] 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
