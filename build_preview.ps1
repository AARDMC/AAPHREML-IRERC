$index = Get-Content -Path "Index.html" -Raw -Encoding UTF8
$styles = Get-Content -Path "styles\styles.html" -Raw -Encoding UTF8
$app = Get-Content -Path "client\app.html" -Raw -Encoding UTF8
$views = Get-Content -Path "client\views.html" -Raw -Encoding UTF8

$bundle = $index.Replace("<?!= include('styles/styles') ?>", $styles)
$bundle = $bundle.Replace("<?!= include('client/app') ?>", $app)
$bundle = $bundle.Replace("<?!= include('client/views') ?>", $views)

[System.IO.File]::WriteAllText((Join-Path (Get-Location) "preview.html"), $bundle, [System.Text.Encoding]::UTF8)

Write-Host "preview.html compiled successfully. Size: " (Get-Item "preview.html").Length "bytes."
