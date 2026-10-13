# Issue Log

Record recurring bugs and setup issues once, newest first: symptom, root cause, fix, prevention.

## 2026-10-13

### Telegram polling conflicts with another instance

- Symptom: Telegram reports `Conflict: terminated by other getUpdates request` after Application started.
- Root cause: overlapping polling requests for the same token. Local inspection found one launch chain (Python/uv wrappers), not four independent bots; the competing instance was not identified.
- Action: owner requested shutdown. Stopped the identified local Telegram launch chain and verified zero matching bot processes remain. No remote host was changed.
- Prevention: run only one polling instance per bot token; stop the existing instance before launching another.

### Telegram startup exits with ReadTimeout

- Symptom: `python -m uv --directory chatbot run python -m heronsguide.telegram_bot` exits during a Telegram API request with `httpx.ReadTimeout` / `telegram.error.TimedOut`.
- Root cause: a network response timed out; the library defaults to a five-second response timeout and no bootstrap retries. Optional menu/profile setup also propagated network failures. The partial owner trace does not identify which Telegram method timed out.
- Fix: 15-second connection and 30-second response timeouts; three bootstrap retries. Menu/profile setup makes up to three attempts and allows chat startup after network failures; invalid API arguments and invalid tokens remain errors. Exhausted initialization retries give a concise connectivity message.
- Verification: public Telegram HTTPS returned 302; configured token authenticated with extended timeouts (6.9 seconds elapsed). Live command Menu and pre-chat description were applied and read back successfully. No polling or user messages during these checks. Full chatbot suite: 63 passed; lint clean.
- Prevention: keep startup timeout and retry regression tests; restart after a sustained network outage.

### Chatbot server cannot bind port 8000 on Windows

- Symptom: `uvicorn ... --port 8000` exits with WinError 10013; `curl localhost:8000` returns an HTTP.sys 404 page.
- Root cause: a Windows system service (PID 4, HTTP.sys) already listens on 8000.
- Fix: run the chatbot on 8787; default `ALLOWED_ORIGINS` uses 8787.
- Prevention: use 8787 in docs and scripts.

### `uv` not found after `pip install --user uv`

- Symptom: `uv: command not found`.
- Root cause: the user Scripts folder is not on PATH.
- Fix: run `python -m uv ...` (same commands).
- Prevention: none needed; or add the Python user Scripts folder to PATH.

### Editable chatbot package imports nothing (`ModuleNotFoundError: heronsguide`)

- Symptom: `uv run python -c "import heronsguide"` fails although `uv sync` succeeds.
- Root cause: the package was built and cached before `src/heronsguide/` had files.
- Fix: `uv sync --reinstall-package heronsguide`.
- Prevention: create the package files before the first `uv sync`.

## YYYY-MM-DD

### <Short symptom title>

- Symptom:
- Root cause:
- Fix:
- Prevention:
