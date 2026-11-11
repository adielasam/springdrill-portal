import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect routes, for example redirect to / if not logged in and accessing protected routes
  // For now we just refresh the session

  // School subdomains (PREPARED, NOT LIVE YET): each subscribing school gets
  // its own portal address, e.g. springvalley.<domain>. This activates only
  // once ALL THREE exist: (1) a custom domain for SpringDrill (e.g.
  // springdrill.com.ng), (2) a Vercel wildcard domain + DNS record,
  // (3) the SCHOOL_DOMAIN env var set in Vercel. Until SCHOOL_DOMAIN is
  // set, this block does nothing. When active, a request to
  // <slug>.<domain> only gets an `x-school-slug` header for the app to
  // read; the apex domain and www. never get a slug. Placed here, after
  // getUser(), so it never interferes with the session refresh above.
  const schoolDomain = process.env.SCHOOL_DOMAIN;
  if (schoolDomain) {
    const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
    const domain = schoolDomain.toLowerCase();
    const suffix = `.${domain}`;
    if (host !== domain && host !== `www.${domain}` && host.endsWith(suffix)) {
      const slug = host.slice(0, -suffix.length);
      if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
        supabaseResponse.headers.set('x-school-slug', slug);
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
