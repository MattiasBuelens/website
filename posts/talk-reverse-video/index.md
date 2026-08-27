---
title: "Talk: The curious player of Benjamin Button: reverse video on the web"
date: 2026-08-27T00:00:00+02:00
---

At [Demuxed 2023](https://2023.demuxed.com/), I presented a talk about how I extended [baby's first HTML5 `<video>` element](/post/talk-baby-video/) to support reverse playback.
You can watch the talk below, and read along for more details about why and how I built this.

<script>
import Video from "#lib/components/Video.svelte";
import Iframe from "#lib/components/Iframe.svelte";
import BaselineStatus from "#lib/components/BaselineStatus.svelte";
import Transcript from "./transcript.md";
import reversePlaybackSafari from "./reverse-playback-safari.mp4";
</script>

## Watch the talk

<figure>

<Video
src="https://www.youtube.com/watch?v&equals;0sYeEpR10sY&list&equals;PLkyaYNWEKcOesxC4VpHJtbjnzuN6r1NGg&index&equals;15"
title="Video of recording at Demuxed 2023"></Video>

<figcaption>

[Watch on YouTube](https://www.youtube.com/watch?v=0sYeEpR10sY&list=PLkyaYNWEKcOesxC4VpHJtbjnzuN6r1NGg&index=15)

</figcaption>

</figure>

<figure>

<Iframe 
src="https://docs.google.com/presentation/d/e/2PACX-1vQnFNJhcL1OuhcbqD4CV7_LHhcoZ-Utj3CoO6twTUvsN69lxAiMwqdUI4S2s27uA-yWwKbgVuipPWvW/pubembed?start=false&loop=false&delayms=3000" 
title="Slides"></Iframe>

<figcaption>

[View on Google Slides](https://docs.google.com/presentation/d/e/2PACX-1vQnFNJhcL1OuhcbqD4CV7_LHhcoZ-Utj3CoO6twTUvsN69lxAiMwqdUI4S2s27uA-yWwKbgVuipPWvW/pub?start=false&loop=false&delayms=3000)

</figcaption>

</figure>

<details>
<summary>Transcript</summary>
<Transcript />
</details>

## Motivation

Video on the web only ever goes one way: forward. Press play, and time marches on. Why would you ever
need it to go the other way?

Turns out there's a few good reasons:

- **Video editing.** Finding the exact frame where a cut or a transition happens is a lot easier if you
  can nudge backwards and forwards around that point, instead of repeatedly seeking to guess where you
  landed.
- **Video-assisted refereeing.** Scrub through a replay to find the exact frame where an attacker's boot
  touches the ball, so you can freeze it and draw an imaginary line across the pitch. (I have no idea how
  the offside rule actually works, but I'm told this is roughly it.)
- **Funny GIFs.** Two guinea pigs eating a blade of grass, backwards, so that it grows a green tongue
  right back into their mouths. Objectively funnier this way, and quite possibly why the internet exists.

<figure>

![Two guinea pigs chewing, played in reverse so a blade of grass appears to grow back into their mouths.](./guinea-pigs.gif)

<figcaption>

Peak internet content, now available in reverse.

</figcaption>

</figure>

## Isn't this already possible?

Surely someone thought of this already. And indeed, [MDN's docs on `playbackRate`][playbackRate] say
exactly what we want to hear:

> A negative `playbackRate` value indicates that the media should be played backwards, but support for
> this is not yet widespread.

So how not-widespread are we talking?

<figure>

![MDN browser compatibility table for negative playbackRate, with Chrome's cell expanded to show a note that setting a negative playbackRate throws an error.](./browser-compat-chrome.png)

<figcaption>

Negative `playbackRate` is flagged "Experimental. Expect behavior to change in the future." Chrome's
cell doesn't just say "No": clicking it reveals that setting `playbackRate` to a negative value doesn't
get silently ignored, it throws an error outright.

</figcaption>

</figure>

And it's not just Chrome. Outside of Safari and its iOS/WebView cousins, it's a wall of red "No": Edge,
Firefox, Opera, and all of their Android counterparts included.

Fine, that's most of them. But Safari's column is a green checkmark, "full support." Surely that one
works?

<figure>

![MDN browser compatibility table for negative playbackRate, with Safari's cell expanded to show full support since Safari 3.1.](./browser-compat-safari.png)

<figcaption>

Safari has supported negative `playbackRate` since version 3.1, released all the way back in 2008.

</figcaption>

</figure>

Let's find out: load a video directly in Safari, open the console, and set `playbackRate` to `-1`.

<figure>

<video controls muted src={reversePlaybackSafari}></video>

<figcaption>

Technically moving backwards, but at maybe one or two frames per second. It's less "reverse playback"
and more "a slideshow, played in the wrong order." A valiant effort, but it doesn't count.

</figcaption>

</figure>

So, as it turns out, none of the major browsers actually support reverse playback, despite what the spec
and the compatibility tables might promise. Are we out of options?

[playbackRate]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate
