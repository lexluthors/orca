import React from 'react'
import { CheckCircle, XCircle, Loader2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConnectionStatus = 'testing' | 'connected' | 'error' | 'idle'

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus
  className?: string
}

const statusConfig: Record<
  ConnectionStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; colorClass: string }
> = {
  testing: {
    icon: Loader2,
    label: 'Testing',
    colorClass: 'text-muted-foreground'
  },
  connected: {
    icon: CheckCircle,
    label: 'Connected',
    colorClass: 'text-green-600 dark:text-green-500'
  },
  error: {
    icon: XCircle,
    label: 'Error',
    colorClass: 'text-destructive'
  },
  idle: {
    icon: Circle,
    label: 'Idle',
    colorClass: 'text-muted-foreground/40'
  }
}

export function ConnectionStatusBadge({ status, className }: ConnectionStatusBadgeProps): React.JSX.Element {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', config.colorClass, className)}>
      <Icon className={cn('size-3.5', status === 'testing' && 'animate-spin')} />
      <span>{config.label}</span>
    </span>
  )
}
