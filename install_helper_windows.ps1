# --- Configuration ---
$HostName = "com.github.chatoooo.zscaler_detector"
$ScriptName = "zscaler_detector.py"
# --- Browser Detection ---
$availableBrowsers = @()
$browserPaths = @{}
if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe") {
    $availableBrowsers += "Google Chrome"
    $browserPaths["Google Chrome"] = "HKCU:\Software\Google\Chrome\NativeMessagingHosts"
}
if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\brave.exe") {
    $availableBrowsers += "Brave Browser"
    $browserPaths["Brave Browser"] = "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts"
}
if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\opera.exe") {
    $availableBrowsers += "Opera"
    $browserPaths["Opera"] = "HKCU:\Software\Opera Software\NativeMessagingHosts"
}
if ($availableBrowsers.Count -eq 0) {
    Write-Host "ERROR: No compatible browsers (Chrome, Brave, Opera) found." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
# --- User Choice ---
Write-Host "Zscaler Detector Native Host Installer for Windows" -ForegroundColor Yellow
Write-Host "Detected browsers:"
for ($i = 0; $i -lt $availableBrowsers.Count; $i++) {
    Write-Host ("  " + ($i + 1) + ") " + $availableBrowsers[$i])
}
$choice = Read-Host "Please choose a browser to install the helper for"
$index = [int]$choice - 1
if ($index -lt 0 -or $index -ge $availableBrowsers.Count) {
    Write-Host "Invalid choice." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
$selectedBrowser = $availableBrowsers[$index]
$RegistryPathBase = $browserPaths[$selectedBrowser]
# --- Script Body ---
$InstallerDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonScriptPath = Join-Path $InstallerDirectory $ScriptName
$ManifestPath = Join-Path $InstallerDirectory "$HostName.json"
if (-not (Test-Path $PythonScriptPath)) {
    Write-Host "ERROR: Python script '$ScriptName' not found in the same directory as this installer." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""
Write-Host "Please open $selectedBrowser and navigate to its extensions page."
Write-Host "Find the 'Zscaler Intercept Detector' extension and copy its ID."
$ExtensionId = Read-Host "Paste the Extension ID here"
if ([string]::IsNullOrWhiteSpace($ExtensionId)) {
    Write-Host "ERROR: Extension ID cannot be empty." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
$JsonPath = $PythonScriptPath.Replace('\', '\\')
$ManifestContent = @"
{
  "name": "$HostName",
  "description": "Zscaler Detector Helper",
  "path": "$JsonPath",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$ExtensionId/"
  ]
}
"@
try {
    Set-Content -Path $ManifestPath -Value $ManifestContent -Encoding UTF8 -ErrorAction Stop
    Write-Host "Successfully created manifest file at $ManifestPath" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to create manifest file. Please check permissions." -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Press Enter to exit"
    exit 1
}
$RegistryPath = "$RegistryPathBase\$HostName"
if (-not (Test-Path $RegistryPathBase)) {
    try {
        New-Item -Path $RegistryPathBase -Force -ErrorAction Stop | Out-Null
    }
    catch {
        Write-Host "ERROR: Failed to create base registry key path. Please check permissions." -ForegroundColor Red
        Write-Host $_.Exception.Message
        Read-Host "Press Enter to exit"
        exit 1
    }
}
if (-not (Test-Path $RegistryPath)) {
    try {
        New-Item -Path $RegistryPathBase -Name $HostName -ErrorAction Stop | Out-Null
        Write-Host "Successfully created registry key." -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Failed to create registry key. Please check permissions." -ForegroundColor Red
        Write-Host $_.Exception.Message
        Read-Host "Press Enter to exit"
        exit 1
    }
}
try {
    Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value $ManifestPath -ErrorAction Stop
    Write-Host "Successfully set registry value." -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to set registry value." -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""
Write-Host "Installation for $selectedBrowser complete!" -ForegroundColor Cyan
Write-Host "Please completely restart $selectedBrowser for the changes to take effect."
Read-Host "Press Enter to exit"