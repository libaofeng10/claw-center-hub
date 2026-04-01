import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { ScrollText, RefreshCw, Search, ArrowDown } from 'lucide-react';
import { fetchLogs } from '@/lib/api';
import { cn } from '@/lib/cn';

const LOG_LEVELS = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

export default function Logs() {
  const [source, setSource] = useState<'file' | 'cli'>('file');
  const [lines, setLines] = useState(200);
  const [filter, setFilter] = useState('');
  const [level, setLevel] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['logs', source, lines, filter, level],
    queryFn: () => fetchLogs({ source, lines, filter: filter || undefined, level: level || undefined }),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data, autoScroll]);

  const logLines = data?.lines ?? [];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">日志查看</h2>
          <p className="mt-1 text-sm text-gray-500">查看 OpenClaw 运行日志</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['file', 'cli'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                source === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {s === 'file' ? '文件' : 'CLI'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="过滤关键字..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-full pl-9"
          />
        </div>

        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="input"
        >
          <option value="">全部级别</option>
          {LOG_LEVELS.map((l) => (
            <option key={l} value={l === 'ALL' ? '' : l}>{l}</option>
          ))}
        </select>

        <select
          value={lines}
          onChange={(e) => setLines(Number(e.target.value))}
          className="input"
        >
          {[100, 200, 500, 1000].map((n) => (
            <option key={n} value={n}>最近 {n} 行</option>
          ))}
        </select>

        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn('btn-secondary text-xs', autoScroll && 'bg-brand-50 text-brand-700 border-brand-200')}
        >
          <ArrowDown className="h-3 w-3" />
          自动滚动
        </button>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4">
        {isLoading ? (
          <div className="text-sm text-gray-400">加载中...</div>
        ) : logLines.length === 0 ? (
          <div className="text-sm text-gray-500">暂无日志</div>
        ) : (
          <pre className="text-xs leading-5 text-gray-300">
            {logLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'hover:bg-gray-800/50',
                  line.includes('ERROR') && 'text-red-400',
                  line.includes('WARN') && 'text-amber-400',
                  line.includes('DEBUG') && 'text-gray-500',
                )}
              >
                <span className="mr-3 inline-block w-8 text-right text-gray-600">{i + 1}</span>
                {line}
              </div>
            ))}
            <div ref={logsEndRef} />
          </pre>
        )}
      </div>
    </div>
  );
}
