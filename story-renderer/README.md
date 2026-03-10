# Story Renderer API

A FastAPI wrapper for ComfyUI that provides a clean, queue-based API for children's storybook image generation with **local validation and automatic retry**.

---

## 🎯 Key Features

- **Local Validation**: Uses Ollama Vision (LLaVA) to validate images on the GPU machine
- **Automatic Retry**: Failed images are regenerated up to 3x before returning
- **Only Validated Images Sent**: Mac only receives quality-checked, consistent images
- **Character Consistency**: IP-Adapter workflow for pixel-perfect character matching
- **Art Style Presets**: 23 styles including Bluey, Gruffalo, and Zog-inspired aesthetics

---

## 🏗️ Pipeline Architecture

```
Mac (story-engine)                     Windows PC (story-renderer)
─────────────────                      ─────────────────────────────
     │                                       │
     │  1. Send job request ─────────────►   │
     │     (prompt + validation options)     │
     │                                       ▼
     │                              ┌─────────────────────┐
     │                              │  VALIDATION LOOP    │
     │                              │  (max 3 attempts)   │
     │                              │                     │
     │                              │  ┌───────────────┐  │
     │                              │  │ ComfyUI Gen   │  │
     │                              │  └──────┬────────┘  │
     │                              │         │           │
     │                              │         ▼           │
     │                              │  ┌───────────────┐  │
     │                              │  │ Ollama LLaVA  │  │
     │                              │  │ Validation    │  │
     │                              │  └──────┬────────┘  │
     │                              │         │           │
     │                              │   Pass? │ No→ Retry │
     │                              │         │           │
     │                              │   Yes ──┴──►        │
     │                              └─────────────────────┘
     │                                       │
     │  ◄───────────────── Return ONLY       │
     │       validated final image           │
     ▼                                       │
Save to repo                                 │
  └─► Git push → GitHub Actions → GCP
```

### What Gets Validated

| Check | Score | Minimum |
|-------|-------|---------|
| Art Style | 0-100 | Matches requested style |
| Scene Accuracy | 0-100 | Matches scene description |
| Quality | 0-100 | No artifacts, extra limbs, distortions |

**Pass Criteria**: Average score ≥ 75 AND Quality ≥ 60

---

## 🚀 Quick Runbook (Windows PC)

```powershell
# ─────────────────────────────────────────────────────────────────
# FIRST-TIME SETUP
# ─────────────────────────────────────────────────────────────────
cd story-renderer
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env            # Set WORKER_API_KEY

# Install Ollama + LLaVA for image validation
# Download from https://ollama.ai, then:
ollama pull llava

# Open firewall (run as Administrator)
netsh advfirewall firewall add rule name="Story Renderer" dir=in action=allow protocol=tcp localport=8000
netsh advfirewall firewall add rule name="Ollama API" dir=in action=allow protocol=tcp localport=11434

# ─────────────────────────────────────────────────────────────────
# START SERVICES (every session)
# ─────────────────────────────────────────────────────────────────
# Terminal 1: Start ComfyUI
cd ComfyUI && python main.py --listen

# Terminal 2: Start Ollama (for LLaVA validation)
set OLLAMA_HOST=0.0.0.0 && ollama serve

# Terminal 3: Start Renderer API
cd story-renderer && venv\Scripts\activate && python main.py

# ─────────────────────────────────────────────────────────────────
# VERIFY SERVICES (from Mac)
# ─────────────────────────────────────────────────────────────────
curl http://192.168.1.213:8000/v1/health              # Renderer health
curl http://192.168.1.213:11434/api/tags              # Ollama models
curl http://192.168.1.213:8188/system_stats           # ComfyUI stats

# ─────────────────────────────────────────────────────────────────
# TROUBLESHOOTING
# ─────────────────────────────────────────────────────────────────
# Check active jobs
curl http://192.168.1.213:8000/v1/jobs

# Kill stuck job (if needed)
curl -X DELETE http://192.168.1.213:8000/v1/jobs/jr_XXXXX

# Restart renderer if frozen
# Ctrl+C in Terminal 3, then:
python main.py
```

### Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| Renderer API | 8000 | Job queue, file downloads |
| Ollama | 11434 | LLaVA vision validation |
| ComfyUI | 8188 | Image generation backend |

---

## 🎨 Art Style Presets

Use `npm run generate -- styles` on the Mac to see all available styles:

### Featured Styles (Inspired by Popular Children's Books)

| Style ID | Inspired By | Best Ages | Description |
|----------|-------------|-----------|-------------|
| `aussie-family` | Bluey | 2-6 | Clean flat colors, Australian suburban feel |
| `woodland-creature` | Gruffalo | 2-5 | Rich forest textures, enchanted woodland |
| `friendly-dragon` | Zog | 3-6 | Warm medieval fantasy, rounded characters |
| `penguin-classic` | Ladybird/Penguin | 1-4 | Educational picture book, timeless |
| `bedtime-dreams` | Nursery | 1-2 | Ultra-soft watercolors for youngest readers |
| `cozy-nordic` | Scandinavian | 2-5 | Muted hygge tones, warm interiors |
| `jungle-adventure` | Tropical | 2-5 | Vibrant lush colors, exotic animals |
| `farmyard-friends` | Farm | 1-4 | Wholesome pastoral scenes |

### Example Usage (Mac)

```bash
npm run generate -- -t "Luna the dragon learns to fly" --style friendly-dragon -a "3-6"
npm run generate -- -t "Bedtime for Baby Bear" --style bedtime-dreams -a "1-2"
npm run generate -- -t "Bingo and Bluey play cricket" --style aussie-family -a "2-6"
```

---

## Architecture

```
Mac (story-engine)
   → HTTP over local network
      → Windows PC (this service on port 8000)
         → ComfyUI on localhost:8188
         → Ollama on localhost:11434
```

## Setup on Windows PC

### 1. Prerequisites

- Python 3.11+
- ComfyUI running on `127.0.0.1:8188`
- Ollama with LLaVA model (for free image validation)

### 2. Install Ollama + LLaVA

```powershell
# Download from https://ollama.ai then:
ollama pull llava
```

### 3. Install Dependencies

```powershell
cd story-renderer
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure

```powershell
copy .env.example .env
# Edit .env and set WORKER_API_KEY
```

### 5. Allow Network Access (Windows Firewall)

Open PowerShell as Administrator:

```powershell
# Story Renderer API (port 8000)
netsh advfirewall firewall add rule name="Story Renderer API" dir=in action=allow protocol=tcp localport=8000

# Ollama API (port 11434)
netsh advfirewall firewall add rule name="Ollama API" dir=in action=allow protocol=tcp localport=11434
```

### 6. Configure Ollama for Network Access

Set environment variable or run with:

```powershell
set OLLAMA_HOST=0.0.0.0 && ollama serve
```

### 7. Run the Server

```powershell
python main.py
```

Server runs on `0.0.0.0:8000` (accessible from Mac)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/health` | Health check |
| GET | `/v1/capabilities` | Renderer capabilities |
| POST | `/v1/jobs` | Submit a render job |
| GET | `/v1/jobs/{job_id}` | Get job status |
| DELETE | `/v1/jobs/{job_id}` | Cancel a job |
| GET | `/v1/files/{file_id}` | Download generated image |
| GET | `/v1/jobs/{job_id}/events` | Stream progress (SSE) |

## Example Usage

### Submit a Job (from Mac)

```bash
curl -X POST http://192.168.1.100:8000/v1/jobs \
  -H "Content-Type: application/json" \
  -H "X-Worker-Key: your-secret-key" \
  -d '{
    "job_type": "page",
    "client_job_id": "book123-page001",
    "inputs": {
      "prompt": "A friendly fox in a magical forest, childrens book illustration",
      "width": 1024,
      "height": 1536,
      "steps": 28,
      "cfg": 5.5
    }
  }'
```

### Check Job Status

