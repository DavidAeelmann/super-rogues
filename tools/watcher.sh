#!/usr/bin/env bash
# Keeps the watcher alive: restarts it if it crashes (exit != 0), stops when it reports work (exit 0).
# Usage (Claude Code, Bash run_in_background): bash tools/watcher.sh
cd "$(dirname "$0")/.."
for i in $(seq 1 50); do
  node --check tools/watcher.js || { echo "WATCHER ERROR: watcher.js does not compile"; exit 1; }
  node tools/watcher.js && exit 0
  echo "$(date -Iseconds) watcher crashed (try $i), restarting" >> tools/watcher.log
  sleep 10
done
echo "WATCHER ERROR: crashed 50 times, see tools/watcher.log"
exit 1
