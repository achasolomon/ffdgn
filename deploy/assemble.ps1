$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$standalone = Join-Path $projectRoot '.next/standalone'
if (!(Test-Path -LiteralPath (Join-Path $standalone 'server.js'))) { throw 'Build standalone output first.' }
Copy-Item -LiteralPath (Join-Path $projectRoot 'public') -Destination $standalone -Recurse -Force
$videoCopy = [IO.Path]::GetFullPath((Join-Path $standalone 'public/assets/videos'))
if (!$videoCopy.StartsWith([IO.Path]::GetFullPath($standalone) + [IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe video copy removal path.' }
if (Test-Path -LiteralPath $videoCopy) { Remove-Item -LiteralPath $videoCopy -Recurse -Force }
Copy-Item -LiteralPath (Join-Path $projectRoot '.next/static') -Destination (Join-Path $standalone '.next') -Recurse -Force
Get-ChildItem -LiteralPath $standalone -Recurse -Force -File |
  Where-Object { $_.Name -like '.env*' } |
  ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }
foreach ($required in @('server.js', '.next/static', 'public', 'node_modules', 'package.json',
  'node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.5.node',
  'node_modules/@img/sharp-libvips-linux-x64/lib',
  'node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node',
  'node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node')) {
  if (!(Test-Path -LiteralPath (Join-Path $standalone $required))) { throw "Missing deployment file: $required" }
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $projectRoot 'ffdgn-deploy.zip'
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
# .NET enumerates hidden directories, including .next, and puts contents at zip root.
[IO.Compression.ZipFile]::CreateFromDirectory($standalone, $zipPath, [IO.Compression.CompressionLevel]::Optimal, $false)
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
  if ($names -notcontains 'server.js') { throw 'server.js is not at archive root.' }
  if (!($names | Where-Object { $_ -like '.next/static/*' })) { throw 'Missing hidden .next/static directory.' }
  if ($names | Where-Object { ($_ -split '/')[-1] -like '.env*' }) { throw 'Environment file found in zip.' }
  if ($names | Where-Object { $_ -like 'public/assets/videos/*' }) { throw 'Excluded video found in zip.' }
  Write-Output "Verified archive: $($archive.Entries.Count) entries; root server.js, .next/static and no .env files."
} finally { $archive.Dispose() }
Get-Item -LiteralPath $zipPath | Select-Object FullName, Length
