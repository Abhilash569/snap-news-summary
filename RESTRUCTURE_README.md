This repository contains both frontend and backend assets. This helper will split the repo into two folders at the project root:

- `frontend/` — will contain everything except the `supabase/` folder.
- `backend/` — will contain the `supabase/` folder and any backend-related files.

How to use

1. Open PowerShell in the repository root (where this file and `restructure.ps1` live).
2. Preview the move (recommended):

   powershell -ExecutionPolicy Bypass -File .\restructure.ps1 -WhatIf

3. If the preview looks correct, run the actual move:

   powershell -ExecutionPolicy Bypass -File .\restructure.ps1

Notes and safety

- The script excludes `.git`, and won't try to move the newly-created `frontend` or `backend` directories, or itself.
- It moves files and folders (not copies). If you prefer a copy-first approach, make a manual backup or modify the script to use `Copy-Item`.
- If anything goes wrong or you want me to run the script for you here, tell me and I can run it in the workspace terminal (I'll show you the changes first).