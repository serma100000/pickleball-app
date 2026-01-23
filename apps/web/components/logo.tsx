'use client';

import { useId } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'default' | 'white';
}

export function Logo({ size = 'md', showText = true, className = '', variant = 'default' }: LogoProps) {
  const id = useId();
  const paddleGradId = `paddleGrad-${id}`;
  const ballGradId = `ballGrad-${id}`;

  const sizes = {
    sm: { icon: 32, text: 'text-lg', gap: 'gap-2' },
    md: { icon: 40, text: 'text-xl', gap: 'gap-2' },
    lg: { icon: 48, text: 'text-2xl', gap: 'gap-3' },
    xl: { icon: 56, text: 'text-3xl', gap: 'gap-3' },
  };

  const { icon, text, gap } = sizes[size];

  return (
    <div className={`inline-flex items-center ${gap} ${className}`}>
      {/* Paddle + Ball Icon */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        role="img"
        aria-label="PaddleUp logo"
      >
        <defs>
          <linearGradient id={paddleGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891B2" />
            <stop offset="100%" stopColor="#0E7490" />
          </linearGradient>
          <linearGradient id={ballGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>
        {/* Paddle face */}
        <rect x="10" y="6" width="20" height="26" rx="8" fill={`url(#${paddleGradId})`} />
        {/* Paddle handle */}
        <rect x="17" y="30" width="6" height="12" rx="2" fill={`url(#${paddleGradId})`} />
        {/* Ball */}
        <circle cx="36" cy="12" r="8" fill={`url(#${ballGradId})`} />
      </svg>

      {showText && (
        <div className={`font-extrabold tracking-tight ${text}`}>
          {variant === 'white' ? (
            <span className="text-white">
              Paddle<span className="text-brand-300">Up</span>
            </span>
          ) : (
            <>
              {/* Gradient text for "Paddle" */}
              <span
                className="bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent"
              >
                Paddle
              </span>
              {/* "Up" with accent color */}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Up
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Icon-only version for favicons, app icons, etc.
export function LogoIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  const id = useId();
  const paddleGradId = `paddleGradIcon-${id}`;
  const ballGradId = `ballGradIcon-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="PaddleUp logo"
    >
      <defs>
        <linearGradient id={paddleGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>
        <linearGradient id={ballGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      {/* Paddle face */}
      <rect x="10" y="6" width="20" height="26" rx="8" fill={`url(#${paddleGradId})`} />
      {/* Paddle handle */}
      <rect x="17" y="30" width="6" height="12" rx="2" fill={`url(#${paddleGradId})`} />
      {/* Ball */}
      <circle cx="36" cy="12" r="8" fill={`url(#${ballGradId})`} />
    </svg>
  );
}
