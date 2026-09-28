import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_HOST = "app.me2ulend.online";
const LANDING_HOST = "www.me2ulend.online";
const ROOT_HOST = "me2ulend.online";
const INDEXABLE_APP_PREFIXES = ["/legal", "/support"];

function isIndexableAppPath(pathname: string) {
  return INDEXABLE_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  if (process.env.RAILWAY_ENVIRONMENT_NAME === "staging") {
    const stagingPassword = process.env.STAGING_BASIC_AUTH?.trim();
    if (!stagingPassword) {
      return new NextResponse("Staging access is not configured.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const expectedAuthorization = `Basic ${btoa(`me2u-staging:${stagingPassword}`)}`;
    if (
      request.headers.get("authorization") !== expectedAuthorization &&
      request.headers.get("x-staging-access") !== stagingPassword
    ) {
      return new NextResponse("Authentication required.", {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "WWW-Authenticate": 'Basic realm="Me2U staging", charset="UTF-8"',
        },
      });
    }
  }

  const hostname = request.nextUrl.hostname.toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (hostname === ROOT_HOST) {
    const url = request.nextUrl.clone();
    url.hostname = pathname === "/" ? LANDING_HOST : APP_HOST;
    return NextResponse.redirect(url, 308);
  }

  if (hostname === LANDING_HOST && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.hostname = APP_HOST;
    return NextResponse.redirect(url, 308);
  }

  if (hostname === APP_HOST && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url, 307);
  }

  if (hostname === APP_HOST && pathname === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    return NextResponse.redirect(url, 307);
  }

  const response = NextResponse.next();
  if (hostname === APP_HOST && !isIndexableAppPath(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
