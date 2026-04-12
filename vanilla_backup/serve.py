import http.server
import socketserver

PORT = 3000

# Fix the MIME type issue on Windows where .js files are sometimes served as text/plain
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
})

# Allow reusing the address to avoid "Address already in use" errors
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT} with fixed JS MIME types...")
    print(f"Go to: http://localhost:{PORT}")
    httpd.serve_forever()
