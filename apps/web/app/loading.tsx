export default function Loading() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="flex flex-col items-center gap-4">
        {/* Animated paddle and ball loader */}
        <div className="relative w-20 h-20">
          {/* Paddle */}
          <svg
            className="absolute inset-0 w-full h-full animate-pulse"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="loaderPaddleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0891B2" />
                <stop offset="100%" stopColor="#0E7490" />
              </linearGradient>
            </defs>
            <rect x="20" y="10" width="25" height="35" rx="10" fill="url(#loaderPaddleGrad)" />
            <rect x="28" y="42" width="9" height="18" rx="3" fill="url(#loaderPaddleGrad)" />
          </svg>

          {/* Bouncing ball */}
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 animate-bounce" />
        </div>

        {/* Loading text */}
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          Loading...
        </p>
      </div>
    </div>
  );
}
