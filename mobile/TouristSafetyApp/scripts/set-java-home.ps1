# set-java-home.ps1
# Detect common JDK install locations on Windows and set JAVA_HOME for the current session
# Optionally persist to the User environment if run with -Persist
param(
    [switch]$Persist
)

function Find-JdkRoot {
    $candidates = @(
        'C:\Program Files\Eclipse Adoptium',
        'C:\Program Files\AdoptOpenJDK',
        'C:\Program Files\Java',
        'C:\Program Files (x86)\Java'
    )
    foreach ($base in $candidates) {
        if (Test-Path $base) {
            Get-ChildItem -Path $base -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'jdk|openjdk|temurin' } | Sort-Object -Property Name -Descending | ForEach-Object { $_.FullName }
        }
    }
}

$found = Find-JdkRoot | Select-Object -First 1
if (-not $found) {
    Write-Host "No JDK installation found in common locations. Please set JAVA_HOME manually." -ForegroundColor Yellow
    exit 1
}

# Set for current session
$Env:JAVA_HOME = $found
$Env:Path = "$found\bin;" + $Env:Path
Write-Host "Set JAVA_HOME for session to: $found" -ForegroundColor Green
java --version
javac --version

if ($Persist) {
    try {
        [Environment]::SetEnvironmentVariable('JAVA_HOME',$found,'User')
        # Append bin to user Path if not already present
        $userPath = [Environment]::GetEnvironmentVariable('Path','User')
        if ($userPath -notmatch [regex]::Escape("%JAVA_HOME%\\bin") -and $userPath -notmatch [regex]::Escape("$found\\bin")) {
            [Environment]::SetEnvironmentVariable('Path', $userPath + ';%JAVA_HOME%\\bin', 'User')
        }
        Write-Host "Persisted JAVA_HOME to user environment. Restart terminals/IDE to pick up changes." -ForegroundColor Green
    } catch {
        Write-Host "Failed to persist environment variable: $_" -ForegroundColor Red
        exit 1
    }
}
