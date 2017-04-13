'use strict';

const http = require('http');
const port = process.env.PORT || 8080;
const redirect = process.env.REDIRECT || process.argv.pop();
const statusCode = process.env.STATUS || 301;
const verbose = process.env.VERBOSE;
const url = require('url');
const Logr = require('logr');
const logrFlat = require('logr-flat');
const log = Logr.createLogger({
  type: 'flat',
  reporters: {
    flat: {
      reporter: logrFlat
    }
  }
});

if (!redirect) {
  throw new Error('must set REDIRECT env var');
}
const server = http.createServer((req, res) => {
  const fullurl = url.resolve(redirect, req.url);
  res.writeHead(statusCode, {
    Location: fullurl
  });
  if (verbose) {
    log({
      from: `${req.headers.host}${req.url}`,
      to: fullurl,
      referral: req.headers.referer || ''
    });
  }
  res.end();
}).listen(port);
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
