import { cn } from '@/lib/cn';

type Status = 'online' | 'offline' | 'warning' | 'unknown';

const statusConfig: Record<Status, { label: string; className: string; dot: string }> = {
  online: { label: '在线', className: 'badge-green', dot: 'bg-emerald-500' },
  offline: { label: '离线', className: 'badge-red', dot: 'bg-red-500' },
  warning: { label: '告警', className: 'badge-yellow', dot: 'bg-amber-500' },
  unknown: { label: '未知', className: 'badge-gray', dot: 'bg-gray-400' },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
}

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unknown;
  return (
    <span className={cn(config.className, className)}>
      <span className={cn('mr-1.5 inline-block h-2 w-2 rounded-full', config.dot)} />
      {label || config.label}
    </span>
  );
}
