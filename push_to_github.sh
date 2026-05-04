#!/bin/bash
echo "============================================================"
echo "  Mentfx Dashboard - GitHub Upload Helper (Mac/Linux)"
echo "============================================================"
echo ""

# Set Git identity
git config user.name "thatkingmag"
git config user.email "thatkingmag@github.com"

echo "[1/3] Adding files..."
git add .

echo "[2/3] Committing changes..."
git commit -m "Admin Update: Content and Data sync"

echo "[3/3] Pushing to GitHub..."
echo ""
git push origin main --force

echo ""
echo "============================================================"
echo "  DONE! Your dashboard should now be fully live."
echo "============================================================"
