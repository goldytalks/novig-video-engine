import { Composition } from "remotion";
import { SportsVideo } from "./compositions/SportsVideo";
import type { SportsVideoProps } from "./types";

const defaultProps: SportsVideoProps = {
  input: {
    title: "NBA Wednesday Picks",
    date: "February 25",
    handle: "@novig",
    script: [
      {
        text: "The Cavs are sweeping everyone in their path right now. Donovan Mitchell is playing out of his mind. Tonight against the Lakers, we're backing Cleveland to cover the spread. Take the Cavs minus four. This is a lock.",
      },
    ],
    broll: [
      { id: "cavs_1", label: "Cavs Highlights", playerName: "Donovan Mitchell", startFrame: 0, endFrame: 90, asset: null },
      { id: "mitchell_1", label: "Donovan Mitchell", playerName: "Donovan Mitchell", startFrame: 90, endFrame: 180, asset: null },
      { id: "lakers_1", label: "Lakers Game", startFrame: 180, endFrame: 270, asset: null },
      { id: "cavs_2", label: "Cleveland Arena", startFrame: 270, endFrame: 360, asset: null },
    ],
  },
  words: [],
  audioSrc: "",
  durationInFrames: 450,
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
