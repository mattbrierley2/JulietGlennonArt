Param(
    [string]$BaseUrl = 'https://www.julietglennon.com',
    [string]$OutFile = 'sitemap.xml'
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

function Encode-Url([string]$s) {
    return [uri]::EscapeUriString(($s -replace "\\", "/"))
}

# Gather pages and images
$pages = Get-ChildItem -Path $scriptDir -Filter *.html -Recurse -File
$imagesDir = Join-Path $scriptDir 'images'
$images = @()
if (Test-Path $imagesDir) {
    $images = Get-ChildItem -Path $imagesDir -Recurse -File -Include *.jpg,*.jpeg,*.png,*.gif,*.webp,*.avif -ErrorAction SilentlyContinue
}

# Build XML
$sb = New-Object System.Text.StringBuilder
$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>') | Out-Null
$sb.AppendLine('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">') | Out-Null

foreach ($p in $pages) {
    $rel = $p.FullName.Substring($scriptDir.Length).TrimStart('\','/')
    $loc = ($BaseUrl.TrimEnd('/') + '/' + $rel -replace '\\','/')
    $loc = Encode-Url($loc)
    $last = $p.LastWriteTime.ToString('yyyy-MM-dd')

    $sb.AppendLine('  <url>') | Out-Null
    $sb.AppendLine("    <loc>$loc</loc>") | Out-Null
    $sb.AppendLine("    <lastmod>$last</lastmod>") | Out-Null
    $sb.AppendLine('  </url>') | Out-Null
}

foreach ($img in $images) {
    $rel = $img.FullName.Substring($scriptDir.Length).TrimStart('\','/')
    $loc = ($BaseUrl.TrimEnd('/') + '/' + $rel -replace '\\','/')
    $loc = Encode-Url($loc)
    $last = $img.LastWriteTime.ToString('yyyy-MM-dd')
    $title = [System.IO.Path]::GetFileNameWithoutExtension($img.Name)
    $escapedTitle = [System.Security.SecurityElement]::Escape($title)

    $sb.AppendLine('  <url>') | Out-Null
    $sb.AppendLine("    <loc>$loc</loc>") | Out-Null
    $sb.AppendLine("    <lastmod>$last</lastmod>") | Out-Null
    $sb.AppendLine('    <image:image>') | Out-Null
    $sb.AppendLine("      <image:loc>$loc</image:loc>") | Out-Null
    $sb.AppendLine("      <image:title>$escapedTitle</image:title>") | Out-Null
    $sb.AppendLine('    </image:image>') | Out-Null
    $sb.AppendLine('  </url>') | Out-Null
}

$sb.AppendLine('</urlset>') | Out-Null

# Write file
Set-Content -Path $OutFile -Value $sb.ToString() -Encoding UTF8
Write-Host "Wrote $OutFile with $($pages.Count) pages and $($images.Count) images."
