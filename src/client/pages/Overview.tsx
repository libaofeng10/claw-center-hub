import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Bot,
  Radio,
  Server,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchGatewayStatus, fetchAgents, fetchChannelsStatus } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

export default function Overview() {
  const gateway = useQuery({ queryKey: ['gateway-status'], queryFn: fetchGatewayStatus });
  const agents = useQuery({ queryKey: ['agents'], queryFn: fetchAgents });
  const channels = useQuery({ queryKey: ['channels-status'], queryFn: fetchChannelsStatus });

  const agentCount = agents.data?.agents?.length ?? 0;
  const mainAgents = agents.data?.agents?.filter((a) => a.subagents && a.subagents.length > 0) ?? [];
  const subAgents = agents.data?.agents?.filter((a) => !a.subagents || a.subagents.length === 0) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">总览</h2>
        <p className="mt-1 text-sm text-gray-500">OpenClaw 系统运行状态一览</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gateway status */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Server className="h-5 w-5 text-emerald-600" />
            </div>
            <StatusBadge
              status={gateway.data?.reachable ? 'online' : gateway.isLoading ? 'unknown' : 'offline'}
            />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900">
            {gateway.data?.reachable ? 'Running' : gateway.isLoading ? '...' : 'Down'}
          </h3>
          <p className="text-sm text-gray-500">Gateway 状态</p>
        </div>

        {/* Agent count */}
        <div className="card">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
            <Bot className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900">
            {agents.isLoading ? '...' : agentCount}
          </h3>
          <p className="text-sm text-gray-500">Agent 总数</p>
          <div className="mt-2 flex gap-3 text-xs text-gray-400">
            <span>{mainAgents.length} 主 Agent</span>
            <span>{subAgents.length} 子 Agent</span>
          </div>
        </div>

        {/* Channel status */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Radio className="h-5 w-5 text-purple-600" />
            </div>
            <StatusBadge
              status={
                channels.data?.probe?.exitCode === 0
                  ? 'online'
                  : channels.isLoading
                    ? 'unknown'
                    : 'warning'
              }
            />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900">
            {channels.isLoading ? '...' : channels.data?.probe?.exitCode === 0 ? '正常' : '异常'}
          </h3>
          <p className="text-sm text-gray-500">渠道连接</p>
        </div>

        {/* Activity */}
        <div className="card">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900">
            {gateway.data?.info && typeof gateway.data.info === 'object' && 'uptime' in (gateway.data.info as any)
              ? String((gateway.data.info as any).uptime)
              : '--'}
          </h3>
          <p className="text-sm text-gray-500">运行时间</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent list preview */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Agent 列表</h3>
            <Link to="/agents" className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
              查看全部 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {agents.isLoading ? (
              <div className="py-8 text-center text-sm text-gray-400">加载中...</div>
            ) : agents.data?.agents?.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">暂无 Agent 配置</div>
            ) : (
              agents.data?.agents?.slice(0, 5).map((agent) => (
                <Link
                  key={agent.id}
                  to={`/agents/${agent.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Bot className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{agent.name || agent.id}</p>
                      <p className="text-xs text-gray-400">{agent.id}</p>
                    </div>
                  </div>
                  {agent.subagents && agent.subagents.length > 0 && (
                    <span className="badge-blue text-xs">{agent.subagents.length} 子代理</span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* System health */}
        <div className="card">
          <h3 className="font-semibold text-gray-900">系统健康</h3>
          <div className="mt-4 space-y-3">
            <HealthItem
              label="Gateway 连接"
              ok={gateway.data?.reachable ?? null}
              loading={gateway.isLoading}
            />
            <HealthItem
              label="渠道探活"
              ok={channels.data ? channels.data.probe.exitCode === 0 : null}
              loading={channels.isLoading}
            />
            <HealthItem
              label="Agent 配置"
              ok={agents.data ? agents.data.agents.length > 0 : null}
              loading={agents.isLoading}
            />

            {gateway.data?.cli?.output && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">Gateway CLI 输出</p>
                <pre className="mt-1 whitespace-pre-wrap text-xs text-gray-600">
                  {gateway.data.cli.output.slice(0, 500)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthItem({ label, ok, loading }: { label: string; ok: boolean | null; loading: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
      <span className="text-sm text-gray-700">{label}</span>
      {loading ? (
        <span className="text-xs text-gray-400">检查中...</span>
      ) : ok === null ? (
        <AlertTriangle className="h-4 w-4 text-gray-300" />
      ) : ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
    </div>
  );
}
