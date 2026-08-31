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
Rust][main.rs] (mostly because I wanted an excuse to use it). As for the name: it's a nod to Mozilla's [rr],
a record-and-replay debugger for native Linux programs. Since I'm terrible at naming things, I just stole their name.

`streamrr` comes with two main commands, `record` and `replay`:

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

`streamrr record` takes the URL of an HLS stream and a directory to record into. It downloads the multivariant
playlist, then keeps following it: for a VOD stream, that means walking through every media playlist and
segment until there's nothing left to download; for a live stream, it just keeps polling for new segments
until you tell it to stop with `Ctrl+C`. Either way, once it's done, `recordings/mystream/` holds an exact,
replayable copy of what was on the wire.

`streamrr replay` takes that same directory and spawns a local HTTP server, serving the recording back out
as an HLS stream at `http://127.0.0.1:8080/`. Point any player you like at that URL, and as far as the
player is concerned, it's playing the original stream all over again.

That's the pitch in a nutshell. The interesting part is what has to happen behind the scenes to
actually make a recording that will faithfully replay just like the original stream.

## Recording a stream

`streamrr record` is basically a small HLS client of its own. It starts by fetching whatever URL you gave
it: if that turns out to be a multivariant playlist, it filters that down to the variant stream(s) and
renditions you asked for (by default, just the first variant, plus the default audio, video and subtitle
rendition), and kicks off a separate recording task for each one, [running in parallel][record_master_playlist].
Every variant and every rendition gets its own subdirectory, `variant0/`, `media-audio-en-0/`, and so on,
each with its own `index.m3u8`.

