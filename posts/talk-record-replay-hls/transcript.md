---
title: 'Transcript: VHS for the streaming era'
---

So, I'm back once again. Uh, I hacked
some things together and I decided to
make a talk about it. So, that's kind of
my theme. Um, for today's little hack,
um, we're climbing up the attic and
we're dust finding that dusty old VHS
recorder because we're going to do
record and replay for HLS.
So imagine uh it's Friday afternoon um
and you're in the zone like your your
mind is connected directly to the CPU
via the main bus like you're perfectly
in sync but then suddenly a notification
pops up. Oh no, it's your biggest
customer and their their live stream is
stalling. So you have to put this away.
You have to dig into this right now. So
you open up the ticket description.
Okay, so your live stream is stalling on
the second ad of an adbreak at my boss's
office in Australia
on their daughter's iPad, but only the
night before a full moon. Like, okay,
like what what what is going on? Like,
how do how do you even start on this?
Like, what do you do? Okay, so do you
schedule a screen recording session? Do
we like sit together, see what what's
going on? Um, do you start uh adding
console logs all over your code uh and
then go back and forth and look at log
files? Do you just take the daughter's
iPad away from the poor kid and and ship
that over to your office? Will she even
survive without her iPad? Or do you just
cancel all of your weekend plans and
book a flight to Australia? Or is there
a better way? Like, can we do something
else that's a little bit less in in
invasive? Um, so what if there was a
tool that not only just could record
your screen or or or just share log
files, what if you could just capture
the entire live stream, all of it,
playlists and segments so that you can
then take those and replay them as if
they were happening again. Like you
could just see what the customer is
seeing exactly as it happened. and
preferably in a way that you can like
reuse like you could try it um with any
stream or with any player and see what's
going on. So does that already exist? Uh
I don't know. I had a look. So there are
quite a few tools that can do the
recording part. So you can do wireshark
or chrome dev tools and just record all
of the HTTP traffic and save that to
file. But there's no real way to then
act on that. you can look at what is in
the response but there's no way to then
replay that. Um, okay. Let's maybe look
at uh FFmpeg. FFmpeg solves everything,
right? Um, except FFmpeg is like really
good at uh dealing with frames, not so
much with playlist and segments. If you
try to make ffmpeg uh read read an HS
and output HS, the H list is going to be
different. The the segments are going to
be different. They they're going to have
to they're going to be repackaged. So if
there was a problem with the packager,
you don't see that when you record when
you look at the ffmpeg recording.
Okay. So there's no tool for this. So I
just make one, right? And this is today
how I made that. Um so it's called
streamr. I'm terrible at names as usual.
Um it's a little CLI tool with two
modes. Um you can record a stream. You
give it a URL and then save everything
to disk and then later on you can replay
them um as an HLS stream back and you
can throw that at a player and it's
written rest just because I can. I like
doing it. No other reason. Um this is
how you use it. You point it at an HLS
feed. Uh you tell it where to save it.
It'll down download everything until you
tell it to stop and then later on you
replay it. It spawns up an HP server and
point your player at it. Um, so diving a
little bit deeper, the recording is
doing like a bit of HLS on its own. So
it's looking at an a multivariant
playlist. It's going to download that.
Um, it's going to save everything for to
disk. Uh, every time it sees a new
playlist, it's going to download that.
Um, and it's also going to record the
timestamp at uh when that uh playlist
was was captured. um every time you see
a new segment, you're also going to
store that to disk, but you're also
going to slightly rewrite the playlist
so that it points to your stored
segments because like URLs are not file
names. Um and then you just keep doing
that per periodically. Uh every time you
get a new playlist or every time you get
a new segment, you add it to the
recording.
Um so the rewriting looks a bit like
this. You start with the original URL.
You also put that URL back into your
recording so that if you later on figure
out like, hey, there was a problem with
this segment, you know which vendor to
blame for this.
So when you replay it, it's a little
custom HTTP server. Um the when the
client requests the multivariant
playlist, uh we're going to put the
session start time in the URL so that we
know when this session was started. Um,
whenever you then request the media
playlist, uh, we can compute the offset
from the session start time and then use
that to figure out what playlist we
should be serving from the recording so
that it'll look like you're actually
live. You're getting new playlists the
longer the session goes on. Uh, for
segments, you just serve them from disk.
Nothing too special there. Okay. So, we
have a tool that can do record and
replay. Um, I threw this at our
developers and at our support engineers
and this is what they used it for. Um,
so one of our customers reported that
their audio and video sometimes desynced
when they start a live stream. This
doesn't happen always. Uh, so our
engineer when they looked at it, they
had to repeatedly refresh the page and
refresh and refresh just to get one
reproduction. Um, so they use this tool
to make a recording while they were
doing it and then when they see the
desync they stop the recording and then
they know that at the end of that
recording that desync is going to
happen. So they can iterate on that uh
find a find the root cause and then
properly solve it um much faster than if
they would just keeping the refreshing
going on. Um, another customer reporting
an issue with uh FSAI streams. They're
like very fancy but very difficult for a
player. Um so on certain ad breaks and
at certain seek times it sometimes the
player would stall. This was a player
bug. Um the like it's just the player
wasn't handling this very well. Um so
the engineer took a recording of that
stream. They noted down exactly when all
of this was happening and they turned
this into a regression test so that we
know in our test suite um this case is
covered and it's going to uh and it's
going to do that weird behavior every
time we we do that test and we make sure
that we handle it forever now. Um so we
also no longer depend on where this SSAI
stream is coming from. These are we just
put all of those segments on our
servers. Now
um more use cases like you can use this
to debug very rare things that happen
very rarely uh as I mentioned everything
with the XIX discontinuity tags are
always tricky um or or live to vault
transitions when your live stream ends
like a player can be like oh what's
going on like do you handle that
correctly um you can you can make a
recording of that and add that to your
tests um something else Something else
you can do um is uh when you have
streams from customers um that are maybe
only available for a limited time or
they have limited access like you need
to be on a VPN or you need to like uh
have have credentials that only lasts
for like a couple of days or something
like maybe the stream is literally a
camera in their offices and they have to
physically turn it on enough uh for you
to get a stream. So you can make a
recording of that and if you catch the
bug in there, you can just work on that.
Um something else like maybe not maybe
the stream is not limited in access,
maybe you are limited in access, maybe
you have to jump on a plane, you you
just take the recording, you work on it
and you land on or with a solution.
So future work um we can support more
protocols. This is Hless only right now,
but impecc
um you can uh actually do this easier
with like a UTC timing uh element. Um
mock maybe I don't know if you want to
do a mockup.
Um, going back to the Chrome DevTools
ID, um, like if you have a recording, if
you have a HAR file from Chrome
DevTools, like it would actually have
all of the playlist and segments in
there. So maybe we should go back on
this and make it possible to import this
so that you don't actually need to send
a a tool to your customer to make a
recording. They could just send you a
HAR file and play uh play a recording
from that. Um, ABR switches would be be
tricky, but we can figure that out. Um,
or maybe we don't want the tool at all.
Maybe we want to run this in a browser.
I don't know. Um, yeah, we're going to
put this up on GitHub. Um, you can
already download the binaries. Uh, we're
still working on making it properly open
source, but go get that link. Uh, and
thank you.
[applause and music]
