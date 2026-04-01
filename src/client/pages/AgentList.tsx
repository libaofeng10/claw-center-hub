import { useQuery } from '@tanstack/react-query';
import { Bot, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { fetchAgents } from '@/lib/api';
import AgentCard from '@/components/AgentCard';

export default function AgentList() {
  const { data, isLoading, error } = useQuery({ queryKey: ['agents'], queryFn: fetchAgents });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'main' | 'sub'>('all');

  const agents = useMemo(() => {
    let list = data?.agents ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          (a.name && a.name.toLowerCase().includes(q)),
      );
    }
    if (typeFilter === 'main') {
      list = list.filter((a) => a.subagents && a.subagents.length > 0);
    } else if (typeFilter === 'sub') {
      list = list.filter((a) => !a.subagents || a.subagents.length === 0);
    }
    return list;
  }, [data, search, typeFilter]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Bot className="h-12 w-12 text-red-300" />
        <h3 className="mt-4 font-semibold text-gray-900">无法加载 Agent 列表</h3>
        <p className="mt-1 text-sm text-gray-500">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Agent 管理</h2>
        <p className="mt-1 text-sm text-gray-500">管理和查看所有 Agent 配置</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索 Agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {[
            { key: 'all' as const, label: '全部' },
            { key: 'main' as const, label: '主 Agent' },
            { key: 'sub' as const, label: '子 Agent' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === f.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-16 rounded bg-gray-200" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-5 w-16 rounded-full bg-gray-200" />
                <div className="h-5 w-20 rounded-full bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bot className="h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-semibold text-gray-900">
            {search || typeFilter !== 'all' ? '没有匹配的 Agent' : '暂无 Agent 配置'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || typeFilter !== 'all'
              ? '尝试调整搜索条件'
              : '请检查 openclaw.json 配置'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
