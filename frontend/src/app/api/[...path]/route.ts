import { cookies } from "next/headers";

const SESSION_COOKIE = "leadflow_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60;
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handleRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const routePath = path.join("/");
  const method = request.method.toUpperCase();
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api",
  };

  if (
    !["GET", "HEAD"].includes(method) &&
    request.headers.get("origin") !== requestUrl.origin
  ) {
    return Response.json({ detail: "Invalid request origin" }, { status: 403 });
  }

  if (routePath === "auth/logout") {
    if (method !== "POST") {
      return Response.json({ detail: "Method not allowed" }, { status: 405 });
    }

    cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return Response.json({ authenticated: false }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (path[0] !== "v1") {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }

  if (!(METHODS as readonly string[]).includes(method)) {
    return Response.json({ detail: "Method not allowed" }, { status: 405 });
  }

  const isLogin = routePath === "v1/auth/login" && method === "POST";
  const isPublicRegistration = routePath === "v1/auth/register" && method === "POST";
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!isLogin && !isPublicRegistration && !sessionToken) {
    return Response.json({ detail: "Authentication required" }, { status: 401 });
  }

  const backendBaseUrl =
    process.env.BACKEND_API_URL ??
    (process.env.BACKEND_API_HOSTPORT
      ? `http://${process.env.BACKEND_API_HOSTPORT}`
      : undefined);
  if (!backendBaseUrl) {
    return Response.json(
      { detail: "Backend não configurado" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const backendUrl = new URL(backendBaseUrl);
    const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    const accept = request.headers.get("accept");

    if (contentType) headers.set("Content-Type", contentType);
    if (accept) headers.set("Accept", accept);
    if (sessionToken && !isLogin && !isPublicRegistration) {
      headers.set("Authorization", `Bearer ${sessionToken}`);
    }

    const upstream = await fetch(
      new URL(`/api/${encodedPath}${requestUrl.search}`, backendUrl),
      {
        method,
        headers,
        body: ["GET", "HEAD"].includes(method) ? undefined : await request.arrayBuffer(),
        cache: "no-store",
        signal: request.signal,
      },
    );

    if (isLogin) {
      if (!upstream.ok) {
        cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
      } else {
        const loginData = (await upstream.json()) as { access_token?: string };
        if (!loginData.access_token) {
          return Response.json(
            { detail: "Invalid login response" },
            { status: 502, headers: { "Cache-Control": "no-store" } },
          );
        }

        cookieStore.set(SESSION_COOKIE, loginData.access_token, {
          ...cookieOptions,
          maxAge: SESSION_MAX_AGE_SECONDS,
        });
        return Response.json(
          { authenticated: true },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    if (upstream.status === 401 && !isPublicRegistration) {
      cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    }

    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("Content-Type", upstreamContentType);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "Backend indisponível" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return handleRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleRequest(request, context);
}
