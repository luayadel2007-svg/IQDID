<#
.SYNOPSIS
  Re-runs the FROZEN G1 suite (main + 2 mutation controls) in an isolated working copy,
  verifies every result and hash, and stores raw outputs under evidence\runs\<run-id>\.

.DESCRIPTION
  TEST ONLY - Iraqi Digital ID prototype. Synthetic data, TEST keys generated in memory.
  - Never writes inside evidence\g1-suite-v1.0 (verified before AND after the run).
  - Does NOT trust run.mjs exit codes (run.mjs exits 0 even when tests fail);
    the verdict comes from parsing results JSON.
  - Native commands are started with Start-Process and separate stdout/stderr files,
    so npm warnings on stderr cannot abort the script (Windows PowerShell 5.1 issue).
  - Status PASS is written only after ALL checks succeed. Exit codes: 0=PASS, 1=FAIL, 2=BLOCKED.
  - This script says nothing about gates G1a/G1b; they remain NOT passed.

.PARAMETER RemoveWork
  Compatibility flag only. All working files and evidence are retained.

.EXAMPLE
  tools\run-g1-suite.cmd
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\run-g1-suite.ps1
#>
[CmdletBinding()]
param(
  [switch]$RemoveWork # compatibility only; files are always retained
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# ---------------- constants (from Implementation_Baseline_v1.0 / G1_Test_Evidence_Report_v1.0) ----------------
$ExpectedLockSha   = 'd3af25764d221d4bdca94dc49335deca8514a21e20d0611515aa297828fbe524'
$ExpectedTotal     = 62
$ExpectedFailChain = @('REV-05','REV-08','SIG-05','SIG-06','VER-12','X-17' | Sort-Object -Culture '')
$ExpectedFailRole  = @('REV-05','VER-12' | Sort-Object -Culture '')
$BaselineNodeMajor = 22
$FrozenRel         = 'evidence\g1-suite-v1.0'

# ---------------- helpers ----------------
function Get-Sha256Lower([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Get-FrozenManifest([string]$FrozenDir) {
  # Returns sorted lines "<sha256>  ./<relative/path>" for every file in the frozen directory
  $base = (Resolve-Path -LiteralPath $FrozenDir).Path.TrimEnd('\','/')
  $lines = @()
  Get-ChildItem -LiteralPath $base -Recurse -File -Force | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length + 1).Replace('\','/')
    $lines += ('{0}  ./{1}' -f (Get-Sha256Lower $_.FullName), $rel)
  }
  return ($lines | Sort-Object { $_.Substring(66) } -Culture '')
}

function Resolve-Exe([string[]]$Names) {
  foreach ($n in $Names) {
    $c = Get-Command $n -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($c) { return $c.Source }
  }
  return $null
}

function Invoke-Logged([string]$Exe, [string]$ArgLine, [string]$WorkDir, [string]$OutBase) {
  # Runs a native command; stdout/stderr go to separate files; returns the exit code.
  # npm.cmd requires the Windows command processor when redirecting output.
  if ($Exe -match '\.(cmd|bat)$') {
    $ArgLine = '/d /s /c ""' + $Exe + '" ' + $ArgLine + '"'
    $Exe = $env:ComSpec
  }
  $p = Start-Process -FilePath $Exe -ArgumentList $ArgLine -WorkingDirectory $WorkDir `
        -RedirectStandardOutput "$OutBase.stdout.log" -RedirectStandardError "$OutBase.stderr.log" `
        -NoNewWindow -Wait -PassThru
  return $p.ExitCode
}

function Get-Ids($ResultsObj, [scriptblock]$Filter) {
  return @($ResultsObj.results | Where-Object $Filter | ForEach-Object { $_.id } | Sort-Object -Culture '')
}

$checks = New-Object System.Collections.ArrayList
function Add-Check([string]$Name, [bool]$Ok, [string]$Detail) {
  [void]$checks.Add([pscustomobject]@{ check = $Name; ok = $Ok; detail = $Detail })
  $tag = 'FAIL'; if ($Ok) { $tag = 'ok  ' }
  Write-Host ("[{0}] {1} - {2}" -f $tag, $Name, $Detail)
}

# ---------------- locate repository ----------------
$RepoRoot  = Split-Path -Parent $PSScriptRoot
$FrozenDir = Join-Path $RepoRoot $FrozenRel
$SumsFile  = Join-Path $RepoRoot 'evidence\g1-suite-v1.0.SHA256SUMS'

$isWin = ($PSVersionTable.PSEdition -eq 'Desktop') -or ((Get-Variable IsWindows -ErrorAction SilentlyContinue) -and $IsWindows)
$plat = 'other'; if ($isWin) { $plat = 'win32' } elseif ((Get-Variable IsLinux -ErrorAction SilentlyContinue) -and $IsLinux) { $plat = 'linux' }
try { $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant() } catch { $arch = "$env:PROCESSOR_ARCHITECTURE".ToLowerInvariant() }
$RunId  = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8) + "-$plat-$arch"
$OutDir = Join-Path $RepoRoot ("evidence\runs\" + $RunId)
$Work   = Join-Path $RepoRoot (".work\g1-run-" + $RunId)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$status = 'FAIL'
$startedUtc = (Get-Date).ToUniversalTime().ToString('o')
$envInfo = [ordered]@{
  run_id = $RunId; started_utc = $startedUtc; platform = $plat; arch = $arch
  os = [System.Environment]::OSVersion.VersionString
  powershell = $PSVersionTable.PSVersion.ToString(); powershell_edition = $PSVersionTable.PSEdition
  node = $null; npm = $null; baseline_node_major = $BaselineNodeMajor
  requested_node = '24.21.0'; requested_npm = '11.19.0'
  windows_validation = $(if ($isWin) { 'AVAILABLE: see run results' } else { 'BLOCKED: no Windows environment' })
}
$envInfo | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $OutDir 'env.json') -Encoding UTF8
try {
  # ---------------- preconditions (BLOCKED if missing) ----------------
  if (-not (Test-Path -LiteralPath $FrozenDir) -or -not (Test-Path -LiteralPath $SumsFile)) { $status = 'BLOCKED'; throw 'Frozen suite or manifest missing.' }
  # ---------------- frozen suite: verify BEFORE ----------------
  $expected = @(Get-Content -LiteralPath $SumsFile | Where-Object { $_.Trim() -ne '' })
  $before = @(Get-FrozenManifest $FrozenDir)
  $before | Set-Content -LiteralPath (Join-Path $OutDir 'hashes_frozen_before.txt') -Encoding ASCII
  $diffB = @(Compare-Object $expected $before)
  Add-Check 'frozen-before' ($diffB.Count -eq 0 -and $before.Count -eq 18) ("{0} files; differences vs SHA256SUMS: {1}" -f $before.Count, $diffB.Count)

  if ($diffB.Count -ne 0 -or $before.Count -ne 18) { throw 'Frozen suite does not match its manifest.' }

  $node = Resolve-Exe @('node.exe','node')
  $npm  = Resolve-Exe @('npm.cmd','npm')
  if (-not $node -or -not $npm) { $status = 'BLOCKED'; throw 'Node.js or npm not found on PATH.' }
  if (-not (Test-Path -LiteralPath $FrozenDir) -or -not (Test-Path -LiteralPath $SumsFile)) { $status = 'BLOCKED'; throw "Frozen suite or manifest missing: $FrozenRel" }

  # ---------------- environment ----------------
  [void](Invoke-Logged $node '-v' $RepoRoot (Join-Path $OutDir 'env_node'))
  [void](Invoke-Logged $npm  '-v' $RepoRoot (Join-Path $OutDir 'env_npm'))
  $nodeV = (Get-Content -LiteralPath (Join-Path $OutDir 'env_node.stdout.log') -Raw).Trim()
  $npmV  = (Get-Content -LiteralPath (Join-Path $OutDir 'env_npm.stdout.log') -Raw).Trim()
  $nodeMajor = [int]($nodeV.TrimStart('v').Split('.')[0])
  $gitCommit = ''
  $git = Resolve-Exe @('git.exe','git')
  if ($git) {
    [void](Invoke-Logged $git 'rev-parse HEAD' $RepoRoot (Join-Path $OutDir 'env_git'))
    $gc = Get-Content -LiteralPath (Join-Path $OutDir 'env_git.stdout.log') -Raw
    if ($gc) { $gitCommit = $gc.Trim() }
  }
  $envInfo = [ordered]@{
    run_id = $RunId; started_utc = $startedUtc; platform = $plat; arch = $arch
    os = [System.Environment]::OSVersion.VersionString
    powershell = $PSVersionTable.PSVersion.ToString(); powershell_edition = $PSVersionTable.PSEdition
    node = $nodeV; npm = $npmV; node_path = $node; npm_path = $npm; git_commit = $gitCommit
    requested_node = '24.21.0'; requested_npm = '11.19.0'
    requested_toolchain_match = ($nodeV -eq 'v24.21.0' -and $npmV -eq '11.19.0')
    windows_validation = $(if ($isWin) { 'AVAILABLE: see run results' } else { 'BLOCKED: no Windows environment' })
    baseline_node_major = $BaselineNodeMajor
    environment_conformance = $(if ($nodeMajor -eq $BaselineNodeMajor) { 'CONFORMS' } else { "DEVIATION: Node major $nodeMajor != baseline $BaselineNodeMajor" })
    conditions = 'in-process library tests; no HTTP/TLS; synthetic data; TEST keys; not a system, device or security test'
  }
  $envInfo | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $OutDir 'env.json') -Encoding UTF8
  Write-Host "Run $RunId  node=$nodeV npm=$npmV  ($($envInfo.environment_conformance))"

  # ---------------- isolated working copy ----------------
  New-Item -ItemType Directory -Force -Path $Work | Out-Null
  Copy-Item -Path (Join-Path $FrozenDir 'tests_suite\*') -Destination $Work -Recurse -Force
  $oldEv = Join-Path $Work 'evidence'
  if (Test-Path -LiteralPath $oldEv) { Move-Item -LiteralPath $oldEv -Destination ($oldEv + '.archived-' + [guid]::NewGuid().ToString('N')) }   # original evidence is never an input
  $lockW = Join-Path $Work 'package-lock.json'
  $lockBefore = Get-Sha256Lower $lockW
  Add-Check 'lock-before-ci' ($lockBefore -eq $ExpectedLockSha) $lockBefore

  # ---------------- npm ci ----------------
  $ciCode = Invoke-Logged $npm 'ci --no-audit --no-fund' $Work (Join-Path $OutDir 'npm_ci')
  Add-Check 'npm-ci-exit' ($ciCode -eq 0) "exit=$ciCode"
  $lockAfter = Get-Sha256Lower $lockW
  Add-Check 'lock-after-ci' ($lockAfter -eq $ExpectedLockSha) $lockAfter
  if ($ciCode -ne 0) { throw 'npm ci failed; see npm_ci.stderr.log' }

  # ---------------- three runs; copy results.json after EACH run ----------------
  $runs = @(
    @{ name = 'main';                mutate = $null },
    @{ name = 'mutation_skip-chain'; mutate = 'skip-chain' },
    @{ name = 'mutation_skip-role';  mutate = 'skip-role' }
  )
  $res = @{}
  foreach ($r in $runs) {
    $resultFile = Join-Path $Work 'evidence\results.json'
    if (Test-Path -LiteralPath $resultFile) { Move-Item -LiteralPath $resultFile -Destination ($resultFile + '.archived-' + [guid]::NewGuid().ToString('N')) }   # no stale results
    if ($r.mutate) { $env:MUTATE = $r.mutate } else { Remove-Item Env:MUTATE -ErrorAction SilentlyContinue }
    try { $code = Invoke-Logged $node 'run.mjs' $Work (Join-Path $OutDir $r.name) }
    finally { Remove-Item Env:MUTATE -ErrorAction SilentlyContinue }
    if (-not (Test-Path -LiteralPath $resultFile)) { Add-Check "$($r.name)-results" $false "no results.json (exit=$code)"; continue }
    $dest = Join-Path $OutDir ("results_{0}.json" -f $r.name)
    Copy-Item -LiteralPath $resultFile -Destination $dest
    Add-Check "$($r.name)-process-exit" ($code -eq 0) "exit=$code"
    $mode = 'main'; if ($r.mutate) { $mode = $r.mutate }
    $validator = Join-Path $PSScriptRoot 'check-g1-results.mjs'
    $vCode = Invoke-Logged $node ('"{0}" {1} "{2}"' -f $validator, $mode, $dest) $RepoRoot (Join-Path $OutDir ($r.name + '_validation'))
    Add-Check "$($r.name)-strict-json" ($vCode -eq 0) "validator exit=$vCode"
    $res[$r.name] = Get-Content -LiteralPath $dest -Raw -Encoding UTF8 | ConvertFrom-Json
    Add-Check "$($r.name)-results" $true ("run.mjs exit={0} (not used for the verdict)" -f $code)
  }

  # ---------------- verify outcomes from JSON ----------------
  if ($res.ContainsKey('main')) {
    $m = $res['main']
    Add-Check 'main-total'  ($m.total -eq $ExpectedTotal -and $m.passed -eq $ExpectedTotal) ("{0}/{1}" -f $m.passed, $m.total)
    $mis = @(Get-Ids $m { $_.expected -eq 'reject' -and $_.reasonCheck -ne 'match' })
    Add-Check 'main-reasons' ($mis.Count -eq 0) ("rejections without matching reason: {0}" -f ($mis -join ','))
    Add-Check 'main-lock-in-results' ($m.env.package_lock_sha256 -eq $ExpectedLockSha) $m.env.package_lock_sha256
    $orig = Get-Content -LiteralPath (Join-Path $FrozenDir 'tests_suite\evidence\results.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $sig = { param($o) ($o.results | ForEach-Object { '{0}:{1}:{2}' -f $_.id, $_.observed, $_.pass }) -join '|' }
    Add-Check 'main-equals-original-report' ((& $sig $m) -eq (& $sig $orig)) 'same ids, observed outcomes and pass flags as the original evidence'
  }
  if ($res.ContainsKey('mutation_skip-chain')) {
    $c = $res['mutation_skip-chain']; $f = @(Get-Ids $c { -not $_.pass })
    Add-Check 'skip-chain-detected' ((($f -join ',') -eq ($ExpectedFailChain -join ',')) -and $c.total -eq $ExpectedTotal) ("{0}/{1}; failed: {2}" -f $c.passed, $c.total, ($f -join ','))
  }
  if ($res.ContainsKey('mutation_skip-role')) {
    $o = $res['mutation_skip-role']; $f = @(Get-Ids $o { -not $_.pass })
    Add-Check 'skip-role-detected' ((($f -join ',') -eq ($ExpectedFailRole -join ',')) -and $o.total -eq $ExpectedTotal) ("{0}/{1}; failed: {2}" -f $o.passed, $o.total, ($f -join ','))
  }

  # ---------------- frozen suite: verify AFTER ----------------
  $after = @(Get-FrozenManifest $FrozenDir)
  $after | Set-Content -LiteralPath (Join-Path $OutDir 'hashes_frozen_after.txt') -Encoding ASCII
  $diffA = @(Compare-Object $expected $after)
  Add-Check 'frozen-after' ($diffA.Count -eq 0 -and $after.Count -eq 18) ("{0} files; differences vs SHA256SUMS: {1}" -f $after.Count, $diffA.Count)
  if ($git) {
    $gitStatusCode = Invoke-Logged $git "status --porcelain -- $($FrozenRel.Replace('\','/'))" $RepoRoot (Join-Path $OutDir 'git_status_frozen')
    $gs = (Get-Content -LiteralPath (Join-Path $OutDir 'git_status_frozen.stdout.log') -Raw)
    if ($null -eq $gs) { $gs = '' }
    Add-Check 'frozen-git-clean' ($gitStatusCode -eq 0 -and $gs.Trim() -eq '') 'git status --porcelain on the frozen folder'
  }

  $expectedChecks = 15; if (-not $git) { $expectedChecks = 14 }
  $allOk = ($checks.Count -ge $expectedChecks) -and (@($checks | Where-Object { -not $_.ok }).Count -eq 0)
  if ($allOk) { $status = 'PASS' } else { $status = 'FAIL' }
}
catch {
  if ($status -ne 'BLOCKED') { $status = 'FAIL' }
  Add-Check 'exception' $false $_.Exception.Message
}
finally {
  if (Test-Path -LiteralPath $FrozenDir) {
    $finalHashes = @(Get-FrozenManifest $FrozenDir)
    $finalHashes | Set-Content -LiteralPath (Join-Path $OutDir 'hashes_frozen_after.txt') -Encoding ASCII
    if (Test-Path -LiteralPath $SumsFile) {
      $finalExpected = @(Get-Content -LiteralPath $SumsFile | Where-Object { $_.Trim() -ne '' })
      $finalDiff = @(Compare-Object $finalExpected $finalHashes)
      Add-Check 'frozen-finally' ($finalDiff.Count -eq 0 -and $finalHashes.Count -eq 18) 'Checked even after failure or blocked run.'
      if ($finalDiff.Count -ne 0 -or $finalHashes.Count -ne 18) { $status = 'FAIL' }
    }
  }
  Remove-Item Env:MUTATE -ErrorAction SilentlyContinue
  $summary = [ordered]@{
    run_id = $RunId; status = $status; finished_utc = (Get-Date).ToUniversalTime().ToString('o')
    scope = 'Re-run of the frozen G1 library suite only. Gates G1a and G1b remain NOT passed.'
    checks = $checks
  }
  $summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutDir 'verification.json') -Encoding UTF8
  $md = @("# G1 suite re-run - $RunId", '', "**Status: $status**", '',
          'Scope: re-run of the frozen G1 library suite only. **Gates G1a and G1b remain NOT passed.**', '',
          ('Environment: see env.json (node/npm/os; conformance to baseline Node {0}).' -f $BaselineNodeMajor), '',
          '| Check | OK | Detail |', '|---|---|---|')
  foreach ($c in $checks) { $md += ('| {0} | {1} | {2} |' -f $c.check, $c.ok, ($c.detail -replace '\|','/')) }
  $md | Set-Content -LiteralPath (Join-Path $OutDir 'VERIFICATION.md') -Encoding UTF8
  if ($RemoveWork -and (Test-Path -LiteralPath $Work)) { Write-Warning 'Work retained under the no-delete policy.' }
  Write-Host ''
  Write-Host "STATUS: $status   evidence: evidence\runs\$RunId"
}
if ($status -eq 'PASS') { exit 0 } elseif ($status -eq 'BLOCKED') { exit 2 } else { exit 1 }
