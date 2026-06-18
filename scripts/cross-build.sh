#!/bin/bash

# Cross-build script for TKM Wallet
# Builds Windows and Linux binaries on Linux

set -e

echo "�� TKM Wallet Cross-Build Script"
echo "================================"

# Check if wine is installed
if ! command -v wine &> /dev/null; then
    echo "❌ Wine not found. Installing..."
    sudo dpkg --add-architecture i386
    sudo apt-get update
    sudo apt-get install -y wine32 wine wine64
    echo "✅ Wine installed"
fi

# Check if display is set for wine
if [ -z "$DISPLAY" ]; then
    echo "⚠️  DISPLAY not set. Setting up Xvfb..."
    if ! command -v Xvfb &> /dev/null; then
        sudo apt-get install -y xvfb
    fi
    export DISPLAY=:99
    Xvfb :99 -screen 0 1024x768x24 &
    XVFB_PID=$!
    echo "✅ Xvfb started with PID: $XVFB_PID"
fi

# Clean previous builds
echo "�� Cleaning previous builds..."
rm -rf dist node_modules

# Install dependencies
echo "�� Installing dependencies..."
npm install

# Build
echo "��️  Building cross-platform..."
npm run dist:cross

# Kill Xvfb if started
if [ ! -z "$XVFB_PID" ]; then
    kill $XVFB_PID 2>/dev/null || true
fi

echo ""
echo "✅ Cross-build complete!"
echo "�� Output in ./dist/"
echo ""
echo "Windows:"
ls -la dist/*.exe 2>/dev/null || echo "  No Windows builds found"
echo ""
echo "Linux:"
ls -la dist/*.AppImage 2>/dev/null || echo "  No Linux builds found"
ls -la dist/*.deb 2>/dev/null || echo "  No Debian packages found"
