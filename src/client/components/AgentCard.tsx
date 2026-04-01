import { Link } from 'react-router-dom';
import { Bot, ChevronRight, Users, Wrench } from 'lucide-react';
import type { Agent } from '@/lib/api';

interface AgentCardProps {
  agent: Agent;
}

function getAgentType(agent: Agent): { label: string; color: string } {
  if (agent.subagents && agent.subagents.length > 0) {
    return { label: '主 Agent', color: 'badge-blue' };
  }
  if (agent.id.includes('distribution') || agent.id.includes('dispatch')) {
    return { label: '分发 Agent', color: 'badge-yellow' };
  }
  return { label: '子 Agent', color: 'badge-gray' };
}

export default function AgentCard({ agent }: AgentCardProps) {
  const agentType = getAgentType(agent);

  return (
    <Link to={`/agents/${agent.id}`} className="card group block">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{agent.name || agent.id}</h3>
            <p className="text-xs text-gray-500">{agent.id}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 transition-colors group-hover:text-gray-500" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={agentType.color}>{agentType.label}</span>
        {agent.subagents && agent.subagents.length > 0 && (
          <span className="badge-gray">
            <Users className="mr-1 h-3 w-3" />
            {agent.subagents.length} 子代理
          </span>
        )}
        {agent.tools?.alsoAllow && agent.tools.alsoAllow.length > 0 && (
          <span className="badge-gray">
            <Wrench className="mr-1 h-3 w-3" />
            {agent.tools.alsoAllow.length} 工具
          </span>
        )}
      </div>

      {agent.workspace && (
        <p className="mt-3 truncate text-xs text-gray-400" title={agent.workspace}>
          {agent.workspace}
        </p>
      )}
    </Link>
  );
}
