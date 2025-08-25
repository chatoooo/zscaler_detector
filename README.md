# Zscaler Detector - Full Installation Guide

This document provides complete instructions on how to install both the Chrome extension and the local Python helper application from the official GitHub repository.

---

## Part 1: Get the Project Files

First, you need to get all the project files from GitHub.

1.  **Go to the GitHub repository:** [https://github.com/chatoooo/zscaler_detector](https://github.com/chatoooo/zscaler_detector)
2.  Click the green **`< > Code`** button.
3.  Choose one of the following methods:
    * **Download ZIP:** Click **"Download ZIP"**. Unzip the downloaded file to a permanent location on your computer (e.g., `C:\Tools\` or `~/`).
    * **Clone (for Git users):** Copy the repository URL and run `git clone https://github.com/chatoooo/zscaler_detector.git` in your terminal.

You will now have a main `zscaler_detector` folder, which contains the `zscaler-detector` subfolder with all the extension files.

---

## Part 2: Install the Chrome Extension

1.  **Open Chrome Extensions:** Open Chrome and navigate to `chrome://extensions`.
2.  **Enable Developer Mode:** In the top-right corner, turn on the "Developer mode" toggle.
3.  **Load Unpacked:** Click on "**Load unpacked**".
4.  **Select Folder:** In the file selection dialog, navigate to and select the **`zscaler-detector`** subfolder (the one inside `zscaler_detector`).

The extension is now installed. Note the **ID** of the extension on its card; you will need it for the next part.

---

## Part 3: Install the Helper App

The extension requires a local helper application to check SSL certificates.

### Prerequisites

- **Python 3:** Required to run the helper script. Download from [python.org](https://www.python.org/).
    - **On Windows:** Ensure you check the box **"Add Python to PATH"** during installation.

### Easy Installation (Recommended)

The helper scripts are located in the main project folder (`zscaler_detector`).

#### For Windows

1.  Navigate to the main project folder (`zscaler_detector`).
2.  Right-click on `install_helper_windows.ps1` and select **"Run with PowerShell"**.
3.  The script will ask for your Chrome Extension ID. Paste the ID you copied from the `chrome://extensions` page and press Enter.
4.  The script will handle the rest automatically.

#### For macOS & Linux

1.  Open a **Terminal** and navigate to the main project folder (e.g., `cd ~/Downloads/zscaler_detector`).
2.  Make the installation script executable by running:
    ```bash
    chmod +x install_helper_macos_linux.sh
    ```
3.  Run the script:
    ```bash
    ./install_helper_macos_linux.sh
    ```
4.  The script will prompt you for your Chrome Extension ID. Paste the ID you copied from the `chrome://extensions` page and press Enter.

---

## Final Step

After the installation script finishes, **restart Google Chrome completely**. The extension should now be fully functional. You can configure the banner, blocklist, and other settings by right-clicking the extension icon and selecting "Options".

The default domain list is now automatically updated and merged with your custom list when you update the extension, so you'll always have the latest recommendations without losing your own entries.
