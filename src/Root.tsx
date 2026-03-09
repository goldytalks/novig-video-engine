import React from "react";
import { Composition } from "remotion";
import { SportsVideo } from "./compositions/SportsVideo";
import type { SportsVideoProps } from "./types";

// INTRO: 90 frames (3s), OUTRO: 120 frames (4s), MAIN BODY: 450 frames (15s)
// Total: 660 frames (22s)
const INTRO_END = 90;
const OUTRO_START = 570;
const TOTAL_FRAMES = 690;

const defaultProps: SportsVideoProps = {
  input: {
    title: "NBA Wednesday Picks",
    date: "February 25",
    handle: "@novig",
    script: [
      {
        text: "The Cavs are sweeping everyone in their path right now. Donovan Mitchell is averaging 28 points this season. Tonight against the Lakers, we're backing Cleveland to cover the spread. Take the Cavs minus four. This is a lock.",
      },
    ],
    broll: [
      { id: "cavs_1", label: "Cavs Highlights", playerName: "Donovan Mitchell", startFrame: 0, endFrame: 120, asset: null },
      { id: "mitchell_1", label: "Donovan Mitchell", playerName: "Donovan Mitchell", startFrame: 120, endFrame: 240, asset: null },
      { id: "lakers_1", label: "Lakers Game", startFrame: 240, endFrame: 360, asset: null },
      { id: "cavs_2", label: "Cleveland Arena", startFrame: 360, endFrame: 480, asset: null },
    ],
  },
  words: [],
  audioSrc: "",
  durationInFrames: TOTAL_FRAMES,
  introEndFrame: INTRO_END,
  outroStartFrame: OUTRO_START,
  statMoments: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SportsVideo"
      component={SportsVideo}
      durationInFrames={defaultProps.durationInFrames}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
    />
  );
};
