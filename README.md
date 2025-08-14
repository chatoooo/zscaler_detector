# Zscaler Detector - Helper App Installation

This document provides instructions on how to install the local Python helper application required for the "Zscaler Intercept Detector" Chrome extension to function correctly.

---

## Prerequisites

- **Python 3:** Required to run the helper script. Download from [python.org](https://www.python.org/).
  - **On Windows:** Ensure you check the box **"Add Python to PATH"** during installation.
- **Google Chrome:** The browser this extension is designed for.

---

## Easy Installation (Recommended)

The easiest way to install the helper app is to use the provided scripts.

### For Windows

1.  Place the `install_helper_windows.ps1` and `zscaler_detector.py` files in the same permanent folder.
2.  Right-click on `install_helper_windows.ps1` and select **"Run with PowerShell"**.
3.  The script will ask for your Chrome Extension ID. Open Chrome, go to `chrome://extensions`, find the "Zscaler Intercept Detector" extension, and copy its ID.
4.  Paste the ID into the PowerShell window and press Enter.
5.  The script will handle the rest automatically.

### For macOS & Linux

1.  Place the `install_helper_macos_linux.sh` and `zscaler_detector.py` files in the same permanent folder (e.g., `~/zscaler-detector`).
2.  Open a **Terminal**.
3.  Navigate to the folder where you saved the files (e.g., `cd ~/zscaler-detector`).
4.  Make the installation script executable by running:
    ```bash
    chmod +x install_helper_macos_linux.sh
    ```
5.  Run the script:
    ```bash
    ./install_helper_macos_linux.sh
    ```
6.  The script will prompt you for your Chrome Extension ID. Find it on the `chrome://extensions` page, then paste it into the terminal and press Enter.

---

## Manual Installation

If you prefer to install manually, follow these steps.

### Step 1: Save the Python Script

Save `zscaler_detector.py` to a permanent location on your computer.

### Step 2: Create the Native Messaging Manifest

In the same folder, create a file named `com.github.chatoooo.zscaler_detector.json` with the following content:

```json
{
  "name": "com.github.chatoooo.zscaler_detector",
  "description": "Zscaler Detector Helper",
  "path": "FULL_PATH_TO_YOUR_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID_HERE/"
  ]
}
```

You must edit two lines:

`path`: Replace `FULL_PATH_TO_YOUR_SCRIPT` with the absolute path to `zscaler_detector.py`.

Windows Example: `"C:\\Tools\\zscaler-detector\\zscaler_detector.py"`

macOS/Linux Example: `"/Users/yourusername/zscaler-detector/zscaler_detector.py"`

`allowed_origins`: Replace `YOUR_EXTENSION_ID_HERE` with the ID from the `chrome://extensions` page.

### Step 3: Register the Manifest File
#### Windows
Open Registry Editor (`regedit`).

Navigate to `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts`.

Create a new key named `com.github.chatoooo.zscaler_detector`.

Set the `(Default)` value of this new key to the full path of your `.json` manifest file.

#### macOS
Open Terminal.

Run: `mkdir -p "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"`

Run: `cp /path/to/your/com.github.chatoooo.zscaler_detector.json "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/"`

#### Linux
Open Terminal.

Run: `mkdir -p "$HOME/.config/google-chrome/NativeMessagingHosts"`

Run: `cp /path/to/your/com.github.chatoooo.zscaler_detector.json "$HOME/.config/google-chrome/NativeMessagingHosts/"`

### Final Step
After either the easy or manual installation, **restart Google Chrome completely**. The extension should now function correctly.
