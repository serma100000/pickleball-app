import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const spinnerVariants = cva('animate-spin text-muted-foreground', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        className={cn(spinnerVariants({ size }), className)}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';

export interface SpinnerOverlayProps extends SpinnerProps {
  label?: string;
}

const SpinnerOverlay = React.forwardRef<HTMLDivElement, SpinnerOverlayProps>(
  ({ className, size, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm',
          className
        )}
      >
        <Spinner size={size} {...props} />
        {label && (
          <p className="mt-2 text-sm text-muted-foreground">{label}</p>
        )}
      </div>
    );
  }
);
SpinnerOverlay.displayName = 'SpinnerOverlay';

export { Spinner, SpinnerOverlay, spinnerVariants };
