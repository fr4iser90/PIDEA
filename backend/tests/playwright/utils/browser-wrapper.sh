#!/bin/bash
exec appimage-run "/home/fr4iser/.cache/ms-playwright/chromium-1193/chrome-linux/chrome" --no-sandbox --disable-gpu "$@"
