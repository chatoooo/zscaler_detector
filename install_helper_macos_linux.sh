#!/bin/bash
set -e
HOST_NAME="com.github.chatoooo.zscaler_detector"
SCRIPT_NAME="zscaler_detector.py"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_SCRIPT_PATH="$DIR/$SCRIPT_NAME"
# --- Browser Detection ---
declare -a browsers
declare -a browser_names
declare -a target_dirs
if [ "$(uname)" == "Darwin" ]; then
    # macOS paths
    if [ -d "/Applications/Google Chrome.app" ]; then
        browsers+=("Google Chrome")
        target_dirs+=("$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts")
    fi
    if [ -d "/Applications/Brave Browser.app" ]; then
        browsers+=("Brave Browser")
        target_dirs+=("$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts")
    fi
    if [ -d "/Applications/Opera.app" ]; then
        browsers+=("Opera")
        target_dirs+=("$HOME/Library/Application Support/com.operasoftware.Opera/NativeMessagingHosts")
    fi
else
    # Linux paths
    if command -v google-chrome &> /dev/null; then
        browsers+=("Google Chrome")
        target_dirs+=("$HOME/.config/google-chrome/NativeMessagingHosts")
    fi
    if command -v brave-browser &> /dev/null; then
        browsers+=("Brave Browser")
        target_dirs+=("$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts")
    fi
    if command -v opera &> /dev/null; then
        browsers+=("Opera")
        target_dirs+=("$HOME/.config/opera/NativeMessagingHosts")
    fi
fi
if [ ${#browsers[@]} -eq 0 ]; then
    echo "ERROR: No compatible browsers (Chrome, Brave, Opera) found."
    exit 1
fi
echo "Detected browsers:"
for i in "${!browsers[@]}"; do
    echo "  $(($i+1))) ${browsers[$i]}"
done
read -p "Please choose a browser to install the helper for: " choice
if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#browsers[@]} ]; then
    echo "Invalid choice."
    exit 1
fi
TARGET_DIR="${target_dirs[$(($choice-1))]}"
BROWSER_NAME="${browsers[$(($choice-1))]}"
# --- Installation ---
if [ ! -f "$PYTHON_SCRIPT_PATH" ]; then
    echo "ERROR: Python script '$SCRIPT_NAME' not found in the same directory as this installer."
    exit 1
fi
mkdir -p "$TARGET_DIR"
echo -e "\nPlease open $BROWSER_NAME and navigate to its extensions page"
echo "Find the 'Zscaler Intercept Detector' extension and copy its ID."
read -p "Paste the Extension ID here and press Enter: " EXTENSION_ID
if [ -z "$EXTENSION_ID" ]; then
    echo "ERROR: Extension ID cannot be empty."
    exit 1
fi
MANIFEST_JSON="{\
  \"name\": \"$HOST_NAME\",\
  \"description\": \"Zscaler Detector Helper\",\
  \"path\": \"$PYTHON_SCRIPT_PATH\",\
  \"type\": \"stdio\",\
  \"allowed_origins\": [\
    \"chrome-extension://$EXTENSION_ID/\"\
  ]\
}"
echo "$MANIFEST_JSON" > "$TARGET_DIR/$HOST_NAME.json"
chmod +x "$PYTHON_SCRIPT_PATH"
echo -e "\n\nInstallation for $BROWSER_NAME complete!"
echo "The native messaging host has been installed."
echo "Please completely restart $BROWSER_NAME for the changes to take effect."