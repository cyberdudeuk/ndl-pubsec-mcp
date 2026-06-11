#!/bin/bash
# NDL PubSec MCP — repository setup and initial push
# Run this once after creating the repo on GitHub

set -e

REPO_URL="${1:-https://github.com/YOUR_USERNAME/ndl-pubsec-mcp.git}"

echo "=== NDL PubSec MCP — initial setup ==="
echo "Repo: $REPO_URL"
echo ""

# Ensure we're in the right directory
if [ ! -f "README.md" ]; then
  echo "ERROR: Run this script from the root of the ndl-pubsec-mcp directory"
  exit 1
fi

# Init git if not already done
if [ ! -d ".git" ]; then
  git init
  echo "✓ Git initialised"
fi

# Set up main branch
git checkout -b main 2>/dev/null || git checkout main

# Stage everything except private content
git add README.md LICENCE LICENCE-OGL CONTRIBUTING.md SECURITY.md
git add package.json tsconfig.json .gitignore
git add .github/
git add docs/
git add src/

echo "✓ Files staged"
git status --short

# First commit
git commit -m "feat: initial programme documentation and repo structure

Adds:
- All six NDL domain scope documents with TypeScript tool interfaces
- Cross-cutting analysis and shared platform architecture
- User research bundle with 15 blindspot analyses
- Theory of change with publicly verifiable impact metrics
- Portfolio landing page, showcase and document library
- Standard GDS Way repo files (README, LICENCE, CONTRIBUTING, SECURITY)
- GitHub Actions workflow for Pages deployment

Status: Discovery / Alpha - Sprint 1
Domains: Energy, LTC, Legal, Social Care, Climate, Early Years
Tools specified: 36 across 6 domains"

# Add remote and push
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
git push -u origin main

echo ""
echo "=== Done ==="
echo "Next steps:"
echo "1. Enable GitHub Pages in repo Settings → Pages → Source: GitHub Actions"
echo "2. Your portfolio will be live at: https://YOUR_USERNAME.github.io/ndl-pubsec-mcp/"
echo "3. Add your security email to SECURITY.md"
echo "4. Create the PRIVATE repo for PDP and backlog"
