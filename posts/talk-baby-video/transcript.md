---
title: "Transcript: Baby's first HTML5 <video> element"
---

_(pointing at title slide)_
As you can see, I also have a passion for graphic design.

So hi Demuxed, I'm Mattias. I work at THEO, we make online
video players. But today we're going to be making something
slightly different: we're going to be building an HTML5
video element from scratch.

The video element is what you see every time you play a
video in a web browser, and it's what powers every
JavaScript player out there like hls.js, Shaka, THEOplayer.
If you're watching this talk online, you're probably
looking at a video element right now. Now, Carl Sagan
famously said if you wish to make a video element from
scratch you must first invent the universe. I only have
about 10 minutes today so I won't exactly go that far,
but we'll still try to make it work.

So why would you want to do this when we already have a
perfectly good built-in video element? Well, the video
element makes a lot of decisions for us: when to decode
the next frame, how many frames to decode in advance,...
For some use cases like low-latency streaming that might
not be enough. We want to take control of the decoding
on a much lower level there, to fine tune things even
further.

Also, because today we can actually do this *efficiently*:
we've got the WebCodecs API in Chrome that allows you to
interface directly with the hardware decoder. And their
explainer even mentions that you *should* be able to
build something like MSE on top of it. So to that I say:
challenge accepted! Let's put the theory into practice.

And we can try to make this into a running theme here at
Demuxed: last year Collin Miller replaced ffmpeg with
WebCodecs, today I'll replace the video element with
WebCodecs, so maybe next year someone can - I don't know -
replace smell-o-vision with WebCodecs? Submit a talk, I
would love to see that.

Finally, this is a fun learning exercise. Some of the
things that we take for granted from a video element are
actually quite tricky when you actually try to make this
yourself, so it should be interesting to do. Do note
though: this *is* a toy implementation and like if you
have your kids playing with a toy kitchen, you wouldn't
really want to eat whatever they cook up in there
either. So don't do that.

First things first: let's put the "element" in "video
element". We've got custom elements for that today, so we
can just define our `<baby-video>` element in JavaScript,
put it on our page, put a `<canvas>` element in there so
that we have somewhere to draw our video frames on and
that should work. There we go: we've got a black
rectangle. Yay!

...Not too excited just yet, a very convoluted way to get
a black rectangle on your screen so let's put something
extra in there. We can control a video element entirely
from JavaScript but it's probably easier if we have like
a UI with a play button and a seek bar in there to do
things with. You can build that in HTML, JavaScript and
CSS yourself but if it looks like a video element and it
quacks like a video element,... then you can use Media
Chrome for your UI.

So this is the boilerplate for Media Chrome: you add
Media Chrome to your web page, you wrap your video
element in a `<media-controller>`, you put some UI
components in there and there you have it: a working UI.
Wow! It doesn't really do anything yet because we haven't
implemented anything in our video element itself, so
let's keep going.

We want to first put some data in our video element. The
API for that is called Media Source Extensions. That
again powers every JavaScript player out there and the
logic is always the same: you create a `MediaSource` with
one or more `SourceBuffer`s, you download some fragmented
MP4 files that you got out of an HLS or a DASH or an HESP
manifest, and then you append those to your
`SourceBuffer` and that gets you data for your video.

Of course, we're implementing this ourselves today so the
most important method is `appendBuffer`. We'll use
mp4box.js to parse the incoming fragmented MP4 files. The
initialization segment contains the movie box that
contains track and codec information and we'll represent
those as a `VideoDecoderConfig`. The media segments then
contain our movie fragment boxes with media sample data
and we'll represent those as `EncodedVideoChunk`s later to
play with WebCodecs.

So, we've got some buffer, we can finally play a video.
We'll have a simple clock that advances with the player's
current time and every time the browser wants to render a
frame, we'll configure the video decoder. If we haven't
done that already, we'll find the correct frame in our
buffer that was populated from the media segment, then
we'll decode that frame and then render it. The rendering
is actually quite easy with WebCodecs because you can just
pass the video frame directly to `drawImage` and that just
works. Really cool!

So of course you gotta play Big Buck Bunny in our first
video element. Yes, there it is! If you're watching this
talk online and it's looking a bit glitchy on your side,
that's supposed to happen: we're not there yet. The PTS
and the frame numbers are all wrong and there's lots of
smearing going on, so let's try to fix that.

