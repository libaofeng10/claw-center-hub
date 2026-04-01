import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Bot,
  FolderOpen,
  File,
  FileText,
  FileJson,
  FileCog,
  ChevronRight,
  ChevronDown,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Lock,
  HardDrive,
  FolderCog,
  AlertTriangle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  fetchAgent,
  fetchFile,
  saveFile,
  createFile,
  deleteFile,
  type FileEntry,
} from '@/lib/api';
import { cn } from '@/lib/cn';

type DirSource = 'workspace' | 'agentDir';

function fileIcon(name: string) {
  if (name.endsWith('.json')) return FileJson;
  if (name.endsWith('.md')) return FileText;
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return FileCog;
  if (name.endsWith('.sh')) return FileCog;
  return File;
}

function formatSize(bytes?: number) {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [openFile, setOpenFile] = useState<{ dir: DirSource; path: string; name: string } | null>(null);
  const [showNewFile, setShowNewFile] = useState<{ dir: DirSource } | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  const agentQuery = useQuery({
    queryKey: ['agent', id],
    queryFn: () => fetchAgent(id!),
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: ({ dir, path, content }: { dir: DirSource; path: string; content: string }) =>
      createFile(id!, dir, path, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', id] });
      setShowNewFile(null);
      setNewFileName('');
      setNewFileContent('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ dir, path }: { dir: DirSource; path: string }) => deleteFile(id!, dir, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', id] });
      if (openFile) setOpenFile(null);
    },
  });

  if (!id) return null;

  if (agentQuery.isLoading) {
    return <div className="flex items-center justify-center py-20 text-sm text-gray-500">加载中...</div>;
  }

  if (agentQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Bot className="h-12 w-12 text-red-300" />
        <h3 className="mt-4 font-semibold text-gray-900">无法加载 Agent</h3>
        <p className="mt-1 text-sm text-gray-500">{(agentQuery.error as Error).message}</p>
        <Link to="/agents" className="btn-secondary mt-4"><ArrowLeft className="h-4 w-4" /> 返回列表</Link>
      </div>
    );
  }

  const { agent, workspaceFiles, agentDirFiles, workspacePath, agentDirPath } = agentQuery.data!;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Link to="/agents" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{agent.name || agent.id}</h2>
          <p className="text-sm text-gray-500">{agent.id}</p>
        </div>
        <button
          onClick={() => agentQuery.refetch()}
          className="btn-secondary text-sm"
          disabled={agentQuery.isFetching}
        >
          <RefreshCw className={cn('h-4 w-4', agentQuery.isFetching && 'animate-spin')} />
          刷新
        </button>
      </div>

      {/* Main layout: file tree + editor */}
      <div className="flex flex-1 gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* Left: file tree */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50/50">
          {/* Workspace section */}
          {workspacePath && (
            <FileSection
              title="Workspace"
              subtitle={workspacePath}
              icon={<HardDrive className="h-4 w-4" />}
              files={workspaceFiles}
              dir="workspace"
              activeFile={openFile}
              onSelectFile={(path, name) => setOpenFile({ dir: 'workspace', path, name })}
              onDeleteFile={(path) => {
                if (confirm(`确定删除 ${path} 吗？`)) deleteMutation.mutate({ dir: 'workspace', path });
              }}
              onNewFile={() => { setShowNewFile({ dir: 'workspace' }); setNewFileName(''); setNewFileContent(''); }}
            />
          )}

          {/* Agent dir section */}
          {agentDirPath && (
            <FileSection
              title="Agent 数据目录"
              subtitle={agentDirPath}
              icon={<FolderCog className="h-4 w-4" />}
              files={agentDirFiles}
              dir="agentDir"
              activeFile={openFile}
              onSelectFile={(path, name) => setOpenFile({ dir: 'agentDir', path, name })}
              onDeleteFile={(path) => {
                if (confirm(`确定删除 ${path} 吗？`)) deleteMutation.mutate({ dir: 'agentDir', path });
              }}
              onNewFile={() => { setShowNewFile({ dir: 'agentDir' }); setNewFileName(''); setNewFileContent(''); }}
            />
          )}

          {!workspacePath && !agentDirPath && (
            <div className="p-6 text-center text-sm text-gray-400">
              该 Agent 未配置 workspace 或 agentDir
            </div>
          )}
        </div>

        {/* Right: file editor / viewer */}
        <div className="flex-1 overflow-hidden">
          {showNewFile ? (
            <div className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  新建文件 ({showNewFile.dir === 'workspace' ? 'Workspace' : 'Agent 目录'})
                </h3>
                <button onClick={() => setShowNewFile(null)} className="rounded p-1 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="文件路径，如 skills/my-skill/SKILL.md"
                className="input mt-4"
              />
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="文件内容..."
                className="input mt-3 flex-1 resize-none font-mono text-sm"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setShowNewFile(null)} className="btn-secondary text-sm">取消</button>
                <button
                  onClick={() => createMutation.mutate({ dir: showNewFile.dir, path: newFileName, content: newFileContent })}
                  disabled={!newFileName.trim() || createMutation.isPending}
                  className="btn-primary text-sm"
                >
                  <Plus className="h-4 w-4" />
                  {createMutation.isPending ? '创建中...' : '创建文件'}
                </button>
              </div>
              {createMutation.isError && (
                <p className="mt-2 text-sm text-red-600">{(createMutation.error as Error).message}</p>
              )}
            </div>
          ) : openFile ? (
            <FileEditor agentId={id} dir={openFile.dir} filePath={openFile.path} fileName={openFile.name} />
          ) : (
            <EmptyState agent={agent} workspaceFiles={workspaceFiles} agentDirFiles={agentDirFiles} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- File Section (tree root) ---- */
function FileSection({
  title, subtitle, icon, files, dir, activeFile, onSelectFile, onDeleteFile, onNewFile,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  files: FileEntry[];
  dir: DirSource;
  activeFile: { dir: DirSource; path: string } | null;
  onSelectFile: (path: string, name: string) => void;
  onDeleteFile: (path: string) => void;
  onNewFile: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-100"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        <span className="text-brand-600">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700">{title}</p>
          <p className="truncate text-[10px] text-gray-400">{subtitle}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onNewFile(); }}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          title="新建文件"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </button>
      {!collapsed && (
        <div className="pb-1">
          {files.length === 0 ? (
            <p className="px-6 py-2 text-xs text-gray-400">空目录</p>
          ) : (
            files.map((f) => (
              <FileTreeNode
                key={f.path}
                entry={f}
                depth={0}
                dir={dir}
                activePath={activeFile?.dir === dir ? activeFile.path : null}
                onSelect={onSelectFile}
                onDelete={onDeleteFile}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---- File Tree Node ---- */
function FileTreeNode({
  entry, depth, dir, activePath, onSelect, onDelete,
}: {
  entry: FileEntry;
  depth: number;
  dir: DirSource;
  activePath: string | null;
  onSelect: (path: string, name: string) => void;
  onDelete: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isActive = entry.type === 'file' && activePath === entry.path;
  const Icon = entry.type === 'directory' ? FolderOpen : fileIcon(entry.name);
  const paddingLeft = 16 + depth * 16;

  if (entry.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 py-1.5 pr-3 text-left hover:bg-gray-100"
          style={{ paddingLeft }}
        >
          {expanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
          <FolderOpen className="h-4 w-4 text-amber-500" />
          <span className="flex-1 truncate text-xs font-medium text-gray-700">{entry.name}</span>
        </button>
        {expanded && entry.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            entry={child}
            depth={depth + 1}
            dir={dir}
            activePath={activePath}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 py-1.5 pr-2 cursor-pointer transition-colors',
        isActive ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-100 text-gray-600',
      )}
      style={{ paddingLeft: paddingLeft + 16 }}
      onClick={() => onSelect(entry.path, entry.name)}
    >
      <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-brand-500' : 'text-gray-400')} />
      <span className="flex-1 truncate text-xs">{entry.name}</span>
      <span className="text-[10px] text-gray-400 hidden group-hover:inline">{formatSize(entry.size)}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(entry.path); }}
        className="hidden rounded p-0.5 text-gray-400 hover:text-red-500 group-hover:inline-block"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ---- File Editor / Viewer ---- */
function FileEditor({ agentId, dir, filePath, fileName }: { agentId: string; dir: DirSource; filePath: string; fileName: string }) {
  const queryClient = useQueryClient();
  const [editContent, setEditContent] = useState<string | null>(null);
  const [previewMd, setPreviewMd] = useState(false);

  const fileQuery = useQuery({
    queryKey: ['file', agentId, dir, filePath],
    queryFn: () => fetchFile(agentId, dir, filePath),
  });

  const saveMutation = useMutation({
    mutationFn: () => saveFile(agentId, dir, filePath, editContent!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file', agentId, dir, filePath] });
      setEditContent(null);
    },
  });

  if (fileQuery.isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">加载中...</div>;
  }

  if (fileQuery.error) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="h-8 w-8 text-red-300" />
        <p className="mt-2 text-sm text-red-600">{(fileQuery.error as Error).message}</p>
      </div>
    );
  }

  const data = fileQuery.data!;

  if (data.binary) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-6">
        <File className="h-10 w-10 text-gray-300" />
        <p className="mt-2 font-medium text-gray-700">{data.name}</p>
        <p className="text-sm text-gray-400">二进制文件 · {formatSize(data.size)}</p>
      </div>
    );
  }

  const content = editContent ?? (data.content || '');
  const isMd = fileName.endsWith('.md');
  const isJson = fileName.endsWith('.json');
  const isEditing = editContent !== null;
  const isSensitive = data.sensitive;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2.5 bg-gray-50/50">
        <span className="flex-1 text-sm font-medium text-gray-700 truncate" title={filePath}>
          {filePath}
        </span>
        {isSensitive && (
          <span className="badge-yellow text-xs"><Lock className="mr-1 h-3 w-3" />敏感文件（只读）</span>
        )}
        <span className="text-xs text-gray-400">{formatSize(data.size)}</span>

        {isMd && (
          <button
            onClick={() => setPreviewMd(!previewMd)}
            className={cn('btn-secondary text-xs', previewMd && 'bg-brand-50 text-brand-700 border-brand-200')}
          >
            {previewMd ? '编辑' : '预览'}
          </button>
        )}

        {!isSensitive && !isEditing && (
          <button onClick={() => setEditContent(data.content || '')} className="btn-secondary text-xs">
            编辑
          </button>
        )}
        {isEditing && (
          <>
            <button onClick={() => setEditContent(null)} className="btn-secondary text-xs">取消</button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="btn-primary text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {saveMutation.isPending ? '保存中...' : '保存'}
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {saveMutation.isSuccess && (
          <div className="mx-4 mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">保存成功</div>
        )}
        {saveMutation.isError && (
          <div className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{(saveMutation.error as Error).message}</div>
        )}

        {isMd && previewMd && !isEditing ? (
          <div className="prose prose-sm max-w-none p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setEditContent(e.target.value)}
            className="h-full w-full resize-none border-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
            spellCheck={false}
          />
        ) : (
          <pre className="h-full p-4 font-mono text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{content}</pre>
        )}
      </div>
    </div>
  );
}

/* ---- Empty State (when no file is selected) ---- */
function EmptyState({ agent, workspaceFiles, agentDirFiles }: {
  agent: any;
  workspaceFiles: FileEntry[];
  agentDirFiles: FileEntry[];
}) {
  const totalFiles = countFiles(workspaceFiles) + countFiles(agentDirFiles);

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        <Bot className="h-8 w-8 text-brand-500" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{agent.name || agent.id}</h3>
      <p className="mt-1 text-sm text-gray-500">共 {totalFiles} 个配置文件</p>

      <div className="mt-6 grid gap-3 text-left w-full max-w-sm">
        {agent.workspace && (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500">Workspace</p>
            <p className="mt-0.5 text-sm text-gray-900 break-all">{agent.workspace}</p>
          </div>
        )}
        {agent.agentDir && (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500">Agent 目录</p>
            <p className="mt-0.5 text-sm text-gray-900 break-all">{agent.agentDir}</p>
          </div>
        )}
        {agent.subagents && (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500">子代理</p>
            <p className="mt-0.5 text-sm text-gray-900">
              {typeof agent.subagents === 'object' && agent.subagents.allowAgents
                ? (agent.subagents as any).allowAgents.join(', ')
                : JSON.stringify(agent.subagents)}
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400">点击左侧文件进行查看和编辑</p>
    </div>
  );
}

function countFiles(entries: FileEntry[]): number {
  let count = 0;
  for (const e of entries) {
    if (e.type === 'file') count++;
    if (e.children) count += countFiles(e.children);
  }
  return count;
}
