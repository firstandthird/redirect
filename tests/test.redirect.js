'use strict';
const tap = require('tap');
const redirect = require('../index.js');
const wreck = require('wreck');

tap.afterEach((done) => {
  redirect.stop(done);
});

tap.test('test redirect here', (t) => {
  redirect.start('http://google.com');
  wreck.get('http://localhost:8080/destination', (err, res, payload) => {
    t.equal(err, null, 'does not error when called');
    t.equal(res.statusCode, 301, 'returns HTTP 301');
    t.equal(res.headers.location, 'http://google.com/destination', 'returns correct location header');
    t.end();
  });
});
