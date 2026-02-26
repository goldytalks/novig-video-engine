import "dotenv/config";
import axios from "axios";
import { execSync } from "child_process";

async function main() {
  console.log("\n🔧 Novig Video Engine — Dev Setup Check\n");

  // 1. Env vars
  console.log("Environment Variables:");
  const envChecks = [
    { key: "ELEVENLABS_API_KEY", label: "ElevenLabs API Key" },
    { key: "ELEVENLABS_VOICE_ID", label: "ElevenLabs Voice ID" },
    { key: "OPENROUTER_API_KEY", label: "OpenRouter API Key" },
  ];
  for (const { key, label } of envChecks) {
    const val = process.env[key];
    console.log(`  ${val && val.length > 5 ? "✅" : "⚠️ "} ${label}: ${val ? "set" : "NOT SET"}`);
  }

  // 2. ElevenLabs ping
  console.log("\nAPI Connectivity:");
  try {
    const elKey = process.env.ELEVENLABS_API_KEY;
    if (elKey) {
      const resp = await axios.get("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": elKey },
        timeout: 5000,
      });
      console.log(`  ✅ ElevenLabs: connected (${resp.status})`);
    } else {
      console.log("  ⚠️  ElevenLabs: skipped (no key)");
    }
  } catch (err: any) {
    console.log(`  ❌ ElevenLabs: ${err.message}`);
  }

  // 3. OpenRouter ping
  try {
    const orKey = process.env.OPENROUTER_API_KEY;
    if (orKey) {
      const resp = await axios.get("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${orKey}` },
        timeout: 5000,
      });
      console.log(`  ✅ OpenRouter: connected (${resp.status})`);
    } else {
      console.log("  ⚠️  OpenRouter: skipped (no key)");
    }
  } catch (err: any) {
    console.log(`  ❌ OpenRouter: ${err.message}`);
  }

  // 4. Endpoints
  console.log("\nAvailable Endpoints:");
  console.log("  GET  /           → Dashboard UI");
  console.log("  GET  /health     → Health check");
  console.log("  GET  /config     → Endpoint discovery");
  console.log("  GET  /history    → Render history");
  console.log("  GET  /renders/:id → Download past render");
  console.log("  POST /render     → Render from VideoInput JSON");
  console.log("  POST /render-from-script → Render from script text");
  console.log("  POST /render-from-url    → Fetch script from URL + render");

  // 5. Open browser
  console.log("\nOpening dashboard...");
  try {
    execSync("open http://localhost:3000", { stdio: "ignore" });
  } catch {
    console.log("  (Could not open browser automatically)");
  }

  console.log("\n✅ Setup check complete. Run 'npm start' to start the server.\n");
}

main().catch(console.error);
