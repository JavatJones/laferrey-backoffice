import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

const SIGN_IN_PATH = '/auth'

const CACHE_HEADERS = ['cache-control', 'expires', 'pragma']

// Una redirección debe llevar las cookies refrescadas y los encabezados que evitan
// que un CDN guarde la respuesta; si no, la sesión se pierde en la siguiente solicitud.
const redirectWithSession = (url: URL, sessionResponse: NextResponse) => {
  const response = NextResponse.redirect(url)
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  for (const header of CACHE_HEADERS) {
    const value = sessionResponse.headers.get(header)
    if (value) response.headers.set(header, value)
  }
  return response
}

// Filtro optimista: refresca la sesión y redirige según haya o no sesión. La
// protección real está en el DAL (src/lib/auth/dal.ts) y en el RLS.
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value))
        },
      },
    }
  )

  // No pongas código entre createServerClient y getClaims(): getClaims() es lo que
  // refresca el token y mantiene la sesión.
  const { data } = await supabase.auth.getClaims()
  const isSignedIn = Boolean(data?.claims?.sub)

  const { pathname, search } = request.nextUrl
  const isSignInPage = pathname === SIGN_IN_PATH

  if (!isSignedIn && !isSignInPage) {
    const url = request.nextUrl.clone()
    url.pathname = SIGN_IN_PATH
    url.search = ''
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`)
    return redirectWithSession(url, supabaseResponse)
  }

  if (isSignedIn && isSignInPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return redirectWithSession(url, supabaseResponse)
  }

  return supabaseResponse
}
