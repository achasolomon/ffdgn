$base = "http://localhost:3104"
function New-Login($email, $pw) {
  $j = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $csrf = (Invoke-RestMethod -Uri "$base/api/auth/csrf" -WebSession $j -TimeoutSec 20).csrfToken
  $b = @{ csrfToken = $csrf; email = $email; password = $pw; callbackUrl = "$base/admin"; json = "true" }
  Invoke-RestMethod -Method Post -Uri "$base/api/auth/callback/credentials" -WebSession $j -Body $b -ContentType "application/x-www-form-urlencoded" -TimeoutSec 20 | Out-Null
  return $j
}
function Show($label, $resp) { Write-Output ("--- " + $label); Write-Output $resp }
function Api($jar, $method, $url, $bodyObj) {
  try {
    $par = @{ Uri = $url; WebSession = $jar; TimeoutSec = 20; Method = $method }
    if ($bodyObj) { $par.Body = ($bodyObj | ConvertTo-Json); $par.ContentType = "application/json" }
    $r = Invoke-RestMethod @par
    return ($r | ConvertTo-Json -Depth 5 -Compress)
  } catch {
    $s = $_.Exception.Response.StatusCode.value__
    try {
      $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
      return "HTTP $s " + $sr.ReadToEnd()
    } catch { return "HTTP $s" }
  }
}
function Page($url) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 20
    return [string]$r.StatusCode + " len=" + $r.RawContentLength
  } catch { return $_.Exception.Response.StatusCode.value__ }
}

$mem = New-Login "member@ffdgn.org.ng" "FFDGN-Member-2026!"
$sec = New-Login "secretariat@ffdgn.org.ng" "FFDGN-Secret-2026!"

Show "C1 homepage (want 200)" (Page "$base/")
Show "C2 members dir (want 200)" (Page "$base/members")
Show "C3 member profile (want 200)" (Page "$base/members/atim-tyonongu")
Show "C4 event detail (want 200)" (Page "$base/events/national-conference-2026")
Show "C5 news detail (want 200)" (Page "$base/news/state-federal-collaboration-call")
Show "C6 leadership (want 200)" (Page "$base/leadership")
Show "C7 search page q=federal (want 200)" (Page "$base/search?q=federal")
Show "C8 member PATCH setting (want 403)" (Api $mem "Patch" "$base/api/v1/cms/settings" @{ key = "hero.eyebrow"; value = "Hacked" })
Show "C9 secretariat PATCH setting (want 200)" (Api $sec "Patch" "$base/api/v1/cms/settings" @{ key = "site.seat"; value = "Abuja, FCT, Nigeria" })
Show "C10 GET settings shows edit" (Api $sec "Get" "$base/api/v1/cms/settings" $null)
Show "C11 revert seat (want 200)" (Api $sec "Patch" "$base/api/v1/cms/settings" @{ key = "site.seat"; value = "Abuja, Nigeria" })
Show "C12 bad key (want 422)" (Api $sec "Patch" "$base/api/v1/cms/settings" @{ key = "nope"; value = "x" })
Show "C13 metrics GET" (Api $sec "Get" "$base/api/v1/cms/metrics" $null)
Show "C14 metrics PATCH (want 200)" (Api $sec "Patch" "$base/api/v1/cms/metrics" @{ key = "States Represented"; value = "36" })
