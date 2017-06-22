'use strict';

const argv = require('yargs')
.option('port', {
  default: process.env.PORT || 8080,
  describe: 'port to listen for'
})
.option('www', {
  default: false,
  describe: 'will strip "www." from start of redirect urls'
})
.option('https', {
  default: false,
  describe: 'will redirect to the https: version of requested url, cannot be used with redirect option'
})
.option('redirect', {
  default: false,
  describe: 'will redirect to the https: version of requested url, cannot be used with redirect option'
})
.argv;

if (argv._.length > 0) {
  argv.redirect = argv._[0];
}
const http = require('http');
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
module.exports.getRedirect = (args, req) => {
  let fullurl;
  let protocol = 'http';
  if (args.https) {
    protocol = 'https';
  }
  fullurl = url.format({
    protocol,
    host: args.redirect || req.headers.host,
    pathname: req.url
  });
  if (args.www) {
    if (!fullurl.startsWith(`${protocol}://www`)) {
      log(['redirect', 'error'], `${fullurl} does not start with "www"`);
      return undefined;
    }
    fullurl = fullurl.replace('www.', '');
  }
  return fullurl;
};

module.exports.start = (args) => {
  if (args.redirect && args.https) {
    throw new Error('Cannot use "https" option if you specify a redirect address');
  }
  log(['redirect', 'start'], `Port ${args.port} redirecting to ${args.redirect}`);
  server = http.createServer((req, res) => {
    const fullurl = module.exports.getRedirect(args, req);
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
        redirect: args.redirect,
        from: `${req.headers.host}${req.url}`,
        referral: req.headers.referer || ''
      });
    }
    res.end();
  }).listen(args.port);
};

module.exports.stop = (done) => {
  server.close(() => {
    done();
  });
};

// if running as main file:
if (!module.parent) {
  module.exports.start(argv);
  process.on('SIGTERM', () => {
    module.exports.stop(() => {
      process.exit(0);
    });
  });
}
