import type { AuslanLexicon, AuslanSignAsset, ConceptId, PoseFrameSet } from '../types';

let lexiconPromise: Promise<AuslanLexicon> | null = null;
const poseCache = new Map<ConceptId, Promise<PoseFrameSet>>();

/**
 * Loads the static, attribution-rich lexicon manifest once and caches it.
 * Kept as its own module (not baked into UI components) so the metadata --
 * source, licence, validation status -- lives in exactly one place.
 */
export function loadLexicon(): Promise<AuslanLexicon> {
  if (!lexiconPromise) {
    lexiconPromise = fetch('signs/auslan/lexicon.json').then((r) => {
      if (!r.ok) throw new Error(`Failed to load Auslan lexicon: ${r.status}`);
      return r.json();
    });
  }
  return lexiconPromise;
}

export async function getAsset(concept: ConceptId): Promise<AuslanSignAsset | null> {
  const lexicon = await loadLexicon();
  return lexicon.entries.find((e) => e.concept === concept) ?? null;
}

/** Lazily fetches and caches the pose-frame data for one concept's sign. */
export function loadPoseFrames(asset: AuslanSignAsset): Promise<PoseFrameSet> {
  let promise = poseCache.get(asset.concept);
  if (!promise) {
    promise = fetch(asset.poseFile).then((r) => {
      if (!r.ok) throw new Error(`Failed to load pose data for ${asset.concept}: ${r.status}`);
      return r.json();
    });
    poseCache.set(asset.concept, promise);
  }
  return promise;
}

/** Preloads a small set of concepts' pose data ahead of time so playback starts instantly. */
export function preload(concepts: ConceptId[]): void {
  loadLexicon().then((lexicon) => {
    for (const id of concepts) {
      const asset = lexicon.entries.find((e) => e.concept === id);
      if (asset) loadPoseFrames(asset);
    }
  });
}
