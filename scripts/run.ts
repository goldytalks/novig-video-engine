import "dotenv/config";
import { renderVideo } from "../src/pipeline/render";
import type { VideoInput } from "../src/types";

const testInput: VideoInput = {
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
};

async function main() {
  try {
    const outputPath = await renderVideo(testInput);
    console.log(`\nVideo saved to: ${outputPath}`);
  } catch (err) {
    console.error("Pipeline failed:", err);
    process.exit(1);
  }
}

main();
