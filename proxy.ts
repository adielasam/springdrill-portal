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

  // School subdomains (gated on the SCHOOL_DOMAIN env var): each school
  // gets its own portal address, e.g. springvalley.springdrill.com.ng.
  // This activates only once ALL THREE exist: (1) a custom domain for
  // SpringDrill (e.g. springdrill.com.ng), (2) a Vercel wildcard domain +
  // DNS record, (3) the SCHOOL_DOMAIN env var set in Vercel. Until
  // SCHOOL_DOMAIN is set, this block and the redirect below do nothing.
  // A subdomain request is REWRITTEN (not redirected) to the school
  // front door, so the school keeps its clean address in the browser bar.
  // The front door reads the slug back from the hostname (see
  // public/school.html), and the header is kept for anything server-side
  // that wants it later. Placed here, after getUser(), so it never
  // interferes with the session refresh above.
  const RESERVED_SLUGS = new Set([
    'admin_dashboard.html', 'teacher_dashboard.html', 'student_dashboard.html',
    'admin_create_user.html', 'vendor_dashboard.html', 'school_setup.html',
    'school_signup.html', 'school.html', 'school_paused.html',
    'contact', 'jamb-practice', 'tools', 'high', 'api', 'sitemap.xml', 'robots.txt',
  ]);
  const SUBDOMAIN_RESERVED = new Set(['www', 'api']);
  const schoolDomain = process.env.SCHOOL_DOMAIN;
  if (schoolDomain) {
    const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
    const domain = schoolDomain.toLowerCase();
    const suffix = `.${domain}`;
    if (host !== domain && host !== `www.${domain}` && host.endsWith(suffix)) {
      const slug = host.slice(0, -suffix.length);
      if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) && !slug.includes('.') && !SUBDOMAIN_RESERVED.has(slug)) {
        const url = request.nextUrl.clone();
        url.pathname = '/school.html';
        url.searchParams.set('slug', slug);
        const res = NextResponse.rewrite(url);
        res.headers.set('x-school-slug', slug);
        return res;
      }
    }
  }

  // Canonical school addresses: once SCHOOL_DOMAIN is set, a path address
  // on the apex domain (springdrill.com.ng/giftedhands) redirects to the
  // school's subdomain (giftedhands.springdrill.com.ng), so each school
  // has one address. Only fires on the apex/www host, so the vercel.app
  // address keeps working as a fallback, and only for real school slugs.
  if (schoolDomain) {
    const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
    const domain = schoolDomain.toLowerCase();
    if (host === domain || host === `www.${domain}`) {
      const apexParts = request.nextUrl.pathname.split('/').filter(Boolean);
      if (apexParts.length === 1) {
        const seg = apexParts[0].toLowerCase();
        if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(seg) && !seg.includes('.') && !RESERVED_SLUGS.has(seg)) {
          return NextResponse.redirect(new URL(`https://${seg}.${domain}/`), 308);
        }
      }
    }
  }

  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);

  // Two-segment school URLs (PR #59): once a school admin signs in
  // from the school front door, the login redirect sends them to
  // /<slug>/admin_dashboard.html, and the sidebar links are relative —
  // so the slug must survive navigation. A path with exactly two
  // segments, where the first is a valid school slug and the second is
  // a page file, is rewritten to that page, keeping the slug in the
  // browser bar. The query string is preserved. Placed here, after the
  // apex redirect and before the single-segment rewrite below; the
  // subdomain block, the apex redirect and the single-segment rewrite
  // are untouched.
  if (pathParts.length === 2) {
    const [seg, page] = pathParts;
    const slug = seg.toLowerCase();
    const isSlug = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)
      && !slug.includes('.')
      && !RESERVED_SLUGS.has(slug);
    if (isSlug && /^[a-z0-9_-]+\.html$/.test(page)) {
      const url = request.nextUrl.clone();
      url.pathname = '/' + page;
      return NextResponse.rewrite(url);
    }
  }

  // School path addresses (Phase 1, LIVE): each partner school gets a path
  // address on the current domain, e.g. /giftedhands — no custom domain,
  // no wildcard subdomains, no extra cost. The request is REWRITTEN (not
  // redirected) to /school.html?slug=<slug>, so the school keeps its clean
  // address in the browser bar. Only a single path segment with no dot is
  // treated as a slug, and reserved words (real routes and files) are never
  // rewritten. The subdomain block above is the Phase 3 switch and is
  // untouched.
  if (pathParts.length === 1) {
    const seg = pathParts[0].toLowerCase();
    const isSlug = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(seg)
      && !seg.includes('.')
      && !RESERVED_SLUGS.has(seg);
    if (isSlug) {
      const url = request.nextUrl.clone();
      url.pathname = '/school.html';
      url.searchParams.set('slug', seg);
      return NextResponse.rewrite(url);
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
