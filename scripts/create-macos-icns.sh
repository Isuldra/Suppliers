#!/bin/bash

# Script to create macOS ICNS file from PNG files
# Must be run on macOS as it uses the iconutil command

# Set paths
RESOURCES_DIR="$(cd "$(dirname "$0")/.." && pwd)/resources"
ICONSET_DIR="${RESOURCES_DIR}/icon.iconset"
ICNS_FILE="${RESOURCES_DIR}/icon.icns"

# Create iconset directory if it doesn't exist
mkdir -p "${ICONSET_DIR}"

echo "Creating macOS iconset..."

# Copy and rename PNG files to the format required by iconutil
cp "${RESOURCES_DIR}/icon-16.png" "${ICONSET_DIR}/icon_16x16.png"
cp "${RESOURCES_DIR}/icon-32.png" "${ICONSET_DIR}/icon_16x16@2x.png"
cp "${RESOURCES_DIR}/icon-32.png" "${ICONSET_DIR}/icon_32x32.png"
cp "${RESOURCES_DIR}/icon-64.png" "${ICONSET_DIR}/icon_32x32@2x.png"
cp "${RESOURCES_DIR}/icon-128.png" "${ICONSET_DIR}/icon_128x128.png"
cp "${RESOURCES_DIR}/icon-256.png" "${ICONSET_DIR}/icon_128x128@2x.png"
cp "${RESOURCES_DIR}/icon-256.png" "${ICONSET_DIR}/icon_256x256.png"
cp "${RESOURCES_DIR}/icon-512.png" "${ICONSET_DIR}/icon_256x256@2x.png"
cp "${RESOURCES_DIR}/icon-512.png" "${ICONSET_DIR}/icon_512x512.png"
cp "${RESOURCES_DIR}/icon-1024.png" "${ICONSET_DIR}/icon_512x512@2x.png"

# Create ICNS file using iconutil
echo "Converting iconset to ICNS..."
iconutil -c icns "${ICONSET_DIR}" -o "${ICNS_FILE}"

# Check if ICNS was created successfully
if [ -f "${ICNS_FILE}" ]; then
  echo "macOS ICNS file created successfully: ${ICNS_FILE}"
  # Clean up iconset directory
  rm -rf "${ICONSET_DIR}"
else
  echo "Failed to create ICNS file"
  exit 1
fi 