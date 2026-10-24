$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
$builderPath = Join-Path $scriptDir 'scripts/build-preview.js'
if (-not (Test-Path -LiteralPath $builderPath -PathType Leaf)) {
    throw "Preview builder not found: $builderPath"
}
Push-Location $scriptDir
try {
    node $builderPath
    if ($LASTEXITCODE -ne 0) {
        throw "Preview build failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}
