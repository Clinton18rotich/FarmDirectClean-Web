#!/data/data/com.termux/files/usr/bin/bash
# FILE: scripts/backup.sh
# FarmDirect — data backup script
# Snapshots backend/data/storage/*.json to backups/YYYY-MM-DD-HHMMSS/
# Keeps the last N snapshots (default 30). Safe to run anytime.

set -u

# ─── Config ────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$REPO_DIR/backend/data/storage"
BACKUP_ROOT="$REPO_DIR/backups"
KEEP="${FD_BACKUP_KEEP:-30}"

# ─── Guard ─────────────────────────────────────────────────
if [ ! -d "$SRC_DIR" ]; then
  echo "❌ source dir not found: $SRC_DIR" >&2
  exit 1
fi

STAMP="$(date +%Y-%m-%d-%H%M%S)"
DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST"

# ─── Copy ──────────────────────────────────────────────────
COUNT=0
BYTES=0
for f in "$SRC_DIR"/*.json; do
  [ -e "$f" ] || continue
  cp "$f" "$DEST/"
  COUNT=$((COUNT + 1))
  BYTES=$((BYTES + $(wc -c < "$f")))
done

# Also snapshot trades.json specifically — it's the most critical file
if [ -f "$SRC_DIR/trades.json" ]; then
  cp "$SRC_DIR/trades.json" "$DEST/trades.json.critical"
fi

# ─── Prune old ─────────────────────────────────────────────
PRUNED=0
if [ "$KEEP" -gt 0 ]; then
  # list dirs newest-first, skip the first KEEP, delete the rest
  OLD="$(ls -1dt "$BACKUP_ROOT"/*/ 2>/dev/null | tail -n +$((KEEP + 1)))"
  if [ -n "$OLD" ]; then
    echo "$OLD" | while read -r d; do
      [ -d "$d" ] && rm -rf "$d"
    done
    PRUNED=$(echo "$OLD" | grep -c .)
  fi
fi

# ─── Summary ───────────────────────────────────────────────
HUMAN_BYTES="$((BYTES / 1024)) KB"
TOTAL="$(ls -1d "$BACKUP_ROOT"/*/ 2>/dev/null | wc -l)"
echo "✅ backup $STAMP — $COUNT files, $HUMAN_BYTES, kept=$TOTAL pruned=$PRUNED"
