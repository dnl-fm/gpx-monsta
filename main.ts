import { serveDir } from "jsr:@std/http/file-server";

const STATIC_FILES = [
  "index.html",
  "main.js", 
  "gpx-processor.js",
  "styles.css",
  "assets/maplibre-gl-5.6.1.js",
  "assets/maplibre-gl-5.6.1.css"
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
    // Check if client accepts gzip and we have a compressed version for MapLibre files
    const acceptsGzip = req.headers.get('Accept-Encoding')?.includes('gzip');
    let actualFilePath = filePath;
    let isCompressed = false;
    
    if (acceptsGzip && (filePath === 'assets/maplibre-gl-5.6.1.js' || filePath === 'assets/maplibre-gl-5.6.1.css')) {
      const compressedPath = `${filePath}.gz`;
      try {
        await Deno.stat(compressedPath);
        actualFilePath = compressedPath;
        isCompressed = true;
      } catch {
        // Compressed file doesn't exist, use original
      }
    }
    
    // Read file directly for MapLibre files to handle compression
    if (filePath === 'assets/maplibre-gl-5.6.1.js' || filePath === 'assets/maplibre-gl-5.6.1.css') {
      const fileContent = await Deno.readFile(actualFilePath);
      const headers = new Headers();
      headers.set('Content-Type', getMimeType(filePath));
      headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year for static assets
      
      if (isCompressed) {
        headers.set('Content-Encoding', 'gzip');
      }
      
      return new Response(fileContent, { headers });
    }
    
    // Use serveDir for other files
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