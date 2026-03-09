export type PickTimeline = {
  playerName: string;
  team: string;
  headshotUrl: string | null;
  line: string;
  segmentIndex: number;
};

export type VideoInput = {
  title: string;
  date: string;
  handle: string;
  script: ScriptSegment[];
  broll: BRollSlot[];
  picks?: PickTimeline[];
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
