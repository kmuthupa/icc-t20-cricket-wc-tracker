const { ReadableStream } = require('node:stream/web');
const { fetch, Headers, Request, Response } = require('undici');

Object.defineProperty(global, 'ReadableStream', {
  value: ReadableStream,
});

Object.assign(global, { fetch, Headers, Request, Response });
