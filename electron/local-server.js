const fs = require('fs');
const http = require('http');
const path = require('path');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.html': 'text/html; charset=utf-8',
  '.woff2': 'font/woff2',
};

const serveFile = (filePath, response) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';
  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'Content-Type': contentType });
    response.end(buffer);
  });
};

const proxyApiRequest = (request, response, backendPort) => {
  const proxyRequest = http.request(
    {
      hostname: '127.0.0.1',
      port: backendPort,
      path: request.url,
      method: request.method,
      headers: request.headers,
    },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode || 500, proxyResponse.headers);
      proxyResponse.pipe(response, { end: true });
    },
  );

  proxyRequest.on('error', (error) => {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'Backend unavailable', error: error.message }));
  });

  request.pipe(proxyRequest, { end: true });
};

const startLocalServer = ({ rootDir, port = 3001, backendPort = 3000, logger = console }) =>
  new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const requestUrl = request.url || '/';

      if (requestUrl.startsWith('/api')) {
        proxyApiRequest(request, response, backendPort);
        return;
      }

      const normalizedPath = requestUrl === '/' ? '/index.html' : requestUrl;
      const cleanPath = normalizedPath.split('?')[0];
      const candidate = path.join(rootDir, cleanPath.replace(/^\//, ''));
      const indexFile = path.join(rootDir, 'index.html');

      fs.stat(candidate, (error, stats) => {
        if (!error && stats.isFile()) {
          serveFile(candidate, response);
          return;
        }

        serveFile(indexFile, response);
      });
    });

    server.listen(port, '127.0.0.1', () => {
      logger.info(`Frontend server listening on http://127.0.0.1:${port}`);
      resolve({
        close: () =>
          new Promise((resolveClose, rejectClose) => {
            server.close((error) => {
              if (error) {
                rejectClose(error);
                return;
              }
              resolveClose();
            });
          }),
      });
    });
  });

module.exports = { startLocalServer };
