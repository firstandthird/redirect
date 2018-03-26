const http = require('http');
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

const argv = require('yargs')
.option('host', {
  default: undefined,
  describe: 'host to redirect to'
})
.option('path', {
  default: undefined,
  describe: 'path to redirect to'
})
.option('port', {
  default: process.env.PORT || 8080,
  describe: 'port to listen for'
})
.option('statusCode', {
  default: process.env.STATUS || 301,
  describe: 'status code to return'
})
.help()
.env()
.argv;

if (argv._.length > 0) {
  argv.redirect = argv._[0];
}

let server;
// resolves a redirect directive and request object into a forwarding address
// or returns falsey if unable to resolve
module.exports.getRedirect = (args, req) => {
  let redirect = (args.redirect) ? args.redirect : req.headers.host;
  // if there was no protocol explicitly specified with the redirect then default to http:
  if (!redirect.startsWith('http://') && !redirect.startsWith('https://')) {
    redirect = `http://${redirect}`;
  }
  const fullurl = url.parse(redirect);
  // the path that we're redirecting to will be in the incoming request itself:
  // if path is not just '/' then be sure to preserve it:
  fullurl.pathname = fullurl.path !== '/' ? `${fullurl.path}${req.url}` : req.url;
  if (args.host) {
    fullurl.host = args.host;
  }
  if (args.path) {
    fullurl.pathname = args.path;
  }
  // return as a single formatted url string:
  return url.format(fullurl);
};

module.exports.start = (args) => {
  log(['redirect', 'start'], `Listening to port ${args.port}`);
  if (args.redirect) {
    log(['redirect', 'start'], `Will redirect to ${args.redirect}`);
  }
  if (args['remove-www']) {
    log(['redirect', 'start'], 'Will strip "www." portion before redirecting');
  }
  if (args.https) {
    log(['redirect', 'start'], 'Will redirect to the "https" version of the incoming address');
  }
  server = http.createServer((req, res) => {
    const fullurl = module.exports.getRedirect(args, req);
    // write the redirect header and log that we're redirecting
    if (fullurl) {
      res.writeHead(argv.statusCode, {
        Location: fullurl
      });
      log(['redirect'], {
        from: `${req.headers.host}${req.url}`,
        to: fullurl,
        referral: req.headers.referer || '',
        userAgent: req.headers['user-agent'] || 'Not specified',
        ip: req.info ? req.info.remoteAddress : 'Not Specified',
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
