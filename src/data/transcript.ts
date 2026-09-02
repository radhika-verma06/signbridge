import type { TranscriptLine } from '../types';

/**
 * Real, timestamped transcript of public/videos/newtons-second-law.webm
 * ("STEMonstrations: Newton's Second Law of Motion", NASA/ISS).
 *
 * Generated locally with OpenAI Whisper ("small" model, word-level timestamps
 * enabled, run against the video's own audio track -- no timestamps were
 * hand-invented). See README.md "Transcription method" for the exact process.
 */
export const LESSON_DURATION_SECONDS = 128.7;

export const TRANSCRIPT: TranscriptLine[] = [
  { id: 't1', start: 15.0, end: 19.5, text: "Hello everyone, I'm astronaut Randy Bresnik, living and working aboard the International" },
  { id: 't2', start: 19.5, end: 25.1, text: 'Space Station. Now, on the space station, we live in a microgravity environment. Do' },
  { id: 't3', start: 25.1, end: 28.6, text: "you think the laws of physics will hold up? Come on, let's go find out." },
  { id: 't4', start: 32.7, end: 37.0, text: 'The acceleration of an object depends on the net force acting on the object and the mass of the' },
  { id: 't5', start: 37.0, end: 42.8, text: 'object, or F equals MA. Surely, good show, sir Isaac. Here we see that once the force of the thrust' },
  { id: 't6', start: 42.8, end: 48.1, text: 'is greater than the weight of the vehicle, the rocket begins to accelerate. We’re gonna start' },
  { id: 't7', start: 48.1, end: 55.2, text: "with something small, something you might have at home, a little stick of chapstick. We'll go ahead" },
  { id: 't8', start: 55.2, end: 61.9, text: "and use our force being our bungee quote here. We'll put it on our bungee and we'll pull it back" },
  { id: 't9', start: 62.7, end: 70.7, text: "and you can see how fast it accelerates because there's very little mass. Next we'll try a little" },
  { id: 't10', start: 70.7, end: 76.9, text: 'spaceship, a little more massive, and you can feel that because as you move it you can feel' },
  { id: 't11', start: 76.9, end: 81.9, text: 'the kind of force, the extra force you have to push with your hand. So we’ll put our spaceship on our' },
  { id: 't12', start: 81.9, end: 84.5, text: 'launcher here, same spot.' },
  { id: 't13', start: 87.9, end: 95.1, text: "Notice it's flying a lot slower than that chapstick did. What we've seen is the same amount of force" },
  { id: 't14', start: 95.8, end: 100.9, text: 'on a smaller, less massive object means the acceleration is faster. This is the biggest,' },
  { id: 't15', start: 100.9, end: 105.0, text: "most massive thing we have. So let's see how the acceleration is affected." },
  { id: 't16', start: 107.8, end: 111.3, text: 'Pull back the same amount on the force, and here we go.' },
  { id: 't17', start: 117.0, end: 120.2, text: "There you have it, Newton's second law of motion in action." },
  { id: 't18', start: 122.2, end: 125.9, text: 'Thanks everybody for exploring a little physics with me today. Now I’m going to send it back to' },
  { id: 't19', start: 125.9, end: 128.7, text: 'Earth so you can start your experiments. See you again real soon.' },
];
