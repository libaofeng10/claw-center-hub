import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchConfig,
  updateConfig,
  fetchCatalog,
  regenerateCatalog,
  restartGateway,
} from '@/lib/api';
import { cn } from '@/lib/cn';

type TabKey = 'config' | 'catalog';

export default function Config() {
  const [tab, setTab] = useState<TabKey>('config');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">配置管理</h2>
        <p className="mt-1 text-sm text-gray-500">编辑 openclaw.json 和管理 Agent Catalog</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'config' as TabKey, label: 'openclaw.json', icon: Settings },
          { key: 'catalog' as TabKey, label: 'Agent Catalog', icon: BookOpen },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' && <ConfigEditor />}
      {tab === 'catalog' && <CatalogManager />}
    </div>
  );
}

function ConfigEditor() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });
  const [editText, setEditText] = useState<string | null>(null);
  const [parseError, setParseError] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(editText!);
      return updateConfig(parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setEditText(null);
    },
  });

  const restartMutation = useMutation({
    mutationFn: restartGateway,
  });

  const rawText = editText ?? (data?.raw ? JSON.stringify(data.raw, null, 2) : '');

  const handleEdit = (val: string) => {
    setEditText(val);
    try {
      JSON.parse(val);
      setParseError('');
    } catch (e: any) {
      setParseError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data?.path && <span className="text-xs text-gray-400">{data.path}</span>}
        </div>
        <div className="flex gap-2">
          {editText !== null && (
            <button onClick={() => setEditText(null)} className="btn-secondary text-sm">
              取消
            </button>
          )}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!editText || !!parseError || saveMutation.isPending}
            className="btn-primary text-sm"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? '保存中...' : '保存'}
          </button>
          <button
            onClick={() => {
              if (confirm('确定重启 Gateway 吗？这将中断所有当前会话。')) {
                restartMutation.mutate();
              }
            }}
            disabled={restartMutation.isPending}
            className="btn-danger text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            重启 Gateway
          </button>
        </div>
      </div>

      {saveMutation.isSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {saveMutation.data?.message || '保存成功'}
        </div>
      )}

      {restartMutation.isSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          <RefreshCw className="h-4 w-4" />
          Gateway 重启指令已发送
        </div>
      )}

      {parseError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          JSON 格式错误: {parseError}
        </div>
      )}

      {isLoading ? (
        <div className="card animate-pulse">
          <div className="h-96 rounded bg-gray-200" />
        </div>
      ) : error ? (
        <div className="card text-center text-sm text-red-500">{(error as Error).message}</div>
      ) : (
        <textarea
          value={rawText}
          onChange={(e) => handleEdit(e.target.value)}
          className="w-full min-h-[500px] rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          spellCheck={false}
        />
      )}
    </div>
  );
}

function CatalogManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog });

  const regenMutation = useMutation({
    mutationFn: regenerateCatalog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Agent Catalog</h3>
          <p className="text-sm text-gray-500">
            {data?.exists ? '当前 catalog 内容' : 'Catalog 文件不存在'}
          </p>
        </div>
        <button
          onClick={() => regenMutation.mutate()}
          disabled={regenMutation.isPending}
          className="btn-primary text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${regenMutation.isPending ? 'animate-spin' : ''}`} />
          重新生成
        </button>
      </div>

      {regenMutation.isSuccess && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <p>Catalog 重新生成完成</p>
          {regenMutation.data?.output && (
            <pre className="mt-1 text-xs">{regenMutation.data.output}</pre>
          )}
        </div>
      )}
      {regenMutation.isError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {(regenMutation.error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="card animate-pulse">
          <div className="h-64 rounded bg-gray-200" />
        </div>
      ) : error ? (
        <div className="card text-sm text-red-500">{(error as Error).message}</div>
      ) : data?.catalog ? (
        <pre className="max-h-[600px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed">
          {JSON.stringify(data.catalog, null, 2)}
        </pre>
      ) : (
        <div className="card py-12 text-center text-sm text-gray-400">
          Catalog 文件不存在，点击上方按钮生成
        </div>
      )}
    </div>
  );
}
