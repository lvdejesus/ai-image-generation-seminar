# Flow audit

An audit of the talk flow as it was on 2026-11-14 (28 beats, 9:57). Priorities: [1] attention, [2] knowledge retention. Slides are named by their headline at the time of the audit.

## Big issues

**1. No spine that people remember (retention).**
Many slides go past, but nobody hears what 3 things to keep. The talk has three ideas:

1. Remove noise in small steps.
2. The text steers every step.
3. Work on a compressed image.

Proposal: after the intro run, say "three ideas" and show them. Add one at the end of Sections II, III and IV. Show all three at "The whole system" and at the close. The growing diagram is the visual form of this. Without it, "The whole system" is a new diagram that people must read from zero at minute 8.

**2. No noise-to-image change for a long time (attention).**
The intro is a question, a rejection, a word ("denoising") and the lighthouse. Proposal: show the real run from noise to the lighthouse early ("how this works is the talk"), so "Repeat, and an image appears" pays off something people already saw. Merge "It learns to remove noise" and "So how does the model learn to remove noise?"; they make the same claim.

**3. "What happens when you type a prompt?" is 20 s on an almost empty slide.**
The first 20 s decide attention. Cut it to about 10 s, or ask the room for a prompt here and use it in the live demo, so the audience has a reason to wait for the end.

**4. Section II is half the talk with no break.**
From "Training: make noisy examples" to "And repeat: small steps", the visual pattern repeats (noisy image → arrow → image). Proposal: prediction moments. They cost about 0 s and raise both attention and retention.
- "Caption in, image out? A blur.": ask "What does it draw for 'a lighthouse'?" Pause, then the blur.
- "A lot of noise: the guess is bad.": ask "Which of these four men is under the noise?" Nobody can tell; that is the point.
- "Pixels are full of detail we cannot see.": ask "Spot the difference."

## Challenges to decisions

**5. Prompt chips everywhere weaken Section III.**
The audience sees a prompt from the training slides on, so "The text steers every step" (45 s) is not a surprise. Keep the chips, but make it a failure and a fix: the same noise with no prompt gives "some image"; then the same noise with three prompts.

**6. "Not exact, but good enough" repeats "Pixels are full of detail we cannot see" and "Train a compressor".**
"Train a compressor" already shows that the decompressed image looks the same. Cut the slide and say its line at the end of "Train a compressor".

**7. "It fills in from what it has seen" (anime model against photo model) is a side branch.**
It supports the close ("nothing was combined"), but it sits between the payoff and Section III, and the slack is small. Keep it only if the close calls back to it; else cut it first.

**8. The latent-noise reveal in "The noise goes into the latent" needs a setup.**
"Noise has levels" already shows colour blotches, not fine grain. Sharp viewers will feel misled. There, say: "This noise looks odd. We come back to that."

## Smaller issues

**9. "Caption in, image out? A blur." and "One big guess gives a blur." have no link.** Make the second a callback: "the same blur again". Its blur is mild; on a projector it looks like a soft photo. Show it next to a sharp portrait, or make it stronger.

**10. "Train a compressor" puts its key idea in small captions.** Keep one line on screen ("Invisible differences cost nothing"); say the JPEG line.

**11. Small text in general.** Many labels are small mono caps. Check on the real projector from the back row. A label that carries the message must be callout size.

**12. "The model guesses the clean image" and "Training shrinks the difference" show "TEXT ENCODER" before Section III explains it.** Say "we come back to this".

**13. The close recalls only the collage.** Add the three ideas, so the last thing people see is what to keep.

**14. The live demo (45 s) with 3 s of slack.** Cut a slide for a buffer. Restore the word filter in `server/proxy.py` before the talk.

## Order of work

1. The three-idea spine with the growing diagram (points 1 and 13).
2. The early run; merge the two intro slides (point 2).
3. Prediction pauses (point 4).
4. Cut "Not exact, but good enough" (point 6).
5. "The text steers every step" as failure → fix (point 5).
6. Small fixes: points 8, 9, 10, 12.

## Status

- **Step 1, done.** The diagram grows in "So far: one idea." (end of II), "So far: two ideas." (end of III) and "Denoise the latent, decode once." (end of IV). "The whole system: three ideas." lights each idea in turn. "How it works, in three ideas." names them in the intro, and the close lists them.
- **Step 2, done.** The old intro already played the real run, so this was a merge: "It learns to remove noise." now plays that run, and the "denoising" word is gone.
- **Step 3, done.**
  - The blur slide is now two slides: "Caption in, image out?" (four right answers, an empty frame with "?") and "One answer for all of them: a blur."
  - "Spot the difference." shows the two lighthouses with no labels, before "Pixels are full of detail we cannot see."
  - The four-men question is in the speaker text of "A lot of noise: the guess is bad."; its end state already holds the question.
- **Step 4, done.** Its line is now the last sentence of "Train a compressor".
- **Step 5, done.** "No text: some image." runs the same noise with no prompt (a real recording with an empty prompt and an empty negative: an anime girl with a red bag), then "The text steers every step." (30 s).
- **Step 6 and points 3, 7, 11, 14: open.**
- Now 32 slides, 9:49, 11 s of slack.
