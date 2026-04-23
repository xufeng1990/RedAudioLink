#!/usr/bin/env bash
# Build the proto_parse_cli binary used by /api/audio/parse.
# Requires g++ and libfftw3 available on the system.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$DIR/proto_parse_cli}"

g++ -O2 -std=c++14 -w -Wformat \
    -I"$DIR" \
    "$DIR/proto_parse.cpp" "$DIR/main.cpp" \
    -lfftw3 -lm \
    -o "$OUT"

echo "built $OUT"
