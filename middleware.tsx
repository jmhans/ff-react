//import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge"

//export default withMiddlewareAuthRequired();




import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth0 } from "./app/lib/auth0"; // Adjust path if your auth0 client is elsewhere

function hasRequiredAuth0Config() {
  return Boolean(
    process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_SECRET,
  );
}

export async function middleware(request: NextRequest) {
  if (!hasRequiredAuth0Config()) {
    return NextResponse.next();
  }

  try {
    return await auth0.middleware(request);
  } catch (error: any) {
    const message = String(error?.message || '');

    if (
      process.env.NODE_ENV !== 'production' &&
      (error?.name === 'DomainResolutionError' ||
        message.includes('Domain resolver threw an error'))
    ) {
      return NextResponse.next();
    }

    // If JWE is invalid, clear the session and redirect to auth
    if (message.includes('JWE') || message.includes('Invalid')) {
      const response = NextResponse.redirect(new URL('/auth/logout', request.url));
      // Clear Auth0 cookies
      response.cookies.delete('appSession');
      return response;
    }
    throw error;
  }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
  };