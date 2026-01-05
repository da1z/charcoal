#!/bin/bash

file_path=$(jq -r '.tool_input.file_path')

# Only run on JS/TS files
if ! echo "$file_path" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

# Run biome, capture stderr (unfixable errors)
errors=$(bunx biome check --write "$file_path" 2>&1 >/dev/null)

# If errors exist, print to stderr and exit 2
if [ -n "$errors" ]; then
  echo "$errors" >&2
  exit 2
fi

