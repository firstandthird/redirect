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
// resolves a redirect directive and request object into a forwarding address
// or returns falsey if unable to resolve
module.exports.getRedirect = (redirect, req) => {
  let fullurl;
  switch (redirect) {
    /// www attempts to remove the 'www.' portion at the start of a url:
    case 'www':
      fullurl = url.format({
        protocol: 'http',
        host: req.headers.host,
        pathname: req.url
      });
      if (!fullurl.startsWith('http://www')) {
        log(['redirect', 'error'], `${fullurl} does not start with "www"`);
        return undefined;
      }
      return fullurl.replace('www.', '');
    // https attempts to redirect to the https version of the requested host
    case 'https':
      return url.format({
        protocol: 'https',
        host: req.headers.host,
        pathname: req.url
      });
    // otherwise just redirect to the specified redirect host:
    default:
      return url.resolve(redirect, req.url);
  }
};

module.exports.start = (redirect) => {
  log(['redirect', 'start'], `Port ${port} redirecting to ${redirect}`);
  server = http.createServer((req, res) => {
    const fullurl = module.exports.getRedirect(redirect, req);
    // write the redirect header and log that we're redirecting
    if (fullurl) {
      res.writeHead(statusCode, {
        Location: fullurl
      });
      log(['redirect'], {
        from: `${req.headers.host}${req.url}`,
        to: fullurl,
        referral: req.headers.referer || ''
      });
    } else {
      // otherwise it's a Bad Request error:
      res.writeHead(400, {});
      log(['redirect', 'error'], {
        message: 'could not process redirect',
        redirect,
        from: `${req.headers.host}${req.url}`,
        referral: req.headers.referer || ''
      });
    }
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
