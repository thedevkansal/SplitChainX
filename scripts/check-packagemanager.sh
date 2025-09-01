#!/bin/bash

# Check for node
if ! which node > /dev/null; then
  echo "Error: node not found. Please ensure you have node@^20.0.0 installed."
  exit 1
fi

# Check for corepack
if ! which corepack > /dev/null; then
  echo "Error: corepack not found. Please ensure you have node@^20.0.0 installed."
  exit 1
fi

npx only-allow pnpm
