const EMILY_STUDENT_SERVICE =
  "https://script.google.com/macros/s/AKfycbztut1yKBakK7CgSRS0yMOkT9xLOiCN5vrBLlt9TcZSgYaNMTV8OOFqphIvPafdgTja/exec";

function responseHeaders(upstream) {
  const headers = new Headers();
  headers.set(
    "content-type",
    upstream.headers.get("content-type") || "application/json; charset=utf-8",
  );
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return headers;
}

async function relay(request) {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(EMILY_STUDENT_SERVICE);
  upstreamUrl.search = requestUrl.search;

  const options = {
    method: request.method,
    redirect: "follow",
    headers: {
      "content-type": request.headers.get("content-type") || "text/plain;charset=utf-8",
    },
  };

  if (request.method === "POST") {
    options.body = await request.text();
  }

  const upstream = await fetch(upstreamUrl.toString(), options);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders(upstream),
  });
}

export default async function onRequest(context) {
  const method = context.request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, POST" },
    });
  }

  try {
    return await relay(context.request);
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "The portal service is temporarily unavailable.",
      }),
      {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  }
}
