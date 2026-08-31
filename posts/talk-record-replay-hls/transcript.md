---
title: 'Transcript: VHS for the streaming era'
---

So, I'm back once again — I hacked some things together and decided to
make a talk about it, that's kind of my theme. For today's little hack,
we're climbing up into the attic, dusting off that old VHS recorder,
because we're going to do record and replay for HLS.

So imagine it's Friday afternoon, and you're in the zone — your mind is
connected directly to the CPU via the main bus, you're perfectly in
sync. But then suddenly a notification pops up: oh no, it's your
biggest customer, and their live stream is stalling. So you have to put
this away, you have to dig into this right now. You open up the ticket
description.

Okay, so: your live stream is stalling on the second ad of an ad break,
at my boss's office in Australia, on their daughter's iPad, but only
the night before a full moon. Like, okay, what — what is going on? How
do you even start on this? What do you do?

Do you schedule a screen recording session, sit together, see what's
going on? Do you start adding console logs all over your code and then
go back and forth looking at log files? Do you just take the daughter's
iPad away from the poor kid and ship that over to your office — will
she even survive without her iPad? Or do you just cancel all of your
weekend plans and book a flight to Australia? Or is there a better way?
Can we do something else that's a little less invasive?

What if there was a tool that could not only record your screen or
share log files, but capture the entire live stream — all of it,
playlists and segments — so that you could then take those and replay
them as if they were happening again? You could see exactly what the
customer was seeing, as it happened. And preferably in a way you could
reuse: try it with any stream, with any player, and see what's going
on.

So, does that already exist? I don't know, I had a look. There are
quite a few tools that can do the recording part: you can use Wireshark
or Chrome DevTools and just record all of the HTTP traffic and save
that to a file. But there's no real way to then act on that — you can
look at what's in the response, but there's no way to replay it.

Okay, let's maybe look at FFmpeg. FFmpeg solves everything, right?
Except FFmpeg is really good at dealing with frames, not so much with
playlists and segments. If you try to make FFmpeg read HLS and output
HLS, the playlist is going to be different, the segments are going to
be different — they'll have to be repackaged. So if there was a problem
with the packager, you won't see that when you look at the FFmpeg
recording.

So there's no tool for this. So I just made one, right? And this is how
I made it. It's called streamrr — I'm terrible at names, as usual. It's
a little CLI tool with two modes: you can record a stream (you give it
a URL, and it saves everything to disk), and later on you can replay it
as an HLS stream again, and throw that at a player. It's written in
Rust, just because I can — I like doing it, no other reason.

This is how you use it: you point `streamrr record` at an HLS feed,
tell it where to save it, and it downloads everything until you tell it
to stop. Then later on, `streamrr replay` spawns an HTTP server, and
you point your player at it.

So diving a little deeper: the recording is doing a bit of HLS on its
own. It looks at the multivariant playlist and downloads that. It saves
everything to disk, and every time it sees a new playlist it downloads
that too, recording the timestamp of when that playlist was captured.
Every time you see a new segment, you store that to disk as well, but
you also slightly rewrite the playlist so it points to your stored
segments — because URLs are not file names. And then you just keep
doing that periodically: every time you get a new playlist, or every
time you get a new segment, you add it to the recording.

So the rewriting looks a bit like this: you start with the original
URL, and you also put that URL back into your recording, so that if you
later figure out there was a problem with this segment, you know which
vendor to blame for it.

So when you replay it, it's a little custom HTTP server. When the
client requests the multivariant playlist, we put the session start
time in the URL, so we know when this session started. Whenever you
then request a media playlist, we compute the offset from the session
start time, and use that to figure out which playlist we should be
serving from the recording — so that it looks like you're actually
live, and you keep getting new playlists the longer the session goes
on. For segments, you just serve them from disk, nothing too special
there.

Okay, so we have a tool that can do record and replay. I threw this at
our developers and support engineers, and this is what they used it
for.

One of our customers reported that their audio and video sometimes
desynced when they start a live stream. This doesn't always happen, so
when our engineer looked at it, they had to repeatedly refresh the
page, refresh and refresh, just to get one reproduction. So they used
this tool to make a recording while they were doing that, and when they
saw the desync, they'd stop the recording — so they'd know that at the
end of that recording, the desync was going to happen. That let them
iterate much faster, find the root cause, and properly solve it,
instead of just refreshing forever.

Another customer reported an issue with SSAI streams — very fancy, but
very difficult for a player. On certain ad breaks, at certain seek
times, the player would sometimes stall. This was a player bug: it just
wasn't handling this very well. So the engineer took a recording of
that stream, noted down exactly when this was happening, and turned it
into a regression test — so now we know it's covered in our test suite,
and it's going to do that weird behavior every time we run that test,
so we make sure we handle it forever. We also no longer depend on where
the original SSAI stream is coming from; we just host those segments on
our own servers now.

More use cases: you can use this to debug very rare things that happen
very rarely — as I mentioned, everything with `EXT-X-DISCONTINUITY`
tags is always tricky, or live-to-VOD transitions when your live stream
ends, where a player can be like, "what's going on, are you handling
that correctly?" You can make a recording of that and add it to your
tests.

Something else you can do: when you have streams from customers that
are only available for a limited time, or with limited access — you
need to be on a VPN, or you need credentials that only last for a
couple of days, or maybe the stream is literally a camera in their
office and they have to physically turn it on for you to get a stream —
you can make a recording of it, and if you catch the bug in there, you
can work on that. Or maybe it's not the stream that's limited, maybe
you are: maybe you have to jump on a plane. You just take the
recording, work on it, and land with a solution.

So, future work: we can support more protocols, this is HLS-only right
now. But MPEG-DASH — like, there's no reason why MPEG-DASH wouldn't
work, you can actually do this easier with something like a UTC timing
element. Maybe — I don't know — you'd want to do a mockup.

Going back to the Chrome DevTools idea: if you have a HAR file from
Chrome DevTools, it actually has all of the playlists and segments in
there. So maybe we should revisit that, and make it possible to import
a HAR file — so you don't actually need to send a tool to your customer
to make a recording, they could just send you a HAR file and you play a
recording from that. ABR switches would be tricky, but we can figure
that out. Or maybe we don't want a separate tool at all, maybe we want
to run this in the browser. I don't know.

We're going to put this up on GitHub — you can already download the
binaries, we're still working on making it properly open source, but go
get that link. Thank you!
