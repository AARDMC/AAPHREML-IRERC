# ============================================================================
# build_preview.ps1 — Offline Standalone Preview Bundle Compiler
# ============================================================================
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

$indexPath   = Join-Path $scriptDir "Index.html"
$stylesPath  = Join-Path $scriptDir "styles\styles.html"
$appPath     = Join-Path $scriptDir "client\app.html"
$viewsPath   = Join-Path $scriptDir "client\views.html"
$logoPath    = Join-Path $scriptDir "Logo File.png"
$previewPath = Join-Path $scriptDir "preview.html"

$requiredPaths = @($indexPath, $stylesPath, $appPath, $viewsPath, $logoPath)
foreach ($path in $requiredPaths) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required source file not found: $path"
    }
}

$index  = Get-Content -Path $indexPath -Raw -Encoding UTF8
$styles = Get-Content -Path $stylesPath -Raw -Encoding UTF8
$app    = Get-Content -Path $appPath -Raw -Encoding UTF8
$views  = Get-Content -Path $viewsPath -Raw -Encoding UTF8
$logoDataUri = "data:image/png;base64," + [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($logoPath))
$bundle = $index.Replace("<?!= include_('styles/styles') ?>", $styles)
$bundle = $bundle.Replace("<?!= include_('client/app') ?>", $app)
$bundle = $bundle.Replace("<?!= include_('client/views') ?>", $views)
$bundle = $bundle.Replace('<?!= logoDataUri ?>', $logoDataUri)

if ($bundle.Contains('<?!')) {
    throw "Unresolved Apps Script template expression remains in preview.html output."
}

$bundle = [System.Text.RegularExpressions.Regex]::Replace($bundle, "`r`n?", "`n")
[System.IO.File]::WriteAllText($previewPath, $bundle, [System.Text.Encoding]::UTF8)

Write-Host "preview.html compiled successfully. Size: " (Get-Item $previewPath).Length "bytes."
