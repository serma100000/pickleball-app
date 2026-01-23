export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated paddle and ball loader */}
        <div className="relative w-16 h-16">
          {/* Paddle */}
          <svg
            className="absolute inset-0 w-full h-full animate-pulse"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="dashLoaderPaddleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0891B2" />
                <stop offset="100%" stopColor="#0E7490" />
              </linearGradient>
            </defs>
            <rect x="16" y="8" width="20" height="28" rx="8" fill="url(#dashLoaderPaddleGrad)" />
            <rect x="22" y="34" width="8" height="14" rx="2" fill="url(#dashLoaderPaddleGrad)" />
          </svg>

          {/* Bouncing ball */}
          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 animate-bounce" />
        </div>

        {/* Loading text */}
        <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">
          Loading...
        </p>
      </div>
    </div>
  );
}
