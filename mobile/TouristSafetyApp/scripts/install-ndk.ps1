<#
Install the specific NDK (ndk;23.1.7779620) for the SDK root defined in android/local.properties.
Run this script from PowerShell (as the user):
    .\mobile\TouristSafetyApp\scripts\install-ndk.ps1
#>
$localProps = "mobile/TouristSafetyApp/android/local.properties"
if (Test-Path $localProps) {
    $lines = Get-Content $localProps | Where-Object { $_ -match '^sdk.dir=' }
    if ($lines) {
        $sdk = ($lines -split '=')[1].Trim()
    }
}
if (-not $sdk) { $sdk = "$env:USERPROFILE\AppData\Local\Android\Sdk" }

$candidates = @(
    "$sdk\cmdline-tools\latest\bin\sdkmanager.bat",
    "$sdk\cmdline-tools\bin\sdkmanager.bat",
    "$sdk\tools\bin\sdkmanager.bat"
)

$exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) {
    Write-Error "sdkmanager not found. Install Android SDK Command-line Tools or use Android Studio SDK Manager."
    exit 1
}

Write-Host "Using sdkmanager: $exe" -ForegroundColor Cyan
& $exe --install "ndk;23.1.7779620" --sdk_root="$sdk"
& $exe --licenses --sdk_root="$sdk"

Write-Host "Installed/checked NDK at: $sdk\ndk\23.1.7779620" -ForegroundColor Green
if (Test-Path "$sdk\ndk\23.1.7779620\source.properties") {
    Get-Content "$sdk\ndk\23.1.7779620\source.properties"
} else {
    Write-Warning "NDK source.properties not found; verify installation in Android Studio SDK Manager."
}

Write-Host "Done. Try: npm run android" -ForegroundColor Cyan
