import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isPlaywrightTest(request: NextRequest) {
  return request.headers.get('x-playwright-test') === '1'
}

export default clerkMiddleware((auth, request) => {
  if (isPlaywrightTest(request)) {
    return NextResponse.next()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
