import fs from 'fs/promises';
import path from 'path';
import os from 'os';

function resolveHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

const OPENCLAW_HOME = resolveHome(process.env.OPENCLAW_HOME || '~/.openclaw');

export function getOpenclawHome(): string {
  return OPENCLAW_HOME;
}

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const bakPath = filePath + '.bak';
  try {
    await fs.access(filePath);
    await fs.copyFile(filePath, bakPath);
  } catch {
    // original file doesn't exist yet
  }
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  const bakPath = filePath + '.bak';
  try {
    await fs.access(filePath);
    await fs.copyFile(filePath, bakPath);
  } catch {
    // original file doesn't exist yet
  }
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function removeDir(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}

export function getOpenclawConfigPath(): string {
  return path.join(OPENCLAW_HOME, 'openclaw.json');
}

export function getAgentCatalogPath(): string {
  return path.join(OPENCLAW_HOME, 'agent-catalog.json');
}

const SENSITIVE_KEYS = [
  'appSecret', 'secret', 'token', 'accessKey', 'password',
  'apiKey', 'api_key', 'private_key', 'privateKey',
];

export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        result[key] = typeof value === 'string' && value.length > 0
          ? value.slice(0, 4) + '****'
          : '****';
      } else {
        result[key] = sanitizeObject(value);
      }
    }
    return result;
  }
  return obj;
}
