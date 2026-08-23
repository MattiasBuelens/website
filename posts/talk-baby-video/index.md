---
title: "Talk: Baby's first HTML5 <video> element"
date: 2024-12-30T16:00:00+01:00
---

At [Demuxed 2022](https://2022.demuxed.com/), I presented a talk about how I re-built the HTML5 `<video>` element using [Custom Elements] and [WebCodecs].
You can watch the talk below, and read along for (much) more details about why and how I built this crazy contraption.

<script>
import Video from "#lib/components/Video.svelte";
import Iframe from "#lib/components/Iframe.svelte";
import BaselineStatus from "#lib/components/BaselineStatus.svelte";
import Transcript from "./transcript.md";
</script>

## Watch the talk

<figure>

<Video
src="https://www.youtube.com/watch?v&equals;OBhlTcllq_E&list&equals;PLkyaYNWEKcOf98lZxnCcL6y7ZIVU3oSYO&index&equals;8"
title="Video of recording at Demuxed 2022"></Video>

<figcaption>

[Watch on YouTube](https://www.youtube.com/watch?v=OBhlTcllq_E&list=PLkyaYNWEKcOf98lZxnCcL6y7ZIVU3oSYO&index=8)

</figcaption>

</figure>

<figure>

<Iframe 
src="https://docs.google.com/presentation/d/e/2PACX-1vSypp6ODhxyzM0BqhXPNh3aGwk2nSbiasBqgHTuUC2Iy61B6qOegs0I7jKUJBPCZw/embed" 
title="Slides"></Iframe>

<figcaption>

[View on Google Slides](https://docs.google.com/presentation/d/1XK_Hwyt1fBHAqCRtlkocP5SsNjut4dKD/edit?usp=sharing&ouid=109623083800242291424&rtpof=true&sd=true)

</figcaption>

</figure>

<details>
<summary>Transcript</summary>
<Transcript />
</details>

## Motivation

For videos on the web, everything starts with the [HTML `<video>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video):

```html
<video controls src="https://example.com/video.mp4"></video>
```

This gives you a basic but fully functional player right inside your website or web app. Like so:

<!-- svelte-ignore a11y_media_has_caption -->
<video controls src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"></video>

This is fine for short, simple videos. However, when video is a core part of your website's experience,
you'll want more advanced features, such as:

- Serving the same video in multiple qualities, and having the player automatically select the best quality
  based on the user's device capabilities and internet connection.
- Serving live content such as a sports broadcast, a 24/7 news channel, or a gaming livestream.

These features are generally not natively supported by the `<video>` element.
That's where the [Media Source Extensions ("MSE") API][MSE] comes in: it allows JavaScript code to
load the media content (usually by `fetch()`ing it from your server) and then append the loaded content
as small "chunks" to the `<video>` element's buffer. This API forms the backbone of all major web-based
streaming video players, such as [hls.js], [dash.js], [Shaka Player] and [THEOplayer].

However, even the MSE API has its limitations:

- MSE lets you control how your media is _buffered_, but not how it is _played_.
  - There's no way to control when the `<video>` element should start playing.
    Most browsers will initiate playback after a couple of audio and video frames have been buffered and decoded,
    but the precise thresholds vary between browsers, leading to different startup times.
  - For live streams, it may sometimes be preferable to drop a couple of bad or missing frames, instead of stalling the player.
    However, right now, a JavaScript player can't easily detect or control that.
    Instead, it must handle this "after the fact", i.e. by trying to recover _after_ the `<video>` element starts stalling.
- MSE requires media samples to be carried inside a container format, such as fragmented MP4 (CMAF) or WebM.
  - When the source media uses a different format (e.g. [MPEG-TS]), the JavaScript player must first extract the media samples
    from their original container ("demux") and then put them back into a new container ("mux" or "remux").
    This second step is pure overhead, since MSE will immediately extract those samples out of the new container again.

That's why I wanted to experiment with building a video player that takes _full control_ over both buffering and playing
the media, _without_ using a `<video>` element or MSE. First of all, I wanted to better understand what the browser's
own `<video>` element is doing, by trying to replicate it myself in JavaScript. Also, I wanted to see what kind of choices
you can make inside the lower levels of a video player, choices over which you would usually not have control.
And of course, any new experiment is a great excuse to try out some fancy new web APIs. 😄

## Put the "element" in "video element"

Before we can decode a single frame, we need something to decode it _into_. The `<video>` element
is, first and foremost, an HTML element: it has attributes, it fires events, it can be styled with CSS,
and it slots into the page like any other tag. If we want our replacement to be a believable stand-in,
it should behave the same way.

Luckily, the web platform has had [Custom Elements] for a while now, which let you define your own
HTML tags backed by a JavaScript class. So the very first step is about as simple as it gets:

```js
class BabyVideoElement extends HTMLElement {
  // ...
}
customElements.define("baby-video", BabyVideoElement);
```

Inside, we drop in a `<canvas>` element to draw our decoded frames onto, since `<canvas>` is the
closest thing the platform gives us to "a rectangle I can paint pixels into myself". At this point,
`<baby-video>` doesn't do anything useful yet, but you can already drop it into a page and get back...
a black rectangle. The first baby steps of our `<baby-video>` element!

A video element without any controls isn't very useful, though. We could build a play button and a
seek bar by hand with plain HTML, CSS and JavaScript, but there's no need to: [Media Chrome] provides
a whole set of accessible, styleable UI components. If we make our `<baby-video>` look like a `<video>`
element and quack like a `<video>` element, then Media Chrome will treat it just like a `<video>`
element. Since `<baby-video>` is designed to be a drop-in replacement, we get a fully working play/pause
button and seek bar essentially for free, just by wrapping our element in a `<media-controller>` and
adding the components we want:

```html
<media-controller>
  <baby-video slot="media" src="..."></baby-video>
  <media-control-bar>
    <media-play-button></media-play-button>
    <media-time-range></media-time-range>
  </media-control-bar>
</media-controller>
```

Of course, none of these buttons do anything meaningful yet, because `<baby-video>` doesn't have any
video data to show, let alone the ability to decode and play it.

## WebCodecs to the rescue

So how do we actually render video data as pixels into our `<canvas>`? Until a few years ago, that would have been
(nearly) impossible _without_ a `<video>` element, although there are some exceptions.

For example, [VLC.js] is a port of VLC media player compiled to WebAssembly, and renders to `<canvas>` (for video)
and WebAudio (for audio). This is an amazing project and showcases the versatility of [their code](https://code.videolan.org/jbk/vlc.js).
However, since _everything_ is done in software, VLC.js can't take advantage of the hardware accelerated decoders that
are generally already available in CPUs and GPUs. Hardware decoding is essential to achieve smooth and
battery-efficient playback across all devices, and that's VLC.js is still more of an experiment rather than a
production-ready web-based streaming solution. [^1]

[^1]:
I'd love to be proven wrong about this! Perhaps in the future, VLC.js could integrate with WebCodecs to tap into
hardware accelerated decoding on the web, and become a viable option as a streaming solution on the web?

Fortunately, we now have the [WebCodecs] API. WebCodecs allows JavaScript to talk directly with audio and video decoders.
This means that you can build a JavaScript player with _full control_ over the precise time when each audio and video
frame should be decoded, when to render them, and what to do when frames are broken or missing.

Importantly, these are the _same_ decoders that the browser uses for its own video decoding needs, so they can also
be hardware accelerated! This is a game changer, since it's the first time we can directly tap into these on the web
from JavaScript, without going through a `<video>` element.

WebCodecs brings a lot of freedom but also a lot of responsibility. It's now up to the JavaScript player
to guarantee smooth playback and to deal with mishaps such as corrupted frames, broken frames, or frames that arrive
too late or just never arrive at all.

<BaselineStatus featureId="webcodecs"></BaselineStatus>

## Feeding it data

WebCodecs gives us decoders, but a decoder on its own doesn't know what to decode. We still need to
get the actual video data into our element, in a shape it understands. For a real `<video>` element,
you would use `appendBuffer()` on [MSE]'s `SourceBuffer`. So, just like we did for the `<video>` element
itself, we'll have to build our own version of the MSE API.

The video data itself typically arrives as fragmented MP4 (or CMAF), the same "chunks" that [hls.js],
[dash.js] and other players would download from an HLS or DASH manifest. Rather than writing an MP4
parser from scratch, I used [mp4box.js], a battle-tested JavaScript library that parses MP4's box structure.

A fragmented MP4 stream is generally made up of two kinds of pieces:

- An **initialization segment**, containing a `moov` box with track and codec information. We parse
  this once up front, and turn it into a `VideoDecoderConfig` object such that we can use it to configure
  a WebCodecs `VideoDecoder`.
- One or more **media segments**, each containing a `moof`/`mdat` pair with the actual encoded samples.
  We turn each sample into an `EncodedVideoChunk`, WebCodecs' equivalent of a single encoded frame, and
  store them inside our custom `SourceBuffer` class, keyed by their timestamp.

```js
const segment = await fetch(segmentUrl).then((res) => res.arrayBuffer());
babyVideo.appendBuffer(segment);
```

With that, we've rebuilt the core of MSE's `appendBuffer()`: we can turn incoming MP4 segments into a growing
list of `EncodedVideoChunk`s. Next up: actually decoding those chunks into frames and drawing those frames
onto the screen.

[Custom Elements]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
[Media Chrome]: https://www.media-chrome.org/
[WebCodecs]: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
[MSE]: https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API
[hls.js]: https://github.com/video-dev/hls.js
[dash.js]: https://dashjs.org/
[Shaka Player]: https://github.com/shaka-project/shaka-player
[THEOplayer]: https://www.theoplayer.com/
[MPEG-TS]: https://en.wikipedia.org/wiki/MPEG_transport_stream
[VLC.js]: https://videolabs.io/communication/vlcjs-demo/vlc.html
[mp4box.js]: https://github.com/gpac/mp4box.js/
