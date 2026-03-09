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

export type StatMoment = {
  /** Frame index relative to audio start (i.e. relative to the main content Sequence) */
  startFrame: number;
  endFrame: number;
  statNumber: string;
  label: string;
  playerName: string;
};

export type SportsVideoProps = {
  input: VideoInput;
  words: WordTimestamp[];
  audioSrc: string;
  durationInFrames: number;
  /** Frame at which the intro ends and audio/captions begin. Default: 90 (3s @ 30fps) */
  introEndFrame?: number;
  /** Frame at which the outro begins. Default: durationInFrames - 120 (4s @ 30fps) */
  outroStartFrame?: number;
  /** Pre-detected stat moments (relative to audio start) */
  statMoments?: StatMoment[];
};
