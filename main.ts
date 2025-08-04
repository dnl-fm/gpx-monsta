import { serveDir } from "jsr:@std/http/file-server";

const STATIC_FILES = [
  "index.html",
  "main.js", 
  "gpx-processor.js",
  "styles.css"
];

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'text/html; charset=utf-8';
    case 'js': return 'text/javascript; charset=utf-8';
    case 'css': return 'text/css; charset=utf-8';
    case 'json': return 'application/json';
    case 'ico': return 'image/x-icon';
    default: return 'text/plain; charset=utf-8';
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let pathname = url.pathname;
  
  // Handle root path
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Remove leading slash
  const filePath = pathname.slice(1);
  
  // Security: Only serve allowed static files
  if (!STATIC_FILES.includes(filePath)) {
    // For SPA routing, serve index.html for unknown paths
    if (!filePath.includes('.')) {
      pathname = '/index.html';
    } else {
      return new Response('Not Found', { status: 404 });
    }
  }
  
  try {
    // Use serveDir for actual file serving
    const response = await serveDir(req, {
      fsRoot: ".",
      urlRoot: "",
    });
    
    // Add custom headers
    response.headers.set('Content-Type', getMimeType(pathname));
    response.headers.set('Cache-Control', 'public, max-age=3600');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    
    return response;
  } catch (error) {
    console.error('Error serving file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

const port = parseInt(Deno.env.get?.("PORT") || "8000");

console.log(`GPX Monster server starting on port ${port}`);
console.log(`Environment: ${Deno.env.get?.("DENO_DEPLOYMENT_ID") ? 'Deno Deploy' : 'Local'}`);

Deno.serve({ port }, handler);