What is actually going on in this demo? Well, the browser
is rendering this at like 60 frames per second, but our
video is 30 frames per second. So we're actually decoding
every frame twice. That's not supposed to happen, because
a frame depends on the *previous* frame, not on *itself*.
So to fix that, we just add an extra check: if we've
already decoded this frame, we don't decode it again and
we just move on.

So what does that look like? Okay, yeah, that does look
more like Big Buck Bunny to me. Okay, if it still looks
glitchy on your end online: sorry, that's on you, check
your connection.

So what about seeking? What if we jump
forward and backward in time? The logic
should still work, right? We've got all of
that stuff going on: we're finding
the frame at current time... no, oh okay,
that is really blocky and janky.

That's not how you remember it, so
what's going on this time? Well, there's
two types of video frames: we've
got keyframes and delta frames, and
if we end up on a delta frame after a
seek, then we cannot decode that
independently, we need to decode all of
its frame dependencies first. Usually
that just means decoding from the last
decoded sample that we've got in our
buffer, or if we're now in a new group of
pictures with a new keyframe, we have to
start decoding from that keyframe.

Note that this also handles a case that
we didn't handle earlier, that we
missed: when the display frame rate is smaller
than the video frame rate, then we
always need to decode multiple frames
for every rendered frame, so this handles
that too. Note that if you have fewer
keyframes in your video, you'll have more
frame dependencies, and that means that
seeking can become slower. So takeaway
from that: one of the reasons why you
should keep your keyframe interval small is
to keep seeking relatively fast.

We've got seeking working now, I think.
Yep, that's the right frame, that doesn't
look janky.

Okay good, so we're onto something good here. Now, to make
this a proper video player: if we only ever append new
media data, then sooner or later this is just gonna crash
with an out-of-memory error. We don't want that, so the
player needs a way to remove the media when it's no longer
needed. The API for that is called `SourceBuffer.remove()`
and it removes everything between a given start and end
time. Now, if there are frames that depend on those frames
in that interval, you can no longer decode those after
you've removed them, so those also get removed with that
same call. In particular, if there's a keyframe in that
removal range, then you remove the entire group of
pictures that comes with it.

Now, when should the player clean up its buffer? It can
do it proactively: you can remove frames that are too far
in the past, because you no longer need them when you're
doing forward playback. Again, you have to watch out that
if you're too close to current time, you don't want to
remove the keyframe that is being used to decode frames
around current time, otherwise you can stall the decoder
or cause glitches, you don't want that. When you're
seeking backwards you can also remove frames that are now
too far ahead of current time. But sometimes that's not
enough: sometimes the source buffer might reach its limit
earlier than that, and you have to react to that. It will
throw a `QuotaExceededError` at you, so your player should
be able to handle that: reduce its buffering goal and then
keep less buffer after current time. It should also
postpone the next appends until it can actually remove
some data that it no longer needs, and then retry the
appends again.

Now with this we can already play pretty simple streams,
but of course for a proper video player we also want
something like ABR, so we want to be able to switch
qualities. A quality switch usually means a new codec
config, so we just reconfigure our existing decoder with
the new config, and that's most of the time good enough.
However, for some streams you have a problem if you have
different qualities with different segment durations. So
in this example first we have two segments in the 480p
quality, and then we try a quality switch to the 720p
quality, but that overlaps the second segment that we
already have. That means that the second segment gets cut
off a bit, and that might be fine, but if you're already
playing in that second segment, you might again stall or
glitch the decoder. So in general you want your player to
avoid that: you want your player to only try a quality
switch a bit further from current time. But in some cases
even that is not possible: if you've really depleted your
buffer and you have to do a downswitch, you don't really
have any other choice as to switch at current time. So
even better if you can author your stream to align segment
boundaries across qualities and you can avoid this problem
entirely.

So there we have it: we've built our own video element
with most of the video API in place, we can play streaming
video. You can try this out yourself in Chrome today, link
is on the screen, and this uses WebCodecs so you need a
modern version of Chrome for this. We learned on the way
that decoding is quite tricky to get right and that the
video player needs to be very careful when it's cleaning
its buffer and switching qualities. WebCodecs is also a
pretty neat API, like this is the first project I used it
in and it works quite well for its use case. I hope it
catches on in other browsers too, so we can do more cool
stuff with this.

A couple of links if you can't get enough of WebCodecs
like me...

And that'll be all from me, thank you!
