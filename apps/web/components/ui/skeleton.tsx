import { cn } from '@/lib/utils';

/**
 * Base Skeleton component with pulse animation
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
      {...props}
    />
  );
}

/**
 * Skeleton for circular elements like avatars
 */
function SkeletonAvatar({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton className={cn('rounded-full', sizeClasses[size], className)} />
  );
}

/**
 * Skeleton for text lines with width variants
 */
function SkeletonText({
  width = 'full',
  height = 'md',
  className,
}: {
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | string;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const widthClasses: Record<string, string> = {
    xs: 'w-12',
    sm: 'w-20',
    md: 'w-32',
    lg: 'w-48',
    xl: 'w-64',
    full: 'w-full',
  };

  const heightClasses = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-5',
  };

  const widthClass = widthClasses[width] || width;

  return (
    <Skeleton className={cn(widthClass, heightClasses[height], className)} />
  );
}

/**
 * Skeleton for card layouts
 */
function SkeletonCard({
  className,
  children,
  hasHeader = true,
  hasFooter = false,
}: {
  className?: string;
  children?: React.ReactNode;
  hasHeader?: boolean;
  hasFooter?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {hasHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <SkeletonText width="lg" height="lg" />
        </div>
      )}
      <div className="p-4">{children}</div>
      {hasFooter && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <SkeletonText width="md" />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for table rows
 */
function SkeletonTableRow({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4 p-4', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonText
          key={i}
          width={i === 0 ? 'lg' : i === columns - 1 ? 'sm' : 'md'}
          className="flex-1"
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for table layouts
 */
function SkeletonTable({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className,
}: {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden',
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonText key={i} width="sm" height="sm" className="flex-1" />
          ))}
        </div>
      )}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for stat cards (used in dashboard)
 */
function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <SkeletonText width="sm" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <SkeletonText width="md" height="sm" />
    </div>
  );
}

/**
 * Skeleton for icon buttons
 */
function SkeletonButton({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-28',
    lg: 'h-12 w-36',
  };

  return (
    <Skeleton className={cn('rounded-lg', sizeClasses[size], className)} />
  );
}

export {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonTableRow,
  SkeletonStatCard,
  SkeletonButton,
};
