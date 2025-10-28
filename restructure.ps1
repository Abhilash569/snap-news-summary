param(
    [switch]$WhatIf
)

# Script to move repo items into frontend/ and backend/ directories.
# Usage:
#   .\restructure.ps1            # perform the move
#   .\restructure.ps1 -WhatIf   # dry-run (show what would be moved)

$root = Get-Location
$exclude = @('.git','frontend','backend','restructure.ps1','RESTRUCTURE_README.md')

# Ensure target directories exist
$frontendDir = Join-Path $root 'frontend'
$backendDir = Join-Path $root 'backend'

if (-not (Test-Path -LiteralPath $frontendDir)) {
    New-Item -ItemType Directory -Path $frontendDir | Out-Null
}
if (-not (Test-Path -LiteralPath $backendDir)) {
    New-Item -ItemType Directory -Path $backendDir | Out-Null
}

Get-ChildItem -LiteralPath $root -Force | ForEach-Object {
    $name = $_.Name
    if ($exclude -contains $name) { return }

    if ($name -ieq 'supabase') {
        $dest = $backendDir
    } else {
        $dest = $frontendDir
    }

    if ($WhatIf) {
        Write-Host "Would move '$name' -> '$dest'"
    } else {
        Write-Host "Moving '$name' -> '$dest'"
        try {
            Move-Item -LiteralPath $_.FullName -Destination $dest -Force
        } catch {
            Write-Host "ERROR moving '$name': $_" -ForegroundColor Yellow
        }
    }
}

Write-Host "\nFinished. Check the 'frontend' and 'backend' folders." -ForegroundColor Green
