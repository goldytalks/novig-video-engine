# Novig Video Engine

A TypeScript/Express server that takes a sports betting script and renders a vertical MP4 video (1080x1920, 9:16) for YouTube Shorts and IG Reels. The pipeline extracts transcripts from video URLs, generates narration scripts via Claude Sonnet, synthesizes audio with ElevenLabs TTS (including word-level timestamps), and renders the final video with Remotion.

## Setup

```bash
git clone https://github.com/goldytalks/novig-video-engine.git
cd novig-video-engine
npm install
brew install yt-dlp ffmpeg
cp .env.example .env
# Fill in your API keys in .env
```

## Environment Variables

| Variable | Source | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) | Claude Sonnet script generation |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) | TTS audio + word-level timestamps |
| `ELEVENLABS_VOICE_ID` | ElevenLabs dashboard | Voice ID (default: `pNInz6obpgDQGcFmaJgB`) |
| `GOOGLE_AI_KEY` | [aistudio.google.com](https://aistudio.google.com) | Gemini native video transcription fallback |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | Whisper transcription for IG/Shorts |

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/config` | Server config and available endpoints |
| `POST` | `/render` | Render from a full `VideoInput` JSON payload |
| `POST` | `/render-from-script` | Render from scripter output (script text + metadata) |
| `POST` | `/render-from-url` | Render from a scripter URL |
| `GET` | `/renders` | List recent renders (last 10) |
| `GET` | `/renders/:id` | Download a rendered MP4 |
| `DELETE` | `/renders/:id` | Delete a render |
| `POST` | `/api/transcribe` | Transcribe a video URL (YouTube/IG/Twitter) |
| `POST` | `/api/generate` | Generate a script from a URL or manual transcript |

## B-Roll Assets

Place `.mp4` clips in the `broll/` folder at the project root. The asset resolver matches clips to b-roll slots by slugified filename:

- Player names: `donovan-mitchell.mp4`, `lebron-james.mp4`
- Labels: `cavs-highlights.mp4`, `game-footage.mp4`

Matching is bidirectional substring — if the filename contains the player slug or vice versa, it matches. Unmatched slots render a placeholder card.

The `broll/` folder is gitignored for `.mp4` files so clips stay local.

## Triggering a Render via curl

```bash
curl -X POST http://localhost:3000/render-from-script \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Your narration script goes here. Multiple sentences will be split into segments.",
    "title": "NBA Wednesday Picks",
    "date": "March 9",
    "handle": "@novig",
    "players": ["Donovan Mitchell", "LeBron James", "Stephen Curry"]
  }' \
  --output video.mp4
```
