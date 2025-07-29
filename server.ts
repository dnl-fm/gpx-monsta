import { serveDir } from "jsr:@std/http/file-server";

Deno.serve({ port: 8000 }, (req) => {
  return serveDir(req, {
    fsRoot: ".",
    urlRoot: "",
  });
});

console.log("GPX Monster server running at http://localhost:8000");