#!/usr/bin/env bash
set -euo pipefail

# Must run from repo root
root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ] || [ ! -d "$root/.git" ]; then
  echo "Error: Run this from the repo root (inside a git repo)."
  exit 1
fi
cd "$root"

echo "Starting AI files migration..."

# Create target structure
mkdir -p .ai/sessions .ai/docs .ai/tests/adapters .ai/artifacts

# Move session handovers (preserve history)
if [ -d docs/handover ]; then
  echo "Moving handover documents..."
  for file in docs/handover/*; do
    if [ -f "$file" ]; then
      git mv "$file" .ai/sessions/ 2>/dev/null || true
    fi
  done
  rmdir docs/handover 2>/dev/null || true
fi

# Move AI docs if present
echo "Moving AI documentation..."
for f in docs/BUILD_LOG.md docs/DATA_FLOW_ARCHITECTURE.md docs/IMPLEMENTATION_STRATEGY.md; do
  if [ -f "$f" ]; then
    echo "  Moving $(basename $f)..."
    git mv "$f" .ai/docs/ 2>/dev/null || true
  fi
done

# Move AI-generated tests (keeping them as reference, not in CI)
if [ -d lib/adapters/__tests__ ]; then
  echo "Moving AI-generated tests..."
  for file in lib/adapters/__tests__/*; do
    if [ -f "$file" ]; then
      git mv "$file" .ai/tests/adapters/ 2>/dev/null || true
    fi
  done
  rmdir lib/adapters/__tests__ 2>/dev/null || true
fi

# Move artifacts if they exist
echo "Moving build artifacts..."
[ -f typecheck-output.txt ] && git mv typecheck-output.txt .ai/artifacts/ 2>/dev/null || true
[ -f tsconfig.tsbuildinfo ] && git mv tsconfig.tsbuildinfo .ai/artifacts/ 2>/dev/null || true

# Update CLAUDE.md with new paths (idempotent using markers)
echo "Updating CLAUDE.md..."
begin="<!-- AI-DOCS:BEGIN -->"
end="<!-- AI-DOCS:END -->"
block="$begin
## AI Documentation Locations

- Session handovers: \`.ai/sessions/\`
- Build log: \`.ai/docs/BUILD_LOG.md\`
- Architecture: \`.ai/docs/DATA_FLOW_ARCHITECTURE.md\`
- Implementation strategy: \`.ai/docs/IMPLEMENTATION_STRATEGY.md\`
- AI-generated tests: \`.ai/tests/\` (reference only, not CI-enforced)
- Build artifacts: \`.ai/artifacts/\`
$end"

if grep -q "$begin" CLAUDE.md 2>/dev/null; then
  # Replace content between markers
  perl -0777 -pe "s/$begin.*?$end/$block/s" -i CLAUDE.md
else
  # Add new section with markers if it doesn't exist
  printf "\n%s\n" "$block" >> CLAUDE.md
fi

echo "Migration complete!"
echo ""
echo "Summary of changes:"
echo "  - Session handovers moved to: .ai/sessions/"
echo "  - AI docs moved to: .ai/docs/"
echo "  - AI tests moved to: .ai/tests/adapters/"
echo "  - Build artifacts will be created in: .ai/artifacts/"
echo ""
echo "Next steps:"
echo "  1. Review the changes with: git status"
echo "  2. Commit with: git commit -m 'refactor: Move AI artifacts to .ai/ directory'"
echo "  3. Update any broken doc links if needed"