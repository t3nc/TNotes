import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      {icon ? <div className="text-3xl text-faint">{icon}</div> : null}
      <div className="text-[15px] font-semibold text-text">{title}</div>
      {description ? <div className="max-w-sm text-[13px] leading-relaxed text-muted">{description}</div> : null}
      {action}
    </div>
  );
}
