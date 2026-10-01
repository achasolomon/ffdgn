$base = "http://localhost:3103"
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
  try { return (Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 20).StatusCode }
  catch { return $_.Exception.Response.StatusCode.value__ }
}

$anon = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$sa = New-Login "superadmin@ffdgn.org.ng" "FFDGN-Super-2026!"
$mem = New-Login "member@ffdgn.org.ng" "FFDGN-Member-2026!"

Show "T1 anon restricted doc API (want 403)" (Api $anon "Get" "$base/api/v1/documents/subnational-finance-2025" $null)
Show "T2 member PATCH member (want 403)" (Api $mem "Patch" "$base/api/v1/members/ngozi-eze" @{ status = "Active" })
Show "T3 truly illegal Published->Draft (want 422)" (Api $sa "Patch" "$base/api/v1/documents/state-federal-cooperation-2025" @{ to = "Draft" })
Show "T4 restore end-of-term: Archived->Draft" (Api $sa "Patch" "$base/api/v1/documents/end-of-term-governance-2024" @{ to = "Draft" })
Show "T5 Draft->Editorial_Review" (Api $sa "Patch" "$base/api/v1/documents/end-of-term-governance-2024" @{ to = "Editorial_Review" })
Show "T6 ER->Institutional_Review" (Api $sa "Patch" "$base/api/v1/documents/end-of-term-governance-2024" @{ to = "Institutional_Review" })
Show "T7 IR->Approved" (Api $sa "Patch" "$base/api/v1/documents/end-of-term-governance-2024" @{ to = "Approved" })
Show "T8 Approved->Published" (Api $sa "Patch" "$base/api/v1/documents/end-of-term-governance-2024" @{ to = "Published" })
Show "T9 restore subnational: Draft->ER" (Api $sa "Patch" "$base/api/v1/documents/subnational-finance-2025" @{ to = "Editorial_Review" })
Show "T10 ER->IR (seed state)" (Api $sa "Patch" "$base/api/v1/documents/subnational-finance-2025" @{ to = "Institutional_Review" })
Show "T11 public page end-of-term (want 200)" (Page "$base/knowledge/end-of-term-governance-2024")
Show "T12 restricted page subnational (want 404)" (Page "$base/knowledge/subnational-finance-2025")
Show "T13 audit tail" (Api $sa "Get" "$base/api/v1/audit?per_page=12" $null)
