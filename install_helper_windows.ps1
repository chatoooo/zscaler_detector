# This script automates the installation of the native messaging host for the
# Zscaler Detector Chrome extension on Windows.

# --- Configuration ---
$HostName = "com.github.chatoooo.zscaler_detector"
$ScriptName = "zscaler_detector.py"

# --- Script Body ---
Write-Host "Zscaler Detector Native Host Installer for Windows" -ForegroundColor Yellow

# Get the directory where this script is located
$InstallerDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonScriptPath = Join-Path $InstallerDirectory $ScriptName
$ManifestPath = Join-Path $InstallerDirectory "$HostName.json"

# Check if the Python script exists
if (-not (Test-Path $PythonScriptPath)) {
    Write-Host "ERROR: Python script '$ScriptName' not found in the same directory as this installer." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Prompt for the Extension ID
Write-Host ""
Write-Host "Please open Chrome and navigate to chrome://extensions"
Write-Host "Find the 'Zscaler Intercept Detector' extension and copy its ID."
$ExtensionId = Read-Host "Paste the Extension ID here"

if ([string]::IsNullOrWhiteSpace($ExtensionId)) {
    Write-Host "ERROR: Extension ID cannot be empty." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create the manifest file content
# Note: Using double backslashes in the path for JSON compatibility
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

# Save the manifest file
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

# Define the registry path
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

# Check if the registry key already exists, create if not
if (-not (Test-Path $RegistryPath)) {
    try {
        New-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts" -Name $HostName -ErrorAction Stop | Out-Null
        Write-Host "Successfully created registry key." -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Failed to create registry key. Please check permissions." -ForegroundColor Red
        Write-Host $_.Exception.Message
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Set the default value of the key to the manifest path
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
Write-Host "Installation complete!" -ForegroundColor Cyan
Write-Host "Please completely restart Google Chrome for the changes to take effect."
Read-Host "Press Enter to exit"