import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "king_admin_deploy";

function isDeployPath(pathname: string): boolean {
  return (
    pathname === "/deploy" ||
    pathname.startsWith("/deploy/") ||
    pathname === "/deploy-vault" ||
    pathname.startsWith("/deploy-vault/")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/smart-money" ||
    pathname.startsWith("/smart-money/") ||
    pathname === "/whales" ||
    pathname.startsWith("/whales/")
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isDeployPath(pathname)) return NextResponse.next();

  const secret = process.env.ADMIN_DEPLOY_SECRET || "";
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Not found", { status: 404 });
    }
    return NextResponse.next();
  }

  const key = req.nextUrl.searchParams.get("key");
  const cookie = req.cookies.get(COOKIE)?.value;
  if (key === secret || cookie === secret) {
    const res = NextResponse.next();
    if (key === secret) {
      res.cookies.set(COOKIE, secret, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return res;
  }

  return new NextResponse("Not found", { status: 404 });
}

export const config = {
  matcher: [
    "/deploy",
    "/deploy/:path*",
    "/deploy-vault",
    "/deploy-vault/:path*",
    "/smart-money",
    "/smart-money/:path*",
    "/whales",
    "/whales/:path*",
  ],
};
