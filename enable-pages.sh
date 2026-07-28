#!/bin/bash
export PATH="/c/Program Files/GitHub CLI:$PATH"
cd "/c/Users/lllu/claude code file/film-mirror"
gh api -X PUT repos/ualbal0528-stack/film-mirror/pages -f source.branch=main -f source.path=/ -f build_type=workflow 2>&1
echo "Exit code: $?"