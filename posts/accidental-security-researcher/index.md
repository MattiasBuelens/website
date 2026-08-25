---
title: 'How I accidentally became a security researcher'
date: 2026-08-25T00:00:00+02:00
---

Working on web standards often means thinking about tons of different edge cases how the new standard might be used, and writing tests to cover all those cases. When one of those tests fails in a particular browser, things get interesting: is the standard wrong, or the browser's implementation of it? And what's the potential impact of one missing check?

In this blog post, I'll break down how toying around with a new feature shipped in Google Chrome in early 2021 eventually led to finding a security vulnerability and getting my first CVE ([CVE-2021-21148](https://nvd.nist.gov/vuln/detail/cve-2021-21148)).

> This write-up is long overdue.
> Usually, security vulnerabilities are disclosed 90 days after they are reported.
> This bug is now over 2000 days old... Sorry for keeping you waiting! 😅

## Toying around with readable byte streams

In January 2021, as part of my ongoing work on [the Streams standard](https://streams.spec.whatwg.org/), I was testing Chrome's brand-new implementation of readable byte streams.
[They had just shipped this feature as part of Chrome 89](https://chromestatus.com/feature/4535319661641728), making them the first browser to do so. As such, I was eager to toy around with it.

[Readable byte streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_byte_streams) are a specialized version of readable streams, where the stream's contents are raw bytes. You can read from such a stream using a regular default reader, receiving the bytes as separate `Uint8Array` chunks:

```js
const reader = stream.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) {
    break
  }
  console.log(value) // e.g. Uint8Array [ 1, 2, 3, 4 ]
}
```

However, a more efficient way is to use a ["bring-your-own-buffer" (BYOB) reader](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamBYOBReader). Instead of receiving each chunk of bytes as a freshly allocated `Uint8Array`, you can allocate your own buffer upfront and let the stream write the bytes directly into your buffer. This allows for "zero copy transfer": no extra buffers need to be allocated or deallocated to get the data from the stream to the reader.

```js
const reader = stream.getReader({ mode: 'byob' })
let buffer = new ArrayBuffer(1024)
while (true) {
  // Read the next bytes into `buffer`, overwriting any previously read bytes.
  const { done, value } = await reader.read(new Uint8Array(buffer))
  if (done) {
    break
  }
  // `value` is a view upon our original buffer, not a newly allocated buffer.
  console.log(value) // e.g. Uint8Array [ 1, 2, 3, 4 ]
  // `read(view)` transfers `buffer`, so grab the re-transferred buffer
  // from `value` for the next iteration.
  buffer = value.buffer
}
```

Note that ownership of the buffer you pass to `byobReader.read(view)` is _transferred_ to the stream. This prevents you from reading or modifying the buffer's contents while the stream is filling the buffer. This is intended to give the browser more freedom in how it implements the low-level I/O operations, without needing to worry about JavaScript code seeing uninitialized or partial results.

Once the `read(view)` promise resolves, the buffer is transferred back to you and the read bytes become available in the _returned_ view. Hence, if you want to re-use that same buffer for a subsequent `read(view)` call, you need to grab the `.buffer` from that returned view.

## Non-transferable buffers

Let's put on our tester's hat and look for edge cases in this API. What happens if you call `byobReader.read(view)` with a view _whose buffer cannot be transferred_?

One option is to use a [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer). These behave like regular `ArrayBuffer`s but can be shared across multiple threads, allowing multiple workers to read and write to them in parallel. Usually, these workers would use some sort of synchronization using [Atomics](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics)
to safely operate on the shared memory.

As specified, `SharedArrayBuffer`s cannot be transferred: no one thread can have exclusive ownership over such a buffer. Therefore, it cannot be passed in the transfer list of a `postMessage()` call:

```js
const buffer = new SharedArrayBuffer(4)
worker.postMessage(buffer, { transfer: [buffer] })
// > Uncaught DOMException: Failed to execute 'postMessage' on 'Worker':
//   SharedArrayBuffer can not be in transfer list.
```

For the same reason, they cannot be used for `byobReader.read(view)`:

```js
const readable = new ReadableStream({
  type: 'bytes',
  pull(c) {
    console.log('pull called')
  }
})
const reader = readable.getReader({ mode: 'byob' })

const buffer = new SharedArrayBuffer(4)
const { done, value } = await reader.read(new Uint8Array(buffer))
// > Uncaught TypeError: Failed to execute 'read' on 'ReadableStreamBYOBReader':
//   The provided ArrayBufferView value must not be shared.
```

So far so good. However, there's another, less commonly known option to create a non-transferable buffer.

A [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory) object holds raw bytes of memory that can be used by a WebAssembly instance. These have their `[[]]` internal slot set to `"WebAssembly.Memory"` (as per the [WASM JS API specification](https://webassembly.github.io/spec/js-api/#create-a-fixed-length-memory-buffer)), so they cannot be transferred by regular JavaScript code. Instead, they can only be transferred by calling [`WebAssembly.Memory.grow()`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory/grow) (through JavaScript) or by using the [`memory.grow` instruction](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/Memory/grow) (through WebAssembly).

Therefore, we should expect that calling `byobReader.read(view)` with a view backed by a `WebAssembly.Memory`'s buffer will throw an error:

```js
const readable = new ReadableStream({
  type: 'bytes',
  pull(c) {
    console.log('pull called')
  }
})
const reader = readable.getReader({ mode: 'byob' })

const memory = new WebAssembly.Memory({ initial: 1 })
const { done, value } = await reader.read(new Uint32Array(memory.buffer))
// > pull called
// > Uncaught (in promise) TypeError: Failed to execute 'read' on 'ReadableStreamBYOBReader':
//   not able to transfer array buffer
```

Yep, that makes sense, `read(view)` fails because it could not transfer the array buffer.

## Something is not right

...Hang on, why did `pull` get called in that last example? 🤨

In the case of `SharedArrayBuffer`, the `TypeError` is being thrown while validating the input of `read(view)`, _before_ the stream could process the read request. Hence, `pull` was not called.

However, it seems that with `WebAssembly.Memory`, the error is being thrown _after_ the read request started processing. Is it possible that the stream already added a new pull-into descriptor, and created a BYOB request for it?

```js
const readable = new ReadableStream({
  type: 'bytes',
  pull(c) {
    console.log('pull called')
    console.log('byobRequest exists?', c.byobRequest != null) // <<<
  }
})
const reader = readable.getReader({ mode: 'byob' })

const memory = new WebAssembly.Memory({ initial: 1 })
const { done, value } = await reader.read(new Uint32Array(memory.buffer))
```

![Chrome showing the Aw, Snap! crash page with error code STATUS_BREAKPOINT.](./aw-snap.png)

Uh-oh. 😨
