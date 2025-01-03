---
title: "Talk: Baby's first HTML5 <video> element"
date: 2024-12-30T16:00:00+01:00
---

At Demuxed 2022, I presented a talk about how I re-built the HTML5 `<video>` element using [Custom Elements] and [WebCodecs].

<script>
import Video from "#lib/components/Video.svelte";
import Iframe from "#lib/components/Iframe.svelte";
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

## Motivation

For videos on the web, everything starts with the [HTML `<video>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video):

```html
<video controls src="https://example.com/video.mp4"></video>
```

This gives you a basic but fully functional media player right inside your website or web app:

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
    but the precise thresholds varies between browsers.
  - For live streams, it may sometimes be preferable to drop a couple of bad or missing frames, instead of stalling the player.
    However, right now, a JavaScript player can't easily detect or control that.
    Instead, it must handle this "after the fact", i.e. by trying to recover _after_ the `<video>` element starts stalling.
- MSE requires media samples to be carried inside a container format, such as fragmented MP4 or WebM.
  - When the source media uses a different format (e.g. [MPEG-TS]), the JavaScript player must first extract the media samples
    from their original container ("demux") and then put them back into a new container ("mux" or "remux").
    This second step is pure overhead, since MSE will immediately extract those samples out of the new container again.

This is where [WebCodecs] comes in. WebCodecs allows JavaScript to talk directly with audio and video decoders.
This means that you can build a JavaScript player with _full control_ over the precise time when each audio and video
frame should be decoded, when to render them, and what to do when frames are broken or missing.
This comes with a lot of freedom, but also a lot of responsibility, since it's now up to the JavaScript player
to guarantee smooth playback.

[Custom Elements]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
[WebCodecs]: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
[MSE]: https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API
[hls.js]: https://github.com/video-dev/hls.js
[dash.js]: https://dashjs.org/
[Shaka Player]: https://github.com/shaka-project/shaka-player
[THEOplayer]: https://www.theoplayer.com/
[MPEG-TS]: https://en.wikipedia.org/wiki/MPEG_transport_stream
