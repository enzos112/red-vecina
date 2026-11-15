# Levanta backend (FastAPI en :8000) y frontend (Vite en :5173) con un solo comando.
# Uso desde la raíz del repo:  .\dev.cmd            (solo en este PC)
#                              .\dev.cmd -Celular   (también desde un celular en la misma red wifi)
# La primera vez crea el entorno de Python, instala dependencias y copia .env.example a .env.

param([switch]$Celular)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $raiz 'backend'
$frontend = Join-Path $raiz 'frontend'
$python = Join-Path $backend '.venv\Scripts\python.exe'

function Paso($texto) { Write-Host "==> $texto" -ForegroundColor Green }

if (-not (Test-Path (Join-Path $raiz '.env'))) {
    Paso 'Creando .env desde .env.example'
    Copy-Item (Join-Path $raiz '.env.example') (Join-Path $raiz '.env')
}

if (-not (Test-Path $python)) {
    Paso 'Creando entorno de Python (backend\.venv)'
    Push-Location $backend
    try {
        python -m venv .venv
        & $python -m pip install --upgrade pip
        & $python -m pip install -e '.[dev]'
        if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de dependencias de Python.' }
    } finally { Pop-Location }
}

if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Paso 'Instalando dependencias del frontend'
    Push-Location $frontend
    try {
        npm install
        if ($LASTEXITCODE -ne 0) { throw 'Falló npm install.' }
    } finally { Pop-Location }
}

Paso 'Aplicando migraciones'
Push-Location $backend
try {
    & $python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las migraciones.' }
} finally { Pop-Location }

Paso 'Backend en http://127.0.0.1:8000  (docs en /docs)'
$procesoBackend = Start-Process -FilePath $python -WorkingDirectory $backend -NoNewWindow -PassThru `
    -ArgumentList '-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'

try {
    Paso 'Frontend en http://localhost:5173  (Ctrl+C para detener ambos)'
    Push-Location $frontend
    if ($Celular) {
        # Vite escucha en la red local; la API sigue solo en este PC (el celular entra por el proxy).
        $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.PrefixOrigin -ne 'WellKnown' }
        foreach ($ip in $ips) { Paso "Desde el celular: http://$($ip.IPAddress):5173" }
        npm run dev -- --host
    } else {
        npm run dev
    }
} finally {
    Pop-Location
    if ($procesoBackend -and -not $procesoBackend.HasExited) {
        Paso 'Deteniendo backend'
        # /T detiene también el proceso hijo que crea --reload.
        taskkill /PID $procesoBackend.Id /T /F | Out-Null
    }
}
