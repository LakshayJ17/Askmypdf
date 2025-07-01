import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Protect all routes except '/', '/sign-in', '/sign-up', and static files
    '/((?!_next|favicon.ico|sign-in|sign-up|$).*)',
  ],
}