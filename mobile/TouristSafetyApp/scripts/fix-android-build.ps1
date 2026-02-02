<#
Fix Android native build by cleaning CMake/Ninja artifacts and running Gradle clean,
then attempt an `npm run android` build. Useful for the "build.ninja still dirty"
error often caused by file-locks, OneDrive sync interference or stale .cxx caches.

Usage (from project root):
  powershell -ExecutionPolicy Bypass -File .\mobile\TouristSafetyApp\scripts\fix-android-build.ps1
#>
try {
    $projRoot = Resolve-Path "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\.." | Select-Object -ExpandProperty Path
} catch {
    $projRoot = Get-Location
}

Write-Host "Project root: $projRoot" -ForegroundColor Cyan

# Targets to remove - be conservative
$toRemove = @(
    "$projRoot\node_modules\react-native-screens\android\.cxx",
    "$projRoot\node_modules\react-native-screens\android\build",
    "$projRoot\android\.cxx",
    "$projRoot\android\app\build",
    "$projRoot\android\build"
)

foreach ($p in $toRemove) {
    if (Test-Path $p) {
        Write-Host "Removing: $p" -ForegroundColor Yellow
        Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Run Gradle clean
$gradle = "$projRoot\android\gradlew.bat"
if (-Not (Test-Path $gradle)) {
    Write-Warning "gradlew.bat not found at $gradle; ensure Android project is present."
} else {
    Write-Host "Running: gradlew clean" -ForegroundColor Cyan
    Push-Location "$projRoot\android"
    & $gradle clean
    $gradExit = $LASTEXITCODE
    Pop-Location
    if ($gradExit -ne 0) { Write-Warning "gradle clean returned exit code $gradExit" }
}

Write-Host "Waiting 1s to let file system settle..." -ForegroundColor Cyan
Start-Sleep -Seconds 1

Write-Host "Attempting npm run android (this will start build)" -ForegroundColor Cyan
Push-Location $projRoot
& npm run android
$npmExit = $LASTEXITCODE
Pop-Location

if ($npmExit -eq 0) {
    Write-Host "Build succeeded." -ForegroundColor Green
} else {
    Write-Warning "Build exited with code $npmExit. If error persists, try:"
    Write-Host " - Move project out of OneDrive (use a non-synced folder)" -ForegroundColor Yellow
    Write-Host " - Disable antivirus/real-time scanning for the project folder" -ForegroundColor Yellow
    Write-Host " - Re-run this script as Administrator" -ForegroundColor Yellow
}
