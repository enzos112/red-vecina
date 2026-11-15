# Carga los datos de demostración en la base de desarrollo.
# Uso desde la raíz del repo:  .\demo.cmd             (base vacía)
#                              .\demo.cmd --reiniciar (borra la base y la crea de nuevo)
# Requiere ADMIN_PASSWORD, OPERADOR_PASSWORD y COMERCIO_PASSWORD en .env.

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$python = Join-Path $raiz 'backend\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { throw 'Primero ejecuta .\dev.cmd para crear el entorno.' }

$env:PYTHONUTF8 = '1'
Push-Location (Join-Path $raiz 'backend')
try {
    & $python -m app.cli demo @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
