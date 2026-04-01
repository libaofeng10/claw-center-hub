import { useQuery } from '@tanstack/react-query';
import { Radio, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { fetchChannelsStatus } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

export default function Channels() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['channels-status'],
    queryFn: fetchChannelsStatus,
  });

  const probeOk = data?.probe?.exitCode === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">渠道状态</h2>
          <p className="mt-1 text-sm text-gray-500">查看各渠道的连接状态和配置</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {isLoading ? (
        <div className="card animate-pulse">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
          </div>
        </div>
      ) : error ? (
        <div className="card text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-300" />
          <p className="mt-2 text-sm text-gray-500">{(error as Error).message}</p>
        </div>
      ) : (
        <>
          {/* Probe result */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">探活结果</h3>
              </div>
              <StatusBadge status={probeOk ? 'online' : 'offline'} />
            </div>
            {data?.probe?.output && (
              <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed">
                {data.probe.output}
              </pre>
            )}
            {data?.probe?.error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {data.probe.error}
              </div>
            )}
          </div>

          {/* Channel config */}
          {data?.config && (
            <div className="card">
              <h3 className="font-semibold text-gray-900">渠道配置（脱敏）</h3>
              <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed">
                {JSON.stringify(data.config, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
