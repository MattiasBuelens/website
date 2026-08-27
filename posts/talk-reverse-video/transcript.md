---
title: "Transcript: The curious player of Benjamin Button"
---

[Music]
wait um sorry that's my outro slide I
think I'm still in Reverse anyway there
we go hello de uh thanks for having me
back and look I even brought some
professionally looking slides this time
so I'm maos uh I'm once again going to
talk about making a video player on the
web but this time I'm making the player
go
backwards now why would do why would we
need this like video should just go
forward why do we need it go backwards
well for video editing it'd be helpful
if you want to find the exact frame that
something happens to make this to Mark
the start of a clip to go backwards and
forwards for a bit instead of like
repeatedly seeking uh all over all over
the place uh or if you're a video
assisted referee um you may want to find
the exact frame when an attack backer
kicks the ball uh and then draw an
imagineer white line over the field or
something like that I don't know how the
offside rle Works um or thirdly you may
want to make funny gifts which are
funnier in Reverse like it's they have a
green tongue and that's the reason why
the internet exists after all so isn't
this already possible well if you ask
mdn uh it says that if the playback rate
is negative the media is played
backwards so problem solved um well yes
but actually no if you scroll down that
page you get to the browser
compatibility and for Chrome it says
well setting the playback rate to
negative value will throw you an error
so well that's just Chrome let's maybe
we have better luck in another browser
okay let's hope for Safari that says
full support so maybe Safari works so
here's Safari uh this is a video playing
directly in Safari this is just playing
forwards I'm now using the console to
put it backwards with playback rate
minus one and okay this is more of a
slideshow this is not really playing
backwards I'd say so Valiant effort but
no this doesn't count so now what none
of the major browsers support reverse
playback so are we out of options well
if we can't use the browser's video
element then maybe just maybe we can
make our own video element right yes I
am bringing back baby video element for
a second iteration this year love it um
if you missed my talk last year uh or
you've erased that from your long-term
memory here's a quick recap um so baby
viment is an HTML custom element uh
which implements part of the video
element API with like play pause current
time events all that s sort of stuff uh
along with the media extensions API so
you can do uh add Source buffer a pend
buffer to it um and have streaming
playback that way um it'll parse your
fmp4 into individual video frames it'll
then decod those frames using the web
codex API and it'll render those video
frames to a canvas for display now we
are going to make displayer go backwards
we need to do three things for that we
need to buffer in Reverse we need to
decode in reverse and we need to render
in Reverse so step one buffering in a
normal player this is what your
buffering L Loop looks like somewhat um
if you have enough buffer after your
current time you're good just wait a bit
don't need to do anything just yet if
you don't need to find the next segment
uh that goes after your end of buffer uh
you download an append that and if it's
the last segment then you're done
buffering otherwise just repeat go back
to the top um and and get on with the
next segment we want to do this in
Reverse so we just find replace a couple
of things uh we need to check for enough
buffer Before curent Time uh we need to
find the previous segment and when we're
done and we're only done when we reach
the first segment so this way we'll
buffer from the back of the video all
the way to to the front great so we've
got that we have appended our fmp4
segment we've pared them into individual
frames now we just need to decode them
in Reverse so start with frame six run
that run that through uh the video
decoder from web codex store the
resulting decoded frame then we just do
frame five frame four frame three and so
on right should
work ah wait that's weird um I didn't
put this slides here uh I guess should
warn you that there's going to be
flashing images on the next slide uh
that doesn't really bod well for my
video player though so here it goes um
we'll put the player in Reverse mode and
then play and oh God yeah know uh that's
not how I remember it um we've all seen
those green frames before and they haunt
our nightmares so let's get rid of that
uh so what went wrong well the video
consists mostly of P frames and B frames
and we cannot decot those independently
there's this thing called interframe
prediction which uses like motion
vectors and we can't just reverse that
to get reverse uh decoding to work um So
within a group of pictures we actually
have to send the frames in their
original order can still change the
order of the gobs though so that would
look like something like this so our six
frame is actually in Gob two so to
decode this we need to First decode our
key frame frame four and then decode the
others in the in their original order
and then we'll get on with cop one keep
those in our decoded frame buffer now
the only thing that's left is rendering
um so on every animation frame we
decrease the current time by the elaps
walk loock time uh we find a frame on
that current time and we draw that to
Canvas um now the decoded frames are in
a slightly different order so we have to
look a bit further in our list but
that's all doable um so then that looks
something like this and that is a
reverse playing big bug bunny like the
butterflies going backwards bugb bunny
has never seen this before he smells
some flowers in Reverse like great that
works so we got this thing working but
we've encountered some challenges along
the way and that impacts some of the
performance of this thing uh for example
we need to keep the entire group of
pictures in memory because the first
frame that we decode is actually the
last frame that we want to render out of
that c and the GPU Can Only Hold so many
fully decoded video frames in its video
memory so when we uh so we actually have
to copy those frames out of video memory
and back into it when we need them which
is slightly less efficient but hey at
least it works we got we got it working
which is the main point we're trying to
make um when we fin finally render that
first video frame we should also have
that next frame ready which is actually
the last frame of the pre previous GOP
if you're still following along uh so we
need to make sure that we have at least
two gops fully decoded by then um so
which again puts some pressure on the
memory um this is usually not a problem
if you have a desktop device with plenty
of ram but it might not play as smoothly
on low rent smartphones you can try
downloading Ram or something I guess
that's what you're supposed to do then
um as a bonus I've also made this thing
play audio um I don't really have a use
case for this it's just for fun uh it's
much simpler than audio than video audio
frames you can encode the you can decode
those fully independently um and then we
also need to make sure that each frame
um actually contains multiple samples so
reverse those as well if you want it
fully
reversed um we use web uh web audio to
uh render these um there's the audio
buffer Source note which you can give an
audio buffer and it'll play it for you
at a set time so we can schedule things
slightly in advance uh to avoid leaving
gaps uh and we can Cate multiple audio
frames to reduce the number of nodes
that we use ideally you'd use audio
worklet for this I didn't get this to
work yet um but maybe future work and
this is what that looks and sounds like
there's a bit of a crackle uh if you're
listening on this in the live stream uh
so maybe I should really give audio
workl try but at least we get the good
ending of Big B because the butterflyer
lives again
glorious so there you have it if you
want to toy around this with this um you
can scan the QR code go to my GitHub
profile it's all there thanks for
listening oh and if you're still
watching this talk in Reverse for some
reason uhum
[Music]
[Music]
ELO
