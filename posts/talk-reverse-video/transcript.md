---
title: "Transcript: The curious player of Benjamin Button"
---

_Tskumied iejaab doeg!_ (reversed: "Thank you, Demuxed!") Wait, um,
sorry — that's my outro slide, I think I'm still in reverse. Anyway,
there we go.

Hello, Demuxed! Thanks for having me back, and look, I even brought some
professionally looking slides this time. So, I'm Mattias, and I'm once
again going to talk about making a video player on the web. But this
time, I'm making the player go backwards.

Now, why would we need this? Like, video should just go forward, why do
we need it to go backwards? Well, for video editing it'd be helpful: if
you want to find the exact frame where something happens, to mark the
start of a clip, it helps to go backwards and forwards for a bit instead
of repeatedly seeking all over the place. Or, if you're a video-assisted
referee, you may want to find the exact frame when an attacker kicks the
ball, and then draw an imaginary line across the field or something like
that — I don't know how the offside rule works. Or, thirdly, you may want
to make funny GIFs, which are funnier in reverse — like, they have a
green tongue, and that's the reason why the internet exists after all.

So, isn't this already possible? Well, if you ask MDN, it says that if
the `playbackRate` is negative, the media is played backwards. Problem
solved! Well, yes, but actually no. If you scroll down that page, you get
to the browser compatibility table, and for Chrome it says: setting the
`playbackRate` to a negative value will throw an error. So, well, that's
just Chrome — maybe we'll have better luck in another browser. Okay,
let's hope for Safari — that says full support, so maybe Safari works.
So here's Safari: this is a video playing directly in Safari, this is
just playing forwards. I'm now using the console to put it backwards,
with a `playbackRate` of minus one, and... okay, this is more of a
slideshow, this is not really playing backwards, I'd say. So, valiant
effort, but no, this doesn't count.

So, now what? None of the major browsers support reverse playback, so
are we out of options? Well, if we can't use the browser's video element,
then maybe — just maybe — we can make our own video element, right? Yes!
I am bringing back baby video element for a second iteration this year.
Love it. If you missed my talk last year, or you've erased that from
your long-term memory, here's a quick recap: baby video element is an
HTML custom element which implements part of the video element API —
`play()`, `pause()`, `currentTime`, events, that sort of stuff — along
with the Media Source Extensions API, so you can do things like
`MediaSource`, `SourceBuffer`, `appendBuffer()`. It'll parse your fMP4
into individual video frames, it'll then decode those frames using the
WebCodecs API, and it'll render those video frames to a `<canvas>` for
display.

Now we are going to make that player go backwards. We need to do three
things for that: we need to buffer in reverse, we need to decode in
reverse, and we need to render in reverse.

So, step one: buffering. In a normal player, this is what your buffering
loop looks like, somewhat: if you have enough buffer after your current
time, you're good, just wait a bit, don't need to do anything just yet.
If you don't, you find the next segment that goes after your end of
buffer, you download and append that, and if it's the last segment then
you're done buffering, otherwise just repeat, go back to the top. We
want to do this in reverse, so we just find-and-replace a couple of
things: we need to check for enough buffer *before* current time, we
need to find the *previous* segment, and we're only done when we reach
the *first* segment. This way, we'll buffer from the back of the video
all the way to the front.

Great, so we've got that, we have appended our fMP4 segments, we've
parsed them into individual frames. Now we just need to decode them in
reverse: start with frame six, run that through the `VideoDecoder` from
WebCodecs, store the resulting decoded frame, then we just do frame
five, frame four, frame three, and so on, right? Should work. Ah, wait,
that's weird, I didn't put this slide here — I guess I should warn you
that there's going to be flashing images on the next slide. That doesn't
really bode well for my video decoder though, so here it goes: we'll put
the player in reverse mode and then play, and... oh god, yeah, no,
that's not how I remember it. As video engineers, we've all seen those
green frames before, and they haunt our nightmares. So let's get rid of
that.

So, what went wrong? Well, the video consists mostly of P-frames and
B-frames, and we cannot decode those independently. There's this thing
called inter-frame prediction, which uses motion vectors, and we can't
just reverse that to get reverse decoding to work. So, within a group of
pictures — a GOP — we actually have to send the frames in their original
order. We can still change the order of the GOPs, though, so that would
look something like this: our frame six is actually in GOP two, so to
decode this we need to first decode our key frame, frame four, and then
decode the others in their original order, and then we'll get on with
GOP one, and keep those in our decoded frame buffer.

Now the only thing that's left is rendering: so, on every animation
frame, we decrease the current time by the elapsed wall-clock time, we
find the frame at that current time, and we draw that to the canvas.
Now, the decoded frames are in a slightly different order, so we have to
look a bit further in our list, but that's all doable. So then that
looks something like this — and that is a reverse-playing Big Buck
Bunny. The butterfly is going backwards, Big Buck Bunny has never seen
this before, he smells some flowers in reverse. Great, that works!

So, we got this thing working, but we've encountered some challenges
along the way, and that impacts some of the performance of this thing.
For example, we need to keep the entire group of pictures in memory,
because the first frame that we decode is actually the last frame that
we want to render out of that GOP, and the GPU can only hold so many
fully decoded video frames in its video memory. So we actually have to
copy those frames out of video memory and back into it when we need
them, which is slightly less efficient, but hey, at least it works — we
got it working, which is the main point we're trying to make. When we
finally render that first video frame, we should also have that next
frame ready, which is actually the last frame of the previous GOP — if
you're still following along — so we need to make sure that we have at
least two GOPs fully decoded by then. So, that again puts some pressure
on the memory. This is usually not a problem if you have a desktop
device with plenty of RAM, but it might not play as smoothly on low-end
smartphones. You can try downloading more RAM or something, I guess,
that's what you're supposed to do then.

As a bonus, I've also made this thing play audio. I don't really have a
use case for this, it's just for fun, but it's much simpler than video:
audio frames, you can decode those fully independently. And then we also
need to make sure that — since each frame actually contains multiple
samples — we reverse those as well, if you want it fully reversed. We
use Web Audio to render these: there's the `AudioBufferSourceNode`,
which you can give an audio buffer and it'll play it for you at a set
time, so we can schedule things slightly in advance to avoid leaving
gaps, and we can concatenate multiple audio frames to reduce the number
of nodes that we use. Ideally you'd use `AudioWorklet` for this, I
didn't get that to work yet, but maybe future work. This is what that
looks and sounds like — there's a bit of a crackle, if you're listening
to this on the livestream, so maybe I should really give `AudioWorklet`
a try. But at least we get the good ending of Big Buck Bunny, because
the butterfly lives again. Glorious.

So there you have it. If you want to toy around with this, you can scan
the QR code, or go to my GitHub profile, it's all there. Thanks for
listening! Oh, and if you're still watching this talk in reverse for
some reason... _Tskumied ooleh!_ (reversed: "Hello, Demuxed!")
