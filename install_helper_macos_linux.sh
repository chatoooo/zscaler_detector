#!/bin/bash

# This script automates the installation of the native messaging host for the
# Zscaler Detector Chrome extension on macOS and Linux.

set -e

HOST_NAME="com.github.chatoooo.zscaler_detector"
SCRIPT_NAME="zscaler_detector.py"

# Get the absolute path to the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_SCRIPT_PATH="$DIR/$SCRIPT_NAME"

# Ensure the python script exists
if [ ! -f "$PYTHON_SCRIPT_PATH" ]; then
    echo "ERROR: Python script '$SCRIPT_NAME' not found in the same directory as this installer."
    exit 1
fi

# Determine the target directory for the manifest based on the OS
if [ "$(uname)" == "Darwin" ]; then
  TARGET_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
else
  TARGET_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
fi

# Create the target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Prompt the user for the Chrome Extension ID
echo -e "\nPlease open Chrome and navigate to chrome://extensions"
echo "Find the 'Zscaler Intercept Detector' extension and copy its ID."
read -p "Paste the Extension ID here and press Enter: " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo "ERROR: Extension ID cannot be empty."
    exit 1
fi

# Create the manifest file
cat > "$TARGET_DIR/$HOST_NAME.json" << EOF
{
  "name": "$HOST_NAME",
  "description": "Zscaler Detector Helper",
  "path": "$PYTHON_SCRIPT_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

# Make the python script executable
chmod +x "$PYTHON_SCRIPT_PATH"

echo -e "\n\nInstallation complete!"
echo "The native messaging host has been installed."
echo "Please completely restart Google Chrome for the changes to take effect."