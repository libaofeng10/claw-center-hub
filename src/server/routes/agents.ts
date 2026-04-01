import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';
import {
  readJsonFile,
  readTextFile,
  writeTextFile,
  fileExists,
  listDirectories,
  ensureDir,
  removeDir,
  getOpenclawConfigPath,
  sanitizeObject,
} from '../services/file-service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

interface AgentConfig {
  id: string;
  name?: string;
  workspace?: string;
  agentDir?: string;
  subagents?: unknown;
  tools?: {
    alsoAllow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

interface OpenClawConfig {
  agents?: {
    list?: AgentConfig[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

async function loadConfig(): Promise<OpenClawConfig> {
  return readJsonFile<OpenClawConfig>(getOpenclawConfigPath());
}

function getAgentList(config: OpenClawConfig): AgentConfig[] {
  return config?.agents?.list || [];
}

function resolvePath(p: string): string {
  return p.replace(/^~/, process.env.HOME || '');
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
  '.zip', '.tar', '.gz', '.bz2', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.eot',
]);

const SENSITIVE_FILES = new Set(['auth-profiles.json', 'auth.json']);

interface FileEntry {
  name: string;
  path: string;         // relative path from the root dir
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  children?: FileEntry[];
}

async function scanDirectory(dirPath: string, relativeTo: string, depth = 0): Promise<FileEntry[]> {
  if (depth > 5) return [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results: FileEntry[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.openclaw') continue;

      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.relative(relativeTo, fullPath);

      if (entry.isDirectory()) {
        const children = await scanDirectory(fullPath, relativeTo, depth + 1);
        results.push({
          name: entry.name,
          path: relPath,
          type: 'directory',
          children,
        });
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        results.push({
          name: entry.name,
          path: relPath,
          type: 'file',
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      }
    }

    results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  } catch {
    return [];
  }
}

// GET /api/agents
router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    res.json({ agents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    let workspaceFiles: FileEntry[] = [];
    let agentDirFiles: FileEntry[] = [];

    if (agent.workspace) {
      const wsPath = resolvePath(agent.workspace);
      workspaceFiles = await scanDirectory(wsPath, wsPath);
    }

    if (agent.agentDir) {
      const adPath = resolvePath(agent.agentDir);
      agentDirFiles = await scanDirectory(adPath, adPath);
    }

    res.json({
      agent: sanitizeObject(agent),
      workspaceFiles,
      agentDirFiles,
      workspacePath: agent.workspace || null,
      agentDirPath: agent.agentDir || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id/file?dir=workspace|agentDir&path=relative/path
router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const dir = req.query.dir as string;
    const filePath = req.query.path as string;
    if (!dir || !filePath) return res.status(400).json({ error: 'dir and path are required' });

    const basePath = dir === 'agentDir' ? agent.agentDir : agent.workspace;
    if (!basePath) return res.status(400).json({ error: `No ${dir} configured` });

    const resolved = path.resolve(resolvePath(basePath), filePath);
    if (!resolved.startsWith(resolvePath(basePath))) {
      return res.status(403).json({ error: 'Path traversal denied' });
    }

    if (!(await fileExists(resolved))) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(resolved).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      return res.json({ binary: true, name: path.basename(resolved), size: (await fs.stat(resolved)).size });
    }

    let content = await readTextFile(resolved);
    const fileName = path.basename(resolved);
    const isSensitive = SENSITIVE_FILES.has(fileName);

    if (isSensitive) {
      try {
        const parsed = JSON.parse(content);
        content = JSON.stringify(sanitizeObject(parsed), null, 2);
      } catch {
        // not JSON, return as-is
      }
    }

    res.json({
      content,
      name: fileName,
      path: filePath,
      sensitive: isSensitive,
      size: Buffer.byteLength(content, 'utf-8'),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agents/:id/file?dir=workspace|agentDir&path=relative/path
router.put('/:id/file', async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const dir = req.query.dir as string;
    const filePath = req.query.path as string;
    if (!dir || !filePath) return res.status(400).json({ error: 'dir and path are required' });

    const basePath = dir === 'agentDir' ? agent.agentDir : agent.workspace;
    if (!basePath) return res.status(400).json({ error: `No ${dir} configured` });

    const resolved = path.resolve(resolvePath(basePath), filePath);
    if (!resolved.startsWith(resolvePath(basePath))) {
      return res.status(403).json({ error: 'Path traversal denied' });
    }

    const fileName = path.basename(resolved);
    if (SENSITIVE_FILES.has(fileName)) {
      return res.status(403).json({ error: 'Cannot directly edit sensitive files' });
    }

    await ensureDir(path.dirname(resolved));
    await writeTextFile(resolved, req.body.content);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/:id/file?dir=workspace|agentDir&path=relative/path (create new file)
router.post('/:id/file', async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const dir = req.query.dir as string;
    const filePath = req.query.path as string;
    if (!dir || !filePath) return res.status(400).json({ error: 'dir and path are required' });

    const basePath = dir === 'agentDir' ? agent.agentDir : agent.workspace;
    if (!basePath) return res.status(400).json({ error: `No ${dir} configured` });

    const resolved = path.resolve(resolvePath(basePath), filePath);
    if (!resolved.startsWith(resolvePath(basePath))) {
      return res.status(403).json({ error: 'Path traversal denied' });
    }

    if (await fileExists(resolved)) {
      return res.status(409).json({ error: 'File already exists' });
    }

    await ensureDir(path.dirname(resolved));
    await writeTextFile(resolved, req.body.content || '');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agents/:id/file?dir=workspace|agentDir&path=relative/path
router.delete('/:id/file', async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const dir = req.query.dir as string;
    const filePath = req.query.path as string;
    if (!dir || !filePath) return res.status(400).json({ error: 'dir and path are required' });

    const basePath = dir === 'agentDir' ? agent.agentDir : agent.workspace;
    if (!basePath) return res.status(400).json({ error: `No ${dir} configured` });

    const resolved = path.resolve(resolvePath(basePath), filePath);
    if (!resolved.startsWith(resolvePath(basePath))) {
      return res.status(403).json({ error: 'Path traversal denied' });
    }

    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) {
      await removeDir(resolved);
    } else {
      await fs.unlink(resolved);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Legacy skill/auth endpoints kept for compatibility ---

// GET /api/agents/:id/skills
router.get('/:id/skills', async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (!agent.workspace) return res.json({ skills: [] });

    const wsPath = resolvePath(agent.workspace);
    const skillsDir = path.join(wsPath, 'skills');
    const skillNames = await listDirectories(skillsDir);

    const skills = await Promise.all(
      skillNames.map(async (name) => {
        const skillMdPath = path.join(skillsDir, name, 'SKILL.md');
        let content = '';
        if (await fileExists(skillMdPath)) {
          content = await readTextFile(skillMdPath);
        }
        return { name, content, path: path.join(skillsDir, name) };
      }),
    );
    res.json({ skills });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/:id/skills
router.post('/:id/skills', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (!agent.workspace) return res.status(400).json({ error: 'No workspace configured' });

    const skillName = req.body.name;
    if (!skillName) return res.status(400).json({ error: 'Skill name is required' });

    const wsPath = resolvePath(agent.workspace);
    const skillDir = path.join(wsPath, 'skills', skillName);
    await ensureDir(skillDir);

    let content = req.body.content || '';
    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    }
    if (!content.startsWith('---')) {
      content = `---\nname: ${skillName}\ndescription: "${skillName} skill"\n---\n\n${content}`;
    }

    await writeTextFile(path.join(skillDir, 'SKILL.md'), content);
    res.json({ ok: true, name: skillName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id/auth-status
router.get('/:id/auth-status', async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const agents = getAgentList(config);
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (!agent.agentDir) {
      return res.json({ authenticated: false, reason: 'No agentDir configured' });
    }

    const agentDirPath = resolvePath(agent.agentDir);
    const authPath = path.join(agentDirPath, 'auth-profiles.json');
    const exists = await fileExists(authPath);

    if (!exists) {
      return res.json({ authenticated: false, reason: 'auth-profiles.json not found' });
    }

    const authData = await readJsonFile(authPath);
    res.json({ authenticated: true, profiles: sanitizeObject(authData) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
