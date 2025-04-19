#!/usr/bin/env node
// This script is designed to prevent rebuilding of native modules
// It's a workaround for cross-platform builds

console.log("Skipping native module rebuild - using prebuilt binaries");
process.exit(0);
