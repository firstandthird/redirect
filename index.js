'use strict';

const http = require('http');
const port = process.env.PORT || 8080;
const redirect = process.env.REDIRECT || process.argv.pop();
const statusCode = process.env.STATUS || 301;
const verbose = process.env.VERBOSE;
const url = require('url');

if (!redirect) {
  throw new Error('must set REDIRECT env var');
}

console.log(`Redirecting to ${redirect} with status code ${statusCode}`);

const server = http.createServer((req, res) => {
  const fullurl = url.resolve(redirect, req.url);
  res.writeHead(statusCode, {
    'Location': fullurl
  });
  res.end();
  if (verbose) {
    console.log(`Host: ${req.headers.host} Referrer: ${req.headers.referer || ''}`);
  }
}).listen(port);

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
