'use strict';

const http = require('http');
const port = process.env.PORT || 8080;
const statusCode = process.env.STATUS || 301;
const url = require('url');
const Logr = require('logr');
const logrFlat = require('logr-flat');
const log = Logr.createLogger({
  reporters: {
    flat: {
      reporter: logrFlat,
      options: {
        timestamp: false,
        appColor: true
      }
    }
  }
});

let server;

module.exports.start = (redirect) => {
  log(['redirect', 'start'], `Port ${port} redirecting to ${redirect}`);
  server = http.createServer((req, res) => {
    const fullurl = url.resolve(redirect, req.url);
    res.writeHead(statusCode, {
      Location: fullurl
    });
    log(['redirect'], {
      from: `${req.headers.host}${req.url}`,
      to: fullurl,
      referral: req.headers.referer || ''
    });
    res.end();
  }).listen(port);
};

module.exports.stop = (done) => {
  server.close(() => {
    done();
  });
};

// if running as main file:
if (!module.parent) {
  const redirect = process.env.REDIRECT || process.argv.pop();
  if (!redirect) {
    throw new Error('must set REDIRECT env var or pass as a command-line argument');
  }
  module.exports.start(redirect);
  process.on('SIGTERM', () => {
    module.exports.stop(() => {
      process.exit(0);
    });
  });
}