Each of those subdirectories is where the actual HLS-following happens, in
[`record_media_playlist`][record_media_playlist]. On every iteration, it downloads the current media
playlist, saves any segments it hasn't seen before, and then either stops (if the playlist has
`#EXT-X-ENDLIST`, meaning it's a fully downloaded VOD stream) or waits out the target duration and fetches
the playlist again (if it's still live). Every fetched playlist is stamped with the time it was captured,
`index-20260831T101500.m3u8` rather than just `index.m3u8`, so a live recording ends up as a whole sequence
of these timestamped snapshots instead of a single file. That timestamp is what makes it possible to
"replay" a live stream later, more on that in the next section.

The other job of that loop is rewriting: URLs in the original playlist point at wherever the packager put
them, but you're now serving files off your own disk, so every reference has to become a local path
instead. For a segment, that means picking a new file name based on its position in the playlist (its
"media sequence number"), and stashing the original URL in a custom `#EXT-X-ORIGINAL-URI` tag right above
it, so it doesn't get lost:

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
<div>

**Original playlist**

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXTINF:6.0,
media_w370_0.ts
#EXTINF:6.0,
media_w370_1.ts
```

</div>
<div>

**Rewritten playlist**

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-ORIGINAL-URI:https://example.com/media_w370_0.ts
#EXTINF:6.0,
segment-0.ts
#EXT-X-ORIGINAL-URI:https://example.com/media_w370_1.ts
#EXTINF:6.0,
segment-1.ts
```

</div>
</div>

Boiled down, the actual rewrite in [`rewrite_segment`][rewrite_segment] looks like this:

```rust
fn rewrite_segment(segment: &mut MediaSegment, sequence: u64, playlist_url: &Url) -> Result<()> {
    let segment_url = playlist_url.join(&segment.uri)?;
    let file_name = format!("segment-{sequence}.{}", url_file_extension(&segment_url)?);
    // Keep the original URL around, so you know which vendor to blame later.
    segment.unknown_tags.push(ExtTag {
        tag: ORIGINAL_URI.to_string(),
        rest: Some(segment_url.into()),
    });
    segment.uri = file_name;
    Ok(())
}
```

Initialization segments, encryption keys, and even the variant and rendition entries in the multivariant
playlist all go through the same treatment: download it, rewrite its URI to a local path, and keep the
original URL around as an `X-ORIGINAL-*` tag or attribute. By the time a recording finishes, every playlist
on disk points only at other files inside that same recording, but nothing about where the stream actually
came from has been lost.

## Replaying a recording

`streamrr replay` spins up a small [Warp]-based HTTP server, in [`replay()`][replay], that turns the files
on disk back into something an HLS player can consume. The interesting part is faking "live": since the
recording is a sequence of timestamped playlist snapshots, replay has to figure out, at any given moment
during playback, which one of those snapshots the player should be seeing.

That starts the moment a player requests the multivariant playlist for the very first time. If the request
doesn't carry a `start` query parameter yet, the server treats that as "the session is starting right now":
it redirects the player to the same URL with `?start=<timestamp>` appended, where the timestamp is just the
current time in milliseconds. Every request that follows, for every variant and rendition playlist, carries
that same `start` value along with it, because the rewritten multivariant playlist adds it to every variant
and rendition URI it points to.

From there, figuring out which recorded playlist to serve is just arithmetic, in
[`playlist_path_at_time`][playlist_path_at_time]:

```rust
fn playlist_path_at_time(
    playlist_name: &str,
    recording: &Recording,
    recording_start: DateTime<Utc>,
    client_start: DateTime<Utc>,
) -> Option<PathBuf> {
    // At T = client_start + offset, serve the playlist recorded at recording_start + offset.
    let offset = Utc::now() - client_start;
    let recording_time = recording_start + offset;
    let (_, relative_path) = recording.find_latest_before(playlist_name, recording_time)?;
    Some(PathBuf::from(relative_path))
}
```

However much real time has passed since the player's `start` timestamp, that same amount of time gets added
to the recording's own start time, and whichever playlist snapshot was captured closest to (but not after)
that point in the recording is the one that gets served. Play the replayed stream for thirty seconds, and
you'll see the same sequence of playlist updates a viewer would have seen thirty seconds into the original
live broadcast, no matter when you actually pressed play. (If nothing was recorded yet at that offset, say,
the player asks before the very first playlist was ever downloaded, it just falls back to the earliest
snapshot instead.)

There's one more bit of cleanup before a playlist goes out the door: the `#EXT-X-ORIGINAL-URI` tags and
their friends from the recording step get stripped back out again, so the player only ever sees the segment
references it actually needs, not the bookkeeping streamrr added along the way.

Segments, initialization files and keys need none of this: their file names were already decided once, at
recording time, and they never change afterwards, so the server just hands them straight off disk.

Put it all together, and `streamrr replay` can make a five-minute-old recording look exactly like a live
stream that just started: point any player at it, and it can't tell the difference.

## Stories from the lab

Of course, the proof is in the pudding: does any of this actually help? Once streamrr worked, I handed it
to other developers and support engineers to see what they'd do with it. Two stories in particular stuck
with me.

### An audio/video desync

One engineer was chasing an occasional audio/video desync that only showed up right at the start of a
livestream, and only sometimes. Tracking it down meant refreshing the page over and over, waiting to see
whether that particular attempt happened to desync, and then trying to read something useful out of it
before the moment was gone.

Instead, they ran `streamrr record` alongside their usual refreshing, and simply kept it running until a
desync showed up, then stopped the recording right there. Since the recording only had to happen once, from
that point on they had a `streamrr replay` stream that desynced the exact same way, every single time they
played it. That turned a debugging session that depended on luck into one they could just run again and
again, tweaking one thing at a time, until they found the actual root cause.

### A regression test from a rare edge case

Another report came from a customer using server-side ad insertion (SSAI): on certain ad breaks, at certain
seek times, the player would stall indefinitely. The engineer who picked it up eventually traced it back to
how the player handled `#EXT-X-DISCONTINUITY` tags, the markers HLS uses to signal a switch between, say,
the main content and an ad. In this particular edge case, the player ended up believing the video track was
still in the main content while the audio track had already crossed into the ad, and got stuck reconciling
the two.

Once they had a recording that reliably reproduced the bug, they didn't just use it to fix the player: they
uploaded the recording to the team's own test streams and turned it straight into a regression test. That
locked the fix in for good, and as a bonus, the test no longer depends on the original SSAI stream still
being around: the recording _is_ the test fixture now.

## More ways to use it

Both of those stories share the same shape: something rare and awkward to catch live becomes trivial to
debug once you can replay it on demand. That pattern shows up in a few other places too.

Discontinuities in general are a good source of these bugs: `#EXT-X-DISCONTINUITY` tags show up wherever a
stream splices in an ad break, switches encoders, or otherwise breaks the assumption that timestamps keep
increasing smoothly, and players don't always agree on how to handle that moment. The same goes for the
other end of a live stream's life: when it ends and the playlist gets an `#EXT-X-ENDLIST` tag, turning a
live stream into VOD, a player can sometimes be caught off guard by that transition too. Either way, a
recording captures the exact moment things get weird, so you don't have to sit around waiting for it to
happen again.

Then there's streams you simply can't get to whenever you want. Maybe access requires a VPN, or
credentials that only last for a couple of days. Maybe the "stream" is quite literally a camera in a
customer's office that someone has to walk over and switch on. Record it once, and you can debug that
recording for as long as you need to -- no VPN or camera needed. Or flip it around: maybe it's not the
stream that's hard to get to, it's you, stuck on a plane with no network at all. Either way, record it once
while you have the chance, and you can take your time working the problem afterwards.

## Future work

streamrr does what I need today, but there are a few directions I'd still like to take it:

- **More protocols.** Right now it's HLS-only, but MPEG-DASH would actually be easier: a DASH manifest can
  carry a `<UTCTiming>` element, which tells the player what time it should treat as "now". Point that at a
  point in the past, and the player happily believes it's still watching live, no rewriting required. HLS
  has no equivalent, which is why streamrr has to fake that same trick itself, by rewriting the playlists
  and stamping its own `start` timestamp onto the very first request.
- **Importing recordings, not just creating them.** Running `streamrr record` next to the real player works
  fine, but it's not always the easiest way to get a recording: a stream might need some complicated
  browser-only authentication, or a customer might have already handed you a HAR export from Chrome
  DevTools without you having to ask. A `streamrr import` command, [currently in the works][import-pr],
  would read that `.har` file straight into a recording, in the exact same format `record` produces.
- **Maybe this shouldn't be a CLI at all?** Making HTTP requests, parsing HLS playlists and storing files
  are all things a web app can do too, so recording (and maybe even replaying) could someday live entirely
  in the browser.

## Conclusion

What surprised me most was how little "record and replay" turned out to be about HLS itself. The entire
trick comes down to two small pieces of bookkeeping: download and rewrite every URL you see to a local
file, and offset all playlist requests by a timestamp to make the replay feel "live".

What I'm most proud of, though, is that streamrr is now regularly used to solve real customer issues. Not
bad for a quick hack that was originally supposed to get thrown away right after the talk.

streamrr is [on GitHub][streamrr], open source, and just [one `cargo install` away][install]. Give it a try
the next time one of your HLS streams is giving you a hard time.

[Wireshark]: https://www.wireshark.org/
[Chrome DevTools]: https://developer.chrome.com/docs/devtools
[FFmpeg]: https://ffmpeg.org/
[streamrr]: https://github.com/THEOplayer/streamrr
[rr]: https://rr-project.org/
[main.rs]: https://github.com/THEOplayer/streamrr/blob/6a1bab9/src/main.rs#L33-L80
[record_master_playlist]: https://github.com/THEOplayer/streamrr/blob/6a1bab9/src/record/mod.rs#L69-L191
[record_media_playlist]: https://github.com/THEOplayer/streamrr/blob/6a1bab9/src/record/mod.rs#L193-L268
[rewrite_segment]: https://github.com/THEOplayer/streamrr/blob/6a1bab9/src/record/rewrite.rs#L39-L85
[Warp]: https://docs.rs/warp
[replay]: https://github.com/THEOplayer/streamrr/blob/6a1bab9/src/replay/mod.rs#L36-L88
[playlist_path_at_time]: https://github.com/THEOplayer/streamrr/blob/6a1bab9/src/replay/mod.rs#L92-L106
[import-pr]: https://github.com/THEOplayer/streamrr/pull/9
[install]: https://theoplayer.github.io/streamrr/
