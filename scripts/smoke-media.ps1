$base = "http://localhost:3105"
function New-Login($email, $pw) {
  $j = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $csrf = (Invoke-RestMethod -Uri "$base/api/auth/csrf" -WebSession $j -TimeoutSec 20).csrfToken
  $b = @{ csrfToken = $csrf; email = $email; password = $pw; callbackUrl = "$base/admin"; json = "true" }
  Invoke-RestMethod -Method Post -Uri "$base/api/auth/callback/credentials" -WebSession $j -Body $b -ContentType "application/x-www-form-urlencoded" -TimeoutSec 20 | Out-Null
  return $j
}
function Show($label, $resp) { Write-Output ("--- " + $label); Write-Output $resp }
function Page($url) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 20
    return [string]$r.StatusCode + " len=" + $r.RawContentLength
  } catch { return $_.Exception.Response.StatusCode.value__ }
}
function PageHas($url, $needle) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 20
    if ($r.Content -like "*$needle*") { return "FOUND $needle" } else { return "MISSING $needle" }
  } catch { return "PAGE-FAIL" }
}

$ed = New-Login "editor@ffdgn.org.ng" "FFDGN-Edit-2026!"
$mem = New-Login "member@ffdgn.org.ng" "FFDGN-Member-2026!"

Show "M1 photos page" (Page "$base/media/photos")
Show "M2 photos has gallery img" (PageHas "$base/media/photos" "/media/events/conference-2026.svg")
Show "M3 videos page (empty state)" (PageHas "$base/media/videos" "no videos catalogued yet")
Show "M4 homepage has portrait" (PageHas "$base/" "/media/portraits/funke-ajayi.svg")
Show "M5 homepage has conf cover" (PageHas "$base/" "/media/events/conference-2025.svg")
Show "M6 event gallery" (PageHas "$base/events/national-conference-2026" "Photographs")
Show "M7 member portrait" (PageHas "$base/members/hafsat-balewa" "/media/portraits/hafsat-balewa.svg")
Show "M8 news lead image" (PageHas "$base/news/polish-nigeria-partnership" "/media/news/partnership.svg")

# RBAC: member cannot upload
try {
  $r = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$base/api/v1/media" -WebSession $mem -TimeoutSec 20
  Show "M9 member upload (want 403)" $r.StatusCode
} catch { Show "M9 member upload (want 403)" $_.Exception.Response.StatusCode.value__ }

# Editor uploads an SVG photo (full curl flow incl. login, for multipart on PS 5.1)
# NOTE: csrf token + cookie must share one jar — fetch both via curl.
$jar = Join-Path $env:TEMP "smoke-jar.txt"
Remove-Item $jar -Force -ErrorAction SilentlyContinue
$csrfJson = & curl.exe -s -c $jar "$base/api/auth/csrf" 2>&1 | Out-String
$csrf2 = ([regex]::Match($csrfJson, '"csrfToken":"([^"]+)"')).Groups[1].Value
& curl.exe -s -b $jar -c $jar -d "csrfToken=$csrf2" -d "email=editor@ffdgn.org.ng" -d "password=FFDGN-Edit-2026!" -d "callbackUrl=$base/admin" -d "json=true" "$base/api/auth/callback/credentials" | Out-Null
$tmp = Join-Path $env:TEMP "smoke-photo.svg"
Copy-Item "public/media/site/map-states.svg" $tmp -Force
$upOut = & curl.exe -s -b $jar -F "file=@$tmp" -F "title=SMOKE test photo" -F "category=Archive" -F "altText=Smoke test upload" "$base/api/v1/media" 2>&1
Show "M10 editor upload (want id+url)" $upOut

# Editor catalogues a YouTube video (functional embed test; removed afterwards)
try {
  $body = @{ title = "SMOKE embed test"; provider = "YOUTUBE"; providerId = "aqz-KE-bpKQ"; category = "Archive" } | ConvertTo-Json
  $lk = Invoke-RestMethod -Method Post -Uri "$base/api/v1/media/link" -WebSession $ed -Body $body -ContentType "application/json" -TimeoutSec 20
  Show "M11 link video (want id)" (($lk | ConvertTo-Json -Depth 3 -Compress))
} catch { Show "M11 link video FAIL" $_.Exception.Message }

Show "M12 videos page renders nocookie embed" "SKIPPED-ISR (verified after restart below)"
Show "M13 media API lists images" ((Invoke-RestMethod "$base/api/v1/media?kind=IMAGE" -TimeoutSec 20).meta.total)
