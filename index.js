const http = require('http');
const url = require('url');
const lograll = require('logr-all');
const urlJoin = require('url-join');

const log = lograll({});

const argv = require('yargs')
  .option('port', {
    default: process.env.PORT || 8080,
    describe: 'port to listen for'
  })
  .option('statusCode', {
    default: process.env.STATUS_CODE || 301,
    describe: 'status code to return'
  })
  .option('host', {
    default: process.env.DOMAIN,
    describe: 'host to redirect to'
  })
  .option('path', {
    default: process.env.URL_PATH,
    describe: 'path to redirect to'
  })
  .option('query', {
    default: process.env.URL_QUERY,
    describe: 'url query params to add on redirect'
  })
  .option('pathPrefix', {
    default: process.env.PATH_PREFIX,
    describe: 'path segment appended to the beginning of each path'
  })
  .option('stripSubdomain', {
    describe: 'will remove the indicated subdomain (eg "www")',
    default: process.env.STRIP_SUBDOMAIN
  })
  .option('https', {
    default: process.env.HTTPS || false,
    describe: 'will replace http with https when true'
  })
  .help()
  .argv;

let server;
// resolves a redirect directive and request object into a forwarding address
// or returns falsey if unable to resolve
module.exports.getRedirect = (args, req) => {
  let redirect = req.headers.host;
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
  if (args.pathPrefix) {
    fullurl.pathname = urlJoin(args.pathPrefix, fullurl.pathname);
  }
  if (args.stripSubdomain) {
    fullurl.host = fullurl.host.replace(`${args.stripSubdomain}.`, '');
  }
  if (args.https) {
    fullurl.protocol = 'https';
  }
  if (args.query) {
    fullurl.query = args.query;
    fullurl.path = `${fullurl.path}?${args.query}`;
    fullurl.search = `?${args.query}`;
  }
  // return as a single formatted url string
  return url.format(fullurl);
};

module.exports.start = (args) => {
  if (args.host && args.stripSubdomain) {
    throw new Error('Cannot use both "host" and "stripSubdomain" together');
  }
  log(['redirect', 'start'], `Listening to port ${args.port}`);
  log(['redirect', 'start'], {
    host: args.host,
    path: args.path,
    pathPrefix: args.pathPrefix,
    statusCode: args.statusCode,
    https: args.https,
    stripSubdomain: args.stripSubdomain
  });
  server = http.createServer((req, res) => {
    // no robots here:
    if (req.url === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('');
    }
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
