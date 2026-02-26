export type VideoInput = {
  title: string;
  date: string;
  handle: string;
  script: ScriptSegment[];
  broll: BRollSlot[];
};

export type ScriptSegment = {
  text: string;
};

export type BRollSlot = {
  id: string;
  label: string;
  playerName?: string;
  startFrame: number;
  endFrame: number;
  asset: string | null;
};

export type WordTimestamp = {
  word: string;
  start: number;
  end: number;
};

export type SportsVideoProps = {
  input: VideoInput;
  words: WordTimestamp[];
  audioSrc: string;
  durationInFrames: number;
};
