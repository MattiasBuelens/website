---
title: 'Talk: VHS for the streaming era: record and replay for HLS'
date: 2026-08-31T19:00:00+02:00
---

At [Demuxed 2025](https://2025.demuxed.com/), I presented [streamrr], a small Rust tool that records an HLS stream (playlists, segments and all) and replays it later, exactly as it happened.
Watch the talk below, or read on to find out how it works under the hood.

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
Then a notification pops up. Your most important customer just opened a ticket: "My livestream stalls."
You can't exactly leave that until Monday, so you open it to see what's going on.

The details are more specific than you'd like. The stream stalls on the second ad of an ad break, in
the customer's office in Australia, on their boss's daughter's iPad, but only the night before a full moon.
Somehow, this is now your problem. Where do you even start?

- You could schedule a screen-sharing session, though you're not sure that even works on an iPad.
- You could turn on every log you have and hope the answer is buried somewhere in the haystack.
- You could ask for the iPad to be shipped to your office, though the kid might have some objections.
- You could book a flight to Australia and see it with your own eyes.

None of those options sound particularly appealing... 😕

What you want is somewhere between a screen recording and a log file: a way to capture the entire
stream exactly as the player saw it, and play it back later on your own machine, without the customer,
their network or the iPad. Not just the video, but every playlist and every segment, so you can point any
HLS player at it and watch the bug happen again, as many times as it takes to find it.

Surely something like this already exists? Tools like [Wireshark] or [Chrome DevTools] can record all
HTTP traffic during a playback session, which gets you most of the way there: you can inspect every
request and response after the fact. But you can't feed that recording back into a real player.

[FFmpeg] looked more promising, since it can both consume and produce a stream. However, FFmpeg works
with frames, not playlists. If you use it to record and replay an HLS stream, it demuxes and remuxes
everything along the way. The playlists you get back look nothing like the originals, and the segments
are repackaged from scratch. If the bug you're chasing was caused by a broken packager upstream, FFmpeg
will happily paper over it, and that's exactly the kind of detail you can't afford to lose.

Since no existing tool did what I needed, I did the only logical thing: I built one myself! 😁

## Introducing streamrr

The result is [streamrr], a small command-line tool for recording and replaying HLS streams, [written in
Rust][main.rs] (mostly because I wanted an excuse to use it). The name is a nod to Mozilla's [rr], a
record-and-replay debugger for Linux programs. I'm terrible at naming things, so I just borrowed theirs.

`streamrr` has two main commands, `record` and `replay`:

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

`streamrr record` takes the URL of an HLS stream and a directory to record into. It downloads the
multivariant playlist and then follows it. For a VOD stream, it downloads every media playlist and segment
until there's nothing left. For a live stream, it keeps polling for new segments until you stop it with
`Ctrl+C`. Either way, `recordings/mystream/` ends up with an exact, replayable copy of what was on the wire.

`streamrr replay` takes that same directory and starts a local HTTP server, which serves the recording as
an HLS stream at `http://127.0.0.1:8080/`. Point any player at that URL, and as far as the player is
concerned, it's playing the original stream all over again.

That's the pitch in a nutshell. Now let's look at what happens behind the scenes to make a recording
that replays just like the original stream.

## Recording a stream

`streamrr record` is basically a small HLS client. It starts by fetching the URL you gave it. If that's a
multivariant playlist, it picks out the variant streams and renditions you asked for (by default, the
first variant plus the default audio, video and subtitle renditions), and starts a separate recording
task for each of them, [running in parallel][record_master_playlist]. Every variant and rendition gets its
own subdirectory (`variant0/`, `media-audio-en-0/`, and so on), each with its own `index.m3u8`.

Each recording task runs [`record_media_playlist`][record_media_playlist] in a loop. On every iteration,
it downloads the current media playlist and saves any segments it hasn't seen before. If the playlist has
an `#EXT-X-ENDLIST` tag, the stream has ended (or was VOD to begin with), so it stops. Otherwise, the stream
is still live, so it waits for the target duration and fetches the playlist again. Every playlist is saved
with the time it was fetched (`index-20260831T101500.m3u8` rather than `index.m3u8`), so a live
recording ends up as a sequence of timestamped snapshots instead of a single file. Those timestamps are
what make it possible to replay a live stream later, as we'll see in the next section.

The loop also rewrites the playlists. URLs in the original playlist point to wherever the packager put
the files, but we'll be serving them from our own disk, so every reference must become a local path. For
a segment, streamrr picks a new file name based on its position in the playlist (its "media sequence
number"), and stores the original URL in a custom `#EXT-X-ORIGINAL-URI` tag right above it, so it doesn't
get lost:

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

Simplified, the rewrite in [`rewrite_segment`][rewrite_segment] looks like this:

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

Initialization segments, encryption keys, and the variant and rendition entries in the multivariant
playlist all get the same treatment: download the file, rewrite its URI to a local path, and keep the
original URL in an `X-ORIGINAL-*` tag or attribute. When the recording is done, every playlist on disk
only points to files inside the recording, but we still know where everything originally came from.

## Replaying a recording

`streamrr replay` starts a small HTTP server built with [Warp], in [`replay()`][replay], which serves the
files on disk to an HLS player. The tricky part is faking a live stream. The recording is a sequence of
timestamped playlist snapshots, so at any moment during playback, the server has to figure out which
snapshot the player should see.

This starts when the player first requests the multivariant playlist. If the request doesn't have a
`start` query parameter yet, the server treats it as the start of a new session. It redirects the player
to the same URL with `?start=<timestamp>` appended, where the timestamp is the current time in
milliseconds. The server also adds that `start` parameter to every variant and rendition URI in the
multivariant playlist, so all subsequent playlist requests carry the same value.

From there, finding the right playlist to serve is simple arithmetic, in
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

The server takes the time that has passed since the player's `start` timestamp, and adds it to the start
time of the recording. It then serves the last playlist snapshot that was captured at or before that
point. Play the replayed stream for thirty seconds, and you'll see the same playlist updates that a viewer
would have seen thirty seconds into the original live stream, no matter when you pressed play. (If the
player asks for a point before the first snapshot was recorded, the server falls back to the earliest
snapshot.)

Before a playlist is sent out, there's one more bit of cleanup: the server strips out the
`#EXT-X-ORIGINAL-URI` tags and friends that were added while recording, so the player only sees the
regular HLS tags.

Segments, initialization segments and keys need none of this. Their file names were decided at
recording time and never change, so the server serves them straight from disk.

Put it all together, and `streamrr replay` can make a five-minute-old recording look exactly like a live
stream that just started. The player can't tell the difference.

## Stories from the lab

Of course, the proof of the pudding is in the eating: does any of this actually help? Once streamrr
worked, I handed it to other developers and support engineers to see what they'd do with it. Two stories
stood out.

### An audio/video desync

One engineer was chasing an audio/video desync that sometimes showed up right at the start of a
livestream. Tracking it down meant refreshing the page over and over, hoping that this attempt would
desync, and then trying to learn something from it before the moment was gone.

Instead, they ran `streamrr record` while refreshing, and stopped the recording as soon as they saw a
desync. From then on, they had a replay that desynced in exactly the same way, every single time. A
debugging session that depended on luck became one they could repeat as often as they liked, changing
one thing at a time, until they found the root cause.

### A regression test from a rare edge case

Another report came from a customer using server-side ad insertion (SSAI): on certain ad breaks, when
seeking to certain times, the player would stall indefinitely. The engineer who picked it up traced it
back to how the player handled `#EXT-X-DISCONTINUITY` tags, which HLS uses to mark a switch between (for
example) the main content and an ad. In this edge case, the player thought the video track was still in
the main content while the audio track had already moved on to the ad, and it got stuck trying to
reconcile the two.

Once they had a recording that reliably reproduced the bug, they didn't just use it to fix the player.
They also added it to the team's test streams and turned it into a regression test. That makes sure the
bug stays fixed, and the test doesn't depend on the original SSAI stream still being around: the
recording _is_ the test fixture.

## More ways to use it

Both stories follow the same pattern: a bug that's rare and hard to catch live becomes easy to debug once
you can replay it on demand. That pattern shows up in a few other places too.

Discontinuities are a common source of these bugs in general. `#EXT-X-DISCONTINUITY` tags appear wherever a
stream splices in an ad break, switches encoders, or otherwise breaks the assumption that timestamps
increase smoothly, and players don't always agree on how to handle them. The same goes for the end of a
live stream: when the playlist gets an `#EXT-X-ENDLIST` tag and turns into VOD, that transition can catch
a player off guard too. A recording captures the exact moment things go wrong, so you don't have to wait
around for it to happen again.

Then there are streams you can't access whenever you want. Maybe they require a VPN, or credentials that
only last a couple of days. Maybe the "stream" is literally a camera in a customer's office that someone
has to walk over and switch on. Or maybe it's not the stream that's hard to reach, but you: stuck on a
plane without any network. Either way, record the stream once while you can, and you can take all the time
you need to debug it afterwards.

## Future work

streamrr does what I need today, but there are a few directions I'd like to take it in:

- **More protocols.** Right now it only supports HLS, but MPEG-DASH would actually be easier. A DASH
  manifest can contain a `<UTCTiming>` element, which tells the player what time it should treat as "now".
  Set that to a time in the past, and the player happily believes it's watching live, without any other
  rewriting. HLS has no equivalent, which is why streamrr has to fake it with a `start` timestamp and some
  playlist rewriting.
- **Importing recordings.** Running `streamrr record` next to the player works fine, but it's not always
  the easiest way to get a recording. A stream might need complicated browser-only authentication, or a
  customer might have already sent you a HAR export from Chrome DevTools. A `streamrr import` command,
  [currently in the works][import-pr], would turn that `.har` file into a recording, in the same format
  that `record` produces.
- **Maybe this shouldn't be a CLI at all?** A web app can also make HTTP requests, parse HLS playlists and
  store files, so recording (and maybe even replaying) could someday happen entirely in the browser.

## Conclusion

Record and replay for HLS comes down to two bits of bookkeeping: rewrite every URL to point to a local
file, and offset every playlist request by a timestamp to make the replay feel live.

What I'm most proud of is that streamrr is now regularly used to solve real customer issues. Not bad for a
quick hack that was supposed to be thrown away right after the talk.

streamrr is open source, [available on GitHub][streamrr], and only [one `cargo install` away][install].
Give it a try the next time one of your HLS streams is giving you a hard time.

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
