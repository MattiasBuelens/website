---
title: 'Talk: VHS for the streaming era: record and replay for HLS'
date: 2026-08-31T00:00:00+02:00
---

At [Demuxed 2025](https://2025.demuxed.com/), I presented a talk about how I build a record and replay tool for HLS streams.
You can watch the talk below, and read along for (much) more details about why and how I built this.

<script>
import Video from "#lib/components/Video.svelte";
import Iframe from "#lib/components/Iframe.svelte";
import Transcript from "./transcript.md";
</script>

## Watch the talk

<figure>

<Video
src="https://www.youtube.com/watch?v&equals;b9wfAgPIiO0&list&equals;PLkyaYNWEKcOeMg62dwyzfX4GvQbhhjByv&index&equals;14"
title="Video of recording at Demuxed 2025"></Video>

<figcaption>

[Watch on YouTube](https://www.youtube.com/watch?v=b9wfAgPIiO0&list=PLkyaYNWEKcOeMg62dwyzfX4GvQbhhjByv&index=14)

</figcaption>

</figure>

<figure>

<Iframe 
src="https://1drv.ms/p/c/ffcd3146fc9d2ced/IQSPlwAxKPgmT7q9XCVvJFKhAZ1VW-JlFGSqbfQk7TAvmhU?em=2&amp;wdAr=1.7777777777777777" 
title="Slides"></Iframe>

<figcaption>

[View on PowerPoint Online](https://1drv.ms/p/c/ffcd3146fc9d2ced/IQCPlwAxKPgmT7q9XCVvJFKhAc3mzr_zM5kRttEokLKhiaw?e=MuYMve)

</figcaption>

</figure>

<details>
<summary>Transcript</summary>
<Transcript />
</details>

## Motivation

Picture this: it's Friday afternoon, you're several coffees in, and you're fully in the zone.
Then a notification pops up: your most important customer just opened a ticket. "My livestream stalls."
You can't exactly leave that for Monday, so you open it up to see what's going on.

You read further, and the details get more specific than you'd like: the stream stalls on the second ad
of an ad break, in your boss's office in Australia, on their daughter's iPad, but only the night before a
full moon. Somehow, this is now your problem to solve. Where do you even start?

- You could schedule a screen-sharing session, though you're not sure that even works reliably on an iPad.
- You could turn on every log you have and hope the answer is buried somewhere in the haystack.
- You could ask for the iPad to be shipped to your office, though the kid might have some objections.
- You could just book a flight to Australia and see it with your own eyes.

None of those options sounds particularly appealing... 😕

What you actually want sits somewhere between a screen recording and a log file: a way to capture the
entire stream exactly as the player saw it, and play it back later, on your own machine, without needing
the original customer, their network, or their daughter's iPad. Not just the video, but every playlist and
every segment, so you can point any HLS player at it and watch the bug happen again, on demand, as many
times as it takes to find it.

Surely something like this already exists? Tools like [Wireshark] or [Chrome DevTools] can record all the
HTTP traffic during a playback session, which gets you most of the way there: you can inspect every request
and every response after the fact. But there's no way to take that recording and feed it back into a real
player. Once you've captured it, that's as far as it goes.

[FFmpeg] looked more promising, since it can both consume and produce a stream. The problem is that FFmpeg
is built for frames, not playlists: point it at an HLS stream to record and replay it, and FFmpeg demuxes
and remuxes everything along the way. The playlists you get back look nothing like the originals, and the
segments have been repackaged from scratch. If the bug you're chasing was actually caused by a broken
packager upstream, FFmpeg quietly papers over it for you, which is exactly the kind of detail you can't
afford to lose.

Since there wasn't a tool that did exactly what I needed, I did the only logical thing: I built one myself! 😁

## Introducing streamrr

The result is [streamrr], a small command-line tool for recording and replaying HLS streams [written in
Rust][main.rs] (mostly because I wanted an excuse to use it). As for the name: I'm terrible at naming things,
as usual. It boils down to two commands, `record` and `replay`:

```bash
$ streamrr record https://example.com/mystream.m3u8 recordings/mystream/
Download: https://example.com/mystream.m3u8
Download: https://example.com/video/1920_6/init.mp4
Download: https://example.com/video/1920_6/14654.m4s
Download: https://example.com/audio/257/init.mp4
Download: https://example.com/audio/257/12540.m4s
^C

$ streamrr replay recordings/mystream/
Replay server listening on http://127.0.0.1:8080/
```

`streamrr record` takes the URL of an HLS stream and a directory to record into. It downloads the master
playlist, then keeps following it: for a VOD stream, that means walking through every media playlist and
segment until there's nothing left to download; for a live stream, it just keeps polling for new segments
until you tell it to stop with `Ctrl+C`. Either way, once it's done, `recordings/mystream/` holds an exact,
replayable copy of what was on the wire.

`streamrr replay` takes that same directory and spawns a local HTTP server, serving the recording back out
as an HLS stream at `http://127.0.0.1:8080/`. Point any player you like at that URL, and as far as the
player is concerned, it's talking to the original stream all over again.

That's the pitch in a nutshell. The interesting part is what has to happen behind those two commands to
actually make a recording replayable, which is where the HLS-specific work comes in.

[Wireshark]: https://www.wireshark.org/
[Chrome DevTools]: https://developer.chrome.com/docs/devtools
[FFmpeg]: https://ffmpeg.org/
[streamrr]: https://github.com/THEOplayer/streamrr
[main.rs]: https://github.com/THEOplayer/streamrr/blob/6a1bab9/src/main.rs#L33-L80
