import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health',
  '/privacy',
  '/terms',
  '/contact',
  '/about',
  // Public event pages - shareable without authentication
  '/t/(.*)',      // Public tournament pages
  '/l/(.*)',      // Public league pages
  '/invite/(.*)', // Invitation links
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const { redirectToSignIn } = await auth()
    if (!auth) {
      return redirectToSignIn()
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