```bash
curl http://192.168.1.100:8000/v1/jobs/jr_01HZYX... \
  -H "X-Worker-Key: your-secret-key"
```

### Download Result

```bash
curl -o output.png http://192.168.1.100:8000/v1/files/img_01HZYX... \
  -H "X-Worker-Key: your-secret-key"
```

## Concurrency Policy

| Resource | Limit | Reason |
|----------|-------|--------|
| Active renders | 1 | Single GPU critical section |
| Queue depth | 20 | Prevent memory issues |

## 🔄 Validation Loop Details

The renderer validates each image **locally** before returning it:

```
┌─────────────────────────────────────────────────────────────┐
│  GENERATE → VALIDATE → PASS? → RETURN                      │
│      ↑                   │                                  │
│      └───── NO ──────────┘ (vary seed, retry up to 3x)     │
└─────────────────────────────────────────────────────────────┘
```

### Validation Criteria

1. **Art Style Score (0-100)**: Does it match the requested style?
2. **Scene Accuracy Score (0-100)**: Does it show the right elements?
3. **Quality Score (0-100)**: Free of AI artifacts?

### Quality Checks

- ❌ Extra limbs or missing body parts
- ❌ Distorted faces or eyes
- ❌ Morphed/melted characters
- ❌ Text artifacts or watermarks
- ❌ Unnatural proportions

### Retry Behavior

- On retry, the seed is varied (+1, +2, etc.) to produce different results
- Failed intermediate images are cleaned up from ComfyUI output
- Only the final validated image is saved and returned

---

## 👥 Character Consistency

For pixel-perfect character consistency across pages, the pipeline uses:

### 1. Character Reference Sheets

Each character gets a dedicated reference image generated first:
- Neutral pose, clear view of all distinctive features
- Stored in the story output directory
- Used as conditioning input for all subsequent pages

### 2. IP-Adapter Workflow

When generating pages with characters:
- Character reference image is uploaded to ComfyUI
- IP-Adapter conditions the generation on the reference
- Weight can be tuned (default: 0.75) for balance between consistency and creativity

### 3. Validation with Reference Comparison

When `character_reference_image` is provided:
- LLaVA compares the generated character against the reference
- Checks: face matching, body proportions, colors, clothing/fur patterns
- Fails validation if character doesn't match reference

---

## 🧹 ComfyUI Output Cleanup

To prevent accumulation of failed/intermediate images:

1. **Failed attempts**: Deleted after validation fails
2. **Intermediate inpaint images**: Cleaned up after pipeline completion
3. **Only final images**: Returned to Mac and saved to output directory

### Manual Cleanup

```powershell
# Clear all ComfyUI outputs (if needed)
del ComfyUI\output\*.png
```

---

## Security

- Binds to `0.0.0.0` (network accessible)
- Only accessible on local network
- `X-Worker-Key` header authentication
- ComfyUI stays on localhost

---

## 📁 File Structure

```
story-renderer/
├── main.py              # FastAPI server with validation loop
├── validator.py         # Ollama Vision validation
├── workflow_builder.py  # ComfyUI workflow templates
├── comfyui_client.py    # ComfyUI HTTP client
├── models.py            # Pydantic models
├── job_queue.py         # Async job queue
├── config.py            # Configuration
└── requirements.txt     # Dependencies
```

---

## 🐛 Debugging

### Check Validation Logs

```powershell
# Look for validation scores in console output:
# "Validation: art=85, scene=90, quality=78, valid=True"
```

### Test Validation Manually

```bash
curl -X POST http://192.168.1.213:11434/api/generate \
  -d '{"model": "llava", "prompt": "Describe this image", "images": ["base64..."]}'
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| All images fail validation | LLaVA too strict | Lower `min_score` in job request |
| Validation skipped | Ollama not responding | Restart Ollama with `OLLAMA_HOST=0.0.0.0` |
| Characters inconsistent | No reference image | Generate character ref first |
| Style not matching | Wrong preset | Check `npm run generate -- styles` |
