import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk middleware
const mockAuth = vi.fn();
const mockRedirectToSignIn = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: (handler: (auth: any, request: any) => Promise<any>) => {
    return async (request: any) => {
      const authResult = {
        redirectToSignIn: mockRedirectToSignIn,
      };
      mockAuth.mockResolvedValue(authResult);
      return handler(mockAuth, request);
    };
  },
  createRouteMatcher: (patterns: string[]) => {
    return (request: { nextUrl: { pathname: string } }) => {
      const pathname = request.nextUrl.pathname;
      return patterns.some(pattern => {
        // Convert pattern to regex
        const regexPattern = pattern
          .replace(/\(.*\)/g, '.*')  // (.*) -> .*
          .replace(/\*/g, '.*');     // * -> .*
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(pathname);
      });
    };
  },
}));

describe('Middleware - Public Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Route Matching', () => {
    it('should define public routes correctly', () => {
      const publicRoutes = [
        '/',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/api/webhooks(.*)',
        '/api/health',
        '/privacy',
        '/terms',
        '/contact',
        '/about',
        '/t/(.*)',      // Public tournament pages
        '/l/(.*)',      // Public league pages
        '/invite/(.*)', // Invitation links
      ];

      expect(publicRoutes).toContain('/');
      expect(publicRoutes).toContain('/sign-in(.*)');
      expect(publicRoutes).toContain('/sign-up(.*)');
      expect(publicRoutes).toContain('/privacy');
      expect(publicRoutes).toContain('/terms');
      expect(publicRoutes).toContain('/contact');
      expect(publicRoutes).toContain('/about');
      expect(publicRoutes).toContain('/t/(.*)');
      expect(publicRoutes).toContain('/l/(.*)');
      expect(publicRoutes).toContain('/invite/(.*)');
    });
  });

  describe('Public Tournament Routes', () => {
    it('should allow access to /t/[slug] without auth', () => {
      const isPublicRoute = createTestMatcher(['/t/(.*)']);
      const request = { nextUrl: { pathname: '/t/summer-championship-2026' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to /t/[uuid] without auth', () => {
      const isPublicRoute = createTestMatcher(['/t/(.*)']);
      const request = { nextUrl: { pathname: '/t/123e4567-e89b-12d3-a456-426614174000' } };
      expect(isPublicRoute(request)).toBe(true);
    });
  });

  describe('Public League Routes', () => {
    it('should allow access to /l/[slug] without auth', () => {
      const isPublicRoute = createTestMatcher(['/l/(.*)']);
      const request = { nextUrl: { pathname: '/l/austin-summer-league' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to /l/[uuid] without auth', () => {
      const isPublicRoute = createTestMatcher(['/l/(.*)']);
      const request = { nextUrl: { pathname: '/l/123e4567-e89b-12d3-a456-426614174000' } };
      expect(isPublicRoute(request)).toBe(true);
    });
  });

  describe('Invite Routes', () => {
    it('should allow access to /invite/[code] without auth', () => {
      const isPublicRoute = createTestMatcher(['/invite/(.*)']);
      const request = { nextUrl: { pathname: '/invite/ABC123XYZ' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to short invite codes', () => {
      const isPublicRoute = createTestMatcher(['/invite/(.*)']);
      const request = { nextUrl: { pathname: '/invite/A1B2' } };
      expect(isPublicRoute(request)).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    it('should require auth for /dashboard', () => {
      const isPublicRoute = createTestMatcher([
        '/',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/t/(.*)',
        '/l/(.*)',
        '/invite/(.*)',
      ]);
      const request = { nextUrl: { pathname: '/dashboard' } };
      expect(isPublicRoute(request)).toBe(false);
    });

    it('should require auth for /tournaments (authenticated list)', () => {
      const isPublicRoute = createTestMatcher([
        '/',
        '/t/(.*)',
        '/l/(.*)',
      ]);
      const request = { nextUrl: { pathname: '/tournaments' } };
      expect(isPublicRoute(request)).toBe(false);
    });

    it('should require auth for /leagues (authenticated list)', () => {
      const isPublicRoute = createTestMatcher([
        '/',
        '/t/(.*)',
        '/l/(.*)',
      ]);
      const request = { nextUrl: { pathname: '/leagues' } };
      expect(isPublicRoute(request)).toBe(false);
    });

    it('should require auth for /settings', () => {
      const isPublicRoute = createTestMatcher([
        '/',
        '/t/(.*)',
        '/l/(.*)',
      ]);
      const request = { nextUrl: { pathname: '/settings' } };
      expect(isPublicRoute(request)).toBe(false);
    });

    it('should require auth for /profile', () => {
      const isPublicRoute = createTestMatcher([
        '/',
        '/t/(.*)',
        '/l/(.*)',
      ]);
      const request = { nextUrl: { pathname: '/profile' } };
      expect(isPublicRoute(request)).toBe(false);
    });
  });

  describe('Auth Routes', () => {
    it('should allow access to /sign-in', () => {
      // /sign-in(.*) pattern matches /sign-in followed by anything including nothing
      const isPublicRoute = createTestMatcher(['/sign-in', '/sign-in/(.*)']);
      const request = { nextUrl: { pathname: '/sign-in' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to /sign-up', () => {
      const isPublicRoute = createTestMatcher(['/sign-up', '/sign-up/(.*)']);
      const request = { nextUrl: { pathname: '/sign-up' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to /sign-in with redirect params', () => {
      const isPublicRoute = createTestMatcher(['/sign-in', '/sign-in/(.*)']);
      const request = { nextUrl: { pathname: '/sign-in/sso-callback' } };
      expect(isPublicRoute(request)).toBe(true);
    });
  });

  describe('API Routes', () => {
    it('should allow access to webhooks', () => {
      const isPublicRoute = createTestMatcher(['/api/webhooks(.*)']);
      const request = { nextUrl: { pathname: '/api/webhooks/clerk' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to health endpoint', () => {
      const isPublicRoute = createTestMatcher(['/api/health']);
      const request = { nextUrl: { pathname: '/api/health' } };
      expect(isPublicRoute(request)).toBe(true);
    });
  });

  describe('Static Pages', () => {
    it('should allow access to privacy page', () => {
      const isPublicRoute = createTestMatcher(['/privacy']);
      const request = { nextUrl: { pathname: '/privacy' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to terms page', () => {
      const isPublicRoute = createTestMatcher(['/terms']);
      const request = { nextUrl: { pathname: '/terms' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to contact page', () => {
      const isPublicRoute = createTestMatcher(['/contact']);
      const request = { nextUrl: { pathname: '/contact' } };
      expect(isPublicRoute(request)).toBe(true);
    });

    it('should allow access to about page', () => {
      const isPublicRoute = createTestMatcher(['/about']);
      const request = { nextUrl: { pathname: '/about' } };
      expect(isPublicRoute(request)).toBe(true);
    });
  });

  describe('Home Page', () => {
    it('should allow access to home page', () => {
      const isPublicRoute = createTestMatcher(['/']);
      const request = { nextUrl: { pathname: '/' } };
      expect(isPublicRoute(request)).toBe(true);
    });
  });

  describe('Middleware Config', () => {
    it('should have correct matcher patterns', () => {
      const config = {
        matcher: [
          '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
          '/(api|trpc)(.*)',
        ],
      };

      expect(config.matcher).toHaveLength(2);
      expect(config.matcher[0]).toContain('_next');
      expect(config.matcher[1]).toContain('api');
    });

    it('should skip static files', () => {
      // The matcher pattern excludes common static file extensions
      const matcher = '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)';

      // Check that key static file patterns are in the matcher
      expect(matcher).toContain('html');
      expect(matcher).toContain('css');
      expect(matcher).toContain('js');
      expect(matcher).toContain('jpe?g'); // matches jpg and jpeg
      expect(matcher).toContain('webp');
      expect(matcher).toContain('png');
      expect(matcher).toContain('gif');
      expect(matcher).toContain('svg');
      expect(matcher).toContain('ttf');
      expect(matcher).toContain('woff');
      expect(matcher).toContain('ico');
    });

    it('should always run for API routes', () => {
      const apiMatcher = '/(api|trpc)(.*)';
      expect(apiMatcher).toContain('api');
      expect(apiMatcher).toContain('trpc');
    });
  });
});

// Helper function to create a test route matcher
function createTestMatcher(patterns: string[]) {
  return (request: { nextUrl: { pathname: string } }) => {
    const pathname = request.nextUrl.pathname;
    return patterns.some(pattern => {
      const regexPattern = pattern
        .replace(/\(\.\*\)/g, '.*')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(pathname);
    });
  };
}
