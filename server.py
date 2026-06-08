#!/usr/bin/env python3
"""Static file server + POST /audit endpoint that writes game logs to audit.log"""
import http.server, json, os, datetime

AUDIT_FILE = os.path.join(os.path.dirname(__file__), 'audit.log')

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/audit':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                with open(AUDIT_FILE, 'a') as f:
                    f.write(json.dumps(data) + '\n')
            except Exception as e:
                print(f'[audit error] {e}')
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, fmt, *args):
        # Suppress GET spam, only show POST
        if args and args[0].startswith('POST'):
            print(f'[{datetime.datetime.now().strftime("%H:%M:%S")}]', fmt % args)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    addr = ('', 3000)
    with http.server.ThreadingHTTPServer(addr, Handler) as srv:
        print('Merge Chaos server: http://localhost:3000')
        srv.serve_forever()
