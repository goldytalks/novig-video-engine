import "dotenv/config";
import { scripterOutputToVideoInput } from "../src/scripterConnector";
import { renderVideo } from "../src/pipeline/render";

const mockScripterOutput = {
  script:
    "Steph Curry is on fire this season. The Warriors are covering spreads at a 68% clip. Tonight we like Golden State minus 4.5 against the Blazers. Curry drops 35 and this is easy money.",
  title: "NBA Thursday Picks",
  date: "February 26",
  handle: "@novig",
  players: ["Steph Curry", "Golden State Warriors"],
};

async function main() {
  console.log("=== Scripter Connector Test ===\n");
  console.log("Input script:", mockScripterOutput.script.substring(0, 60) + "...");
  console.log("Players:", mockScripterOutput.players.join(", "));

  const videoInput = scripterOutputToVideoInput(mockScripterOutput);

  console.log("\nConverted to VideoInput:");
  console.log(`  Title: ${videoInput.title}`);
  console.log(`  Segments: ${videoInput.script.length}`);
  console.log(`  B-roll slots: ${videoInput.broll.length}`);
  for (const slot of videoInput.broll) {
    console.log(`    - ${slot.id}: "${slot.label}" [${slot.startFrame}-${slot.endFrame}]`);
  }

  console.log("\nRendering video...");
  const outputPath = await renderVideo(videoInput);
  console.log(`\nDone! Video saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
