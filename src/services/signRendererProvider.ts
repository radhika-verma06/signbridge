import * as auslanLexiconProvider from './auslanLexiconProvider';
import type { AuslanSignAsset, ConceptId, PoseFrameSet } from '../types';

export interface ResolvedSign {
  asset: AuslanSignAsset;
  frames: PoseFrameSet;
}

/**
 * The seam between "SignBridge wants to show a concept being signed" and
 * "however that sign actually gets produced". Today this is backed by the
 * hand-built pose lexicon extracted from MM-WLAuslan. A future provider
 * (Text2Sign, a generative model, a remote API, human-video retrieval) can
 * implement the same interface and be swapped in here without any UI
 * component changing.
 */
export interface SignProvider {
  resolve(concept: ConceptId): Promise<ResolvedSign | null>;
}

class PoseLexiconSignProvider implements SignProvider {
  async resolve(concept: ConceptId): Promise<ResolvedSign | null> {
    const asset = await auslanLexiconProvider.getAsset(concept);
    if (!asset) return null;
    const frames = await auslanLexiconProvider.loadPoseFrames(asset);
    return { asset, frames };
  }
}

export const signProvider: SignProvider = new PoseLexiconSignProvider();
