'use strict';
const tap = require('tap');
const redirect = require('../index.js');
const wreck = require('wreck');

tap.test('options.path redirects to the specified path', async(t) => {
  redirect.start({
    port: 8080,
    path: 'destination'
  });
  const result = await wreck.get('http://localhost:8080/');
  t.equal(result.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result.res.headers.location, 'http://localhost:8080/destination', 'returns correct location header');
  const result2 = await wreck.get('http://localhost:8080/path');
  t.equal(result2.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result2.res.headers.location, 'http://localhost:8080/destination', 'returns correct location header');
  redirect.stop(t.end);
});

tap.test('options.path will preserve path if not set', async(t) => {
  redirect.start({
    port: 8080
  });
  const result = await wreck.get('http://localhost:8080/destination');
  t.equal(result.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result.res.headers.location, 'http://localhost:8080/destination', 'returns correct location header');
  const result2 = await wreck.get('http://localhost:8080/path');
  t.equal(result2.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result2.res.headers.location, 'http://localhost:8080/path', 'returns correct location header');
  redirect.stop(t.end);
});

tap.test('options.host redirects to the specified host', async(t) => {
  redirect.start({
    port: 8080,
    host: 'google.com'
  });
  const result = await wreck.get('http://localhost:8080/destination');
  t.equal(result.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result.res.headers.location, 'http://google.com/destination', 'returns correct location header');
  const result2 = await wreck.get('http://localhost:8080/path');
  t.equal(result2.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result2.res.headers.location, 'http://google.com/path', 'returns correct location header');
  redirect.stop(t.end);
});

tap.test('options.host will preserve host if not set', async(t) => {
  redirect.start({
    port: 8080
  });
  const result = await wreck.get('http://localhost:8080/destination');
  t.equal(result.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result.res.headers.location, 'http://localhost:8080/destination', 'returns correct location header');
  const result2 = await wreck.get('http://localhost:8080/path');
  t.equal(result2.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result2.res.headers.location, 'http://localhost:8080/path', 'returns correct location header');
  redirect.stop(t.end);
});

tap.test('options.pathPrefix appends to the begining of the path', async(t) => {
  redirect.start({
    port: 8080,
    pathPrefix: 'prefix'
  });
  const result = await wreck.get('http://localhost:8080/');
  t.equal(result.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result.res.headers.location, 'http://localhost:8080/prefix/', 'returns correct location header');
  const result2 = await wreck.get('http://localhost:8080/path');
  t.equal(result2.res.statusCode, 301, 'returns HTTP 301');
  t.equal(result2.res.headers.location, 'http://localhost:8080/prefix/path', 'returns correct location header');
  redirect.stop(t.end);
});

tap.test('options.stripSubdomain errors if host is set', (t) => {
  try {
    redirect.start({
      port: 8080,
      host: 'host',
      stripSubdomain: 'www'
    });
  } catch (e) {
    return t.end();
  }
  t.fail();
});

tap.test('options.stripSubdomain will remove sub-domain', (t) => {
  const redirection = redirect.getRedirect({
    stripSubdomain: 'www'
  }, {
    headers: { host: 'www.origin.com' },
    url: '/destination'
  });
  t.equal(redirection, 'http://origin.com/destination');
  t.end();
});

tap.test('options.https', (t) => {
  const redirection = redirect.getRedirect({
    https: true
  }, {
    headers: { host: 'https://origin.com' },
    url: '/destination'
  });
  t.equal(redirection, 'https://origin.com/destination');
  t.end();
});

tap.test('complex example', (t) => {
  const redirection = redirect.getRedirect({
    stripSubdomain: 'www',
    https: true,
    pathPrefix: '/circles',
  }, {
    headers: { host: 'http://www.google.com' },
    url: '/test'
  });
  t.equal(redirection, 'https://google.com/circles/test');
  t.end();
});

tap.test('complex example params', (t) => {
  const redirection = redirect.getRedirect({
    stripSubdomain: 'www',
    https: true,
    pathPrefix: '/circles',
    query: 'mux=1&tux=forge'
  }, {
    headers: { host: 'http://www.google.com' },
    url: '/test'
  });
  t.equal(redirection, 'https://google.com/circles/test?mux=1&tux=forge');
  t.end();
});


tap.test('/robots.txt will return empty', async(t) => {
  redirect.start({
    port: 8080,
    path: 'destination'
  });
  const { res, payload } = await wreck.get('http://localhost:8080/robots.txt');
  t.equal(res.statusCode, 200, 'returns HTTP OK');
  t.equal(payload.toString(), '', 'returns empty robots.txt');
  redirect.stop(t.end);
});
