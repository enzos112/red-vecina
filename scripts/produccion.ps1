# Comandos contra la base de producción (Neon), corridos desde tu PC.
# Lee las variables de .env.produccion (no se sube al repositorio) y las aplica solo a este
# proceso: tu .env de desarrollo no se toca.
#
# Uso desde la raíz del repo:
#   .\produccion.cmd base                      parámetros, plantillas y primer administrador
#   .\produccion.cmd demo --en-produccion      datos de demostración (base sin comercios)
#   .\produccion.cmd tareas [--forzar]         tareas del día
#   .\produccion.cmd local                     construye la imagen Docker y la levanta en
#                                              http://localhost:8000 en modo producción

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$archivo = Join-Path $raiz '.env.produccion'
if (-not (Test-Path $archivo)) {
    throw 'Falta .env.produccion. Copia .env.produccion.example con ese nombre y complétalo.'
}
if ($args.Count -eq 0) { throw 'Indica un comando: base, demo, tareas o local.' }

$variables = @{}
foreach ($linea in Get-Content -Encoding UTF8 $archivo) {
    $linea = $linea.Trim()
    if (-not $linea -or $linea.StartsWith('#') -or -not $linea.Contains('=')) { continue }
    $clave, $valor = $linea.Split('=', 2)
    $valor = $valor.Trim()
    if ($valor.Length -ge 2 -and $valor[0] -eq $valor[-1] -and ($valor[0] -eq '"' -or $valor[0] -eq "'")) {
        $valor = $valor.Substring(1, $valor.Length - 2)
    }
    $variables[$clave.Trim()] = $valor
}
if (-not $variables['DATABASE_URL'] -or $variables['DATABASE_URL'].StartsWith('sqlite')) {
    throw 'DATABASE_URL de .env.produccion debe ser la cadena de Neon.'
}

$comando, $resto = $args
if ($comando -eq 'local') {
    $lineas = $variables.GetEnumerator() | Where-Object { $_.Value } | ForEach-Object { "$($_.Key)=$($_.Value)" }
    $temporal = New-TemporaryFile
    try {
        # docker --env-file no entiende comillas: se le pasa una copia sin ellas.
        Set-Content -Path $temporal -Value $lineas -Encoding ascii
        docker build -t red-vecina $raiz
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host 'Abriendo en http://localhost:8000 (Ctrl+C para detener)'
        docker run --rm -it -p 8000:8000 --env-file $temporal red-vecina
    } finally { Remove-Item $temporal -ErrorAction SilentlyContinue }
    exit $LASTEXITCODE
}

$python = Join-Path $raiz 'backend\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { throw 'Primero ejecuta .\dev.cmd para crear el entorno.' }
foreach ($par in $variables.GetEnumerator()) { Set-Item -Path "env:$($par.Key)" -Value $par.Value }
$env:PYTHONUTF8 = '1'
Push-Location (Join-Path $raiz 'backend')
try {
    & $python -m app.cli $comando @resto
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
