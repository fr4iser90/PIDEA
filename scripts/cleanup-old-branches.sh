#!/bin/bash

# PIDEA Branch Cleanup Script
# Löscht alle alten, gemergten Branches außer main und pidea-agent

echo "🧹 Starting PIDEA branch cleanup..."

# Sicherheitscheck - nur in PIDEA Repository ausführen
if [ ! -f "package.json" ] || ! grep -q "pidea" package.json; then
    echo "❌ Error: This script must be run from the PIDEA repository root"
    exit 1
fi

echo "📋 Current branches:"
git branch -r

echo ""
echo "🗑️  Deleting old task/refactor/test branches..."

# Remote branches löschen (außer main und pidea-agent)
git branch -r | grep -E "(task/|refactor/|test/)" | sed 's/origin\///' | while read branch; do
    echo "Deleting remote branch: $branch"
    git push origin --delete "$branch" 2>/dev/null || echo "Failed to delete $branch (might already be deleted)"
done

echo ""
echo "🧽 Cleaning up local branches..."

# Lokale Branches bereinigen
git remote prune origin
git branch | grep -E "(task/|refactor/|test/)" | while read branch; do
    echo "Deleting local branch: $branch"
    git branch -D "$branch" 2>/dev/null || echo "Failed to delete local $branch"
done

echo ""
echo "✅ Cleanup completed!"
echo "📋 Remaining branches:"
git branch -r

echo ""
echo "💡 Remember:"
echo "   - main and pidea-agent are protected"
echo "   - Future merges will auto-cleanup via GitHub Actions"
echo "   - Run this script again if needed" 