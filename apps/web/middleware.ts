import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session-Refresh pro Request: abgelaufene Auth-Tokens werden erneuert und
 * sowohl an Server Components (request.cookies) als auch an den Browser
 * (response.cookies) weitergereicht. Keine Redirects – die App ist auch
 * anonym nutzbar, Login ist nur für Cloud-Profile nötig.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verifiziert die Signatur und stösst bei Bedarf den Token-Refresh an.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Statische Assets auslassen; API-Routen brauchen kein Cookie-Refresh.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
