#!/bin/bash

# Build for all platforms
build_all() {
    echo "Building TKM Wallet for all platforms..."
    
    # Install dependencies
    npm install
    
    # Build for all platforms
    npm run dist:all
    
    echo "✅ Build complete! Check the 'dist' directory."
}

# Build for specific platforms
build_windows() {
    npm run dist:windows
}

build_linux() {
    npm run dist:linux
}

build_mac() {
    npm run dist:mac
}

# Usage
case "$1" in
    all)
        build_all
        ;;
    windows)
        build_windows
        ;;
    linux)
        build_linux
        ;;
    mac)
        build_mac
        ;;
    *)
        echo "Usage: $0 {all|windows|linux|mac}"
        exit 1
        ;;
esac
