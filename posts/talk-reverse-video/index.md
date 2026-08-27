---
title: "Talk: The curious player of Benjamin Button: reverse video on the web"
date: 2026-08-27T00:00:00+02:00
---

At [Demuxed 2023](https://2023.demuxed.com/), I presented a talk about how I extended [baby's first HTML5 `<video>` element](/post/talk-baby-video/) to support reverse playback.
You can watch the talk below.

<script>
import Video from "#lib/components/Video.svelte";
import Iframe from "#lib/components/Iframe.svelte";
import BaselineStatus from "#lib/components/BaselineStatus.svelte";
import Transcript from "./transcript.md";
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

Video on the web only ever goes one way: forward. Press play, and time marches on. That's fine for
watching a movie, but it's not the only thing people want to do with video.

Take video editing: if you're trying to find the exact frame where a cut or a transition happens, it
helps a lot to be able to nudge backwards and forwards around that point, instead of repeatedly seeking
to guess where you landed. Or think of a video assistant referee, scrubbing through a replay to find the
exact frame where an attacker's boot touches the ball, so they can freeze it and draw an imaginary line
across the pitch. (I have no idea how the offside rule actually works, but I'm told this is roughly it.)
And, of course, there's the noblest use case of all: funny GIFs, which are objectively funnier played in
reverse. Two hamsters eating a blade of grass, backwards, so that it grows a green tongue right back
into the ground — that's basically why the internet exists.

So: video should just go forward, right? Why would we ever need it to go backwards?

## Isn't this already possible?

Surely someone thought of this already. And indeed, if you check [MDN's docs on
`playbackRate`][playbackRate], it says that a negative value plays the media backwards. Great, problem
solved!

Except: scroll down to the browser compatibility table, and Chrome tells a different story. Setting
`playbackRate` to a negative number doesn't play the video backwards — it just throws an error. So much
for that.

Fine, that's just Chrome. Surely another browser does better? Safari's row in that same table says "full
support", so let's try it there. Load up a video, open the console, and set `playbackRate` to `-1`... and
what you get is technically moving backwards, but at maybe one or two frames per second. It's less
"reverse playback" and more "a slideshow, played in the wrong order." A valiant effort, but it doesn't
count.

So, as it turns out, none of the major browsers actually support reverse playback, despite what the spec
and the compatibility tables might promise. Are we out of options?

[playbackRate]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate
