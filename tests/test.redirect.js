'use strict';
const tap = require('tap');
const redirect = require('../index.js');
const wreck = require('wreck');

tap.test('redirects to the redirect location', (t) => {
  redirect.start({
    port: 8080,
    redirect: 'google.com'
  });
  wreck.get('http://localhost:8080/destination', (err, res, payload) => {
    t.equal(err, null, 'does not error when called');
    t.equal(res.statusCode, 301, 'returns HTTP 301');
    t.equal(res.headers.location, 'http://google.com/destination', 'returns correct location header');
    redirect.stop(t.end);
  });
});

tap.test('getRedirect redirects to https', (t) => {
  const redirection = redirect.getRedirect({ https: true }, { headers: { host: 'origin.com' }, url: '/destination' });
  t.equal(redirection, 'https://origin.com/destination', 'redirects to https');
  t.end();
});

tap.test('getRedirect strips "www."', (t) => {
  const redirection = redirect.getRedirect({ www: true }, { headers: { host: 'www.origin.com' }, url: '/destination' });
  t.equal(redirection, 'http://origin.com/destination', 'replaces the "www" portion');
  t.end();
});

tap.test('getRedirect strips "www." and https at the same time', (t) => {
  const redirection = redirect.getRedirect({ www: true, https: true }, { headers: { host: 'www.origin.com' }, url: '/destination' });
  t.equal(redirection, 'https://origin.com/destination', 'replaces the "www" portion and redirects to https');
  t.end();
});

tap.test('returns 400 Bad Request when redirect is www but host did not start with "www."', (t) => {
  redirect.start({ www: true, port: 8080 });
  wreck.get('http://localhost:8080/destination', (err, res, payload) => {
    t.equal(err.output.statusCode, 400, 'error is HTTP 400');
    redirect.stop(t.end);
  });
});
