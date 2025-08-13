#!/usr/bin/env python3

import sys
import json
import struct
import ssl
import socket
import os

# Get the directory where the script itself is located.
# This makes the log file path reliable, regardless of the current working directory.
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
LOG_FILE = os.path.join(SCRIPT_DIR, "native_app_error.log")

def log_error(message):
    """Writes an error message to the log file."""
    with open(LOG_FILE, "a") as f:
        f.write(f"{message}\n")

# Function to get the certificate issuer from a domain
def get_cert_issuer(hostname):
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                for field in cert.get('issuer', []):
                    if field[0][0] == 'commonName':
                        return field[0][1]
        return None
    except Exception as e:
        log_error(f"Error checking {hostname}: {e}")
        return None

# Function to read a message from Chrome
def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        sys.exit(0)
    message_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

# Function to send a message to Chrome
def send_message(message_content):
    encoded_content = json.dumps(message_content).encode('utf-8')
    encoded_length = struct.pack('@I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

# Main loop
if __name__ == '__main__':
    try:
        while True:
            received_message = read_message()
            hostname_to_check = received_message.get("hostname")

            if hostname_to_check:
                issuer = get_cert_issuer(hostname_to_check)
                is_intercepted = False
                if issuer and 'zscaler' in issuer.lower():
                    is_intercepted = True
                
                send_message({"intercepted": is_intercepted, "issuer": issuer or "N/A"})
            else:
                send_message({"intercepted": False, "error": "No hostname provided"})

    except Exception as e:
        log_error(f"Main loop error: {e}")
        sys.exit(1)
