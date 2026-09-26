#!/data/data/com.termux/files/usr/bin/bash
# FILE: scripts/restore.sh
# FarmDirect — data restore script
# Restores backend/data/storage/*.json from a backup snapshot.
#
# Usage:
#   ./scripts/restore.sh                      # list available snapshots
#   ./scripts/restore.sh latest               # restore from newest snapshot
#   ./scripts/restore.sh 2026-09-26-164127    # restore a specific snapshot
#
# Safety:
#   - Backs up current data to <root>/pre-restore-<stamp>/ BEFORE overwriting
#   - Dry-runs by default; requires CONFIRM=1 to actually write
#   - Asks for a snapshot name if none given

set -u

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$REPO_DIR/backend/data/storage"
BACKUP_ROOT="$REPO_DIR/backups"

# ─── List mode ─────────────────────────────────────────────
list_snapshots() {
  echo "══ Available snapshots ══"
  if [ ! -d "$BACKUP_ROOT" ] || [ -z "$(ls -1d "$BACKUP_ROOT"/*/ 2>/dev/null)" ]; then
    echo "  (none — run ./scripts/backup.sh first)"
    return 1
  fi
  local i=1
  for d in $(ls -1dt "$BACKUP_ROOT"/*/ 2>/dev/null); do
    local name="$(basename "$d")"
    local files="$(ls -1 "$d" | wc -l)"
    local bytes="$(du -sk "$d" 2>/dev/null | awk '{print $1}')"
    printf "  [%d] %s  (%d files, %d KB)\n" "$i" "$name" "$files" "$bytes"
    i=$((i + 1))
  done
}

# ─── Resolve snapshot name ─────────────────────────────────
resolve_snapshot() {
  local arg="${1:-}"
  if [ -z "$arg" ]; then
    echo "❌ No snapshot specified." >&2
    list_snapshots >&2
    return 1
  fi
  if [ "$arg" = "latest" ]; then
    local latest="$(ls -1dt "$BACKUP_ROOT"/*/ 2>/dev/null | head -1)"
    if [ -z "$latest" ]; then
      echo "❌ No snapshots available" >&2
      return 1
    fi
    echo "$latest"
    return 0
  fi
  local path="$BACKUP_ROOT/$arg"
  if [ ! -d "$path" ]; then
    echo "❌ Snapshot not found: $path" >&2
    list_snapshots >&2
    return 1
  fi
  echo "$path"
}

# ─── Dry-run mode (default) ────────────────────────────────
if [ $# -eq 0 ]; then
  list_snapshots
  echo ""
  echo "Usage: CONFIRM=1 ./scripts/restore.sh latest"
  echo "       CONFIRM=1 ./scripts/restore.sh <snapshot-name>"
  exit 0
fi

SNAP="$(resolve_snapshot "$1")" || exit 1
SNAP_NAME="$(basename "$SNAP")"

echo "══ Restore plan ══"
echo "  from: $SNAP"
echo "  to:   $DEST_DIR"
echo "  files in snapshot:"
ls -1 "$SNAP" | sed 's/^/    /'
echo ""

# ─── Confirm required ──────────────────────────────────────
if [ "${CONFIRM:-0}" != "1" ]; then
  echo "🛑 DRY RUN — nothing written."
  echo "   To actually restore:"
  echo "     CONFIRM=1 ./scripts/restore.sh $1"
  exit 0
fi

# ─── Pre-restore safety snapshot ───────────────────────────
STAMP="$(date +%Y-%m-%d-%H%M%S)"
SAFETY="$BACKUP_ROOT/pre-restore-$STAMP"
mkdir -p "$SAFETY"
if [ -d "$DEST_DIR" ]; then
  cp "$DEST_DIR"/*.json "$SAFETY/" 2>/dev/null || true
  echo "🛡️  Current data saved to $SAFETY"
fi

# ─── Actually restore ──────────────────────────────────────
mkdir -p "$DEST_DIR"
RESTORED=0
for f in "$SNAP"/*.json "$SNAP"/*.critical; do
  [ -e "$f" ] || continue
  # trades.json.critical → trades.json
  local_name="$(basename "$f" | sed 's/\.critical$//')"
  cp "$f" "$DEST_DIR/$local_name"
  RESTORED=$((RESTORED + 1))
done

echo ""
echo "✅ Restored $RESTORED files from $SNAP_NAME"
echo ""
echo "⚠️  RESTART BACKEND to load restored data:"
echo "   pkill -9 -f 'server.js'; sleep 2; cd $REPO_DIR/backend && nohup node src/server.js > ~/fd-server.log 2>&1 &"
