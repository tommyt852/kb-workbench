# kb-workbench

Local Knowledge Base workbench (Traditional Chinese HK UI).

## Run (Windows)

```bat
run.bat
```

Opens `http://localhost:8085/` and starts `web.ps1` on port **8085**.

## Stack

- `web.ps1` — PowerShell static + `/api/*` controllers (do not modify)
- `controller/api/data.ps1` — POST writes `www/data/kb.json` + timestamped backups
- Vanilla JS (no npm/bundler), sequential `<script>` tags

## Milestones

M0–M7 incremental commits.
