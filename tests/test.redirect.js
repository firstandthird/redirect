'use strict';
const tap = require('tap');
const redirect = require('../index.js');
const wreck = require('wreck');

tap.test('redirects to the redirect location if an http location was specified', async(t) => {
  redirect.start({
    port: 8080,
    redirect: 'http://google.com'
  });
  const { res } = await wreck.get('http://localhost:8080/destination');
  t.equal(res.statusCode, 301, 'returns HTTP 301');
  t.equal(res.headers.location, 'http://google.com/destination', 'returns correct location header');
  redirect.stop(t.end);
});

tap.test('redirects to the redirect location if an https location was specified', async(t) => {
  redirect.start({
    port: 8080,
    redirect: 'https://google.com'
  });
  const { res } = await wreck.get('http://localhost:8080/destination');
  t.equal(res.statusCode, 301, 'returns HTTP 301');
  t.equal(res.headers.location, 'https://google.com/destination', 'returns correct location header');
  redirect.stop(t.end);
});

tap.test('default is to redirect to the http location if no protocol was specified', async(t) => {
  redirect.start({
    port: 8080,
    redirect: 'google.com'
  });
  const { res } = await wreck.get('http://localhost:8080/destination');
  t.equal(res.statusCode, 301, 'returns HTTP 301');
  t.equal(res.headers.location, 'http://google.com/destination', 'returns correct location header');
  redirect.stop(t.end);
});

tap.test('getRedirect automatically redirects to https when specified', (t) => {
  const redirection = redirect.getRedirect({ https: true }, { headers: { host: 'origin.com' }, url: '/destination' });
  t.equal(redirection, 'https://origin.com/destination', 'redirects to https');
  t.end();
});

tap.test('getRedirect strips "www." when specified', (t) => {
  const redirection = redirect.getRedirect({ 'remove-www': true }, { headers: { host: 'www.origin.com' }, url: '/destination' });
  t.equal(redirection, 'http://origin.com/destination', 'replaces the "www" portion');
  t.end();
});

tap.test('getRedirect strips "www." and routes to https at the same time', (t) => {
  const redirection = redirect.getRedirect({ 'remove-www': true, https: true }, { headers: { host: 'www.origin.com' }, url: '/destination' });
  t.equal(redirection, 'https://origin.com/destination', 'replaces the "www" portion and redirects to https');
  t.end();
});

tap.test('returns 400 Bad Request when redirect is www but host did not start with "www."', async (t) => {
  redirect.start({ 'remove-www': true, port: 8080 });
  try {
    await wreck.get('http://localhost:8080/destination');
  } catch (err) {
    t.equal(err.output.statusCode, 400, 'error is HTTP 400');
    redirect.stop(t.end);
  }
});

tap.test('...but if both --remove-www and --https are set, it does not error if the incoming address does not start with "www."', (t) => {
  const redirection = redirect.getRedirect({ 'remove-www': true, https: true }, { headers: { host: 'origin.com' }, url: '/destination' });
  t.equal(redirection, 'https://origin.com/destination', 'redirects to https');
  t.end();
});
