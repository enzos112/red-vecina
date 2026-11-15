# Corre todas las verificaciones: ruff, pytest y build del frontend.
# Uso desde la raíz del repo:  .\verificar.cmd

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$python = Join-Path $raiz 'backend\.venv\Scripts\python.exe'

Push-Location (Join-Path $raiz 'backend')
try {
    & $python -m ruff check .; if ($LASTEXITCODE -ne 0) { throw 'ruff check falló.' }
    & $python -m ruff format --check .; if ($LASTEXITCODE -ne 0) { throw 'ruff format falló.' }
    & $python -m pytest -q; if ($LASTEXITCODE -ne 0) { throw 'pytest falló.' }
} finally { Pop-Location }

Push-Location (Join-Path $raiz 'frontend')
try {
    npm run lint; if ($LASTEXITCODE -ne 0) { throw 'oxlint falló.' }
    npm run build; if ($LASTEXITCODE -ne 0) { throw 'El build del frontend falló.' }
} finally { Pop-Location }

Write-Host '==> Todo en orden' -ForegroundColor Green
