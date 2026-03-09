import "dotenv/config";
import { renderVideo } from "../src/pipeline/render";
import type { VideoInput } from "../src/types";

const input: VideoInput = {
  title: "NBA Test — Wemby Picks",
  date: "March 9",
  handle: "@novig",
  script: [
    {
      text: "Victor Wembanyama is averaging 26 points and 10 rebounds this season. The Spurs have been playing well — they're on a seven and three record over the last ten games. Tonight against the Rockets, we're taking Wemby to go over his points line. Zero vig on Novig. Download free, link in bio.",
    },
  ],
  broll: [
    { id: "wemby_1", label: "Victor Wembanyama", playerName: "Victor Wembanyama", startFrame: 0, endFrame: 100, asset: null },
    { id: "wemby_2", label: "Wembanyama Blocks", playerName: "Victor Wembanyama", startFrame: 100, endFrame: 200, asset: null },
    { id: "spurs_1", label: "San Antonio Spurs", startFrame: 200, endFrame: 300, asset: null },
    { id: "rockets_1", label: "Houston Rockets", startFrame: 300, endFrame: 400, asset: null },
  ],
  picks: [
    {
      playerName: "Victor Wembanyama",
      team: "San Antonio Spurs",
      headshotUrl: null,
      line: "Over 25.5 points",
      segmentIndex: 0,
    },
  ],
};

const outPath = `output/test_${Date.now()}.mp4`;
console.log("Starting test render...\n");

renderVideo(input, outPath)
  .then((p) => {
    console.log(`\n✓ Done: ${p}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n✗ Render failed:", err.message);
    process.exit(1);
  });
