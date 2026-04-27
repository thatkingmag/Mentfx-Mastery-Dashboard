@echo off
echo.
echo ============================================================
echo   Mentfx Dashboard - GitHub Upload Helper
echo ============================================================
echo.
echo This script will upload your full dashboard code and data 
echo to https://github.com/thatkingmag/Mentfx-Mastery-Dashboard
echo.

REM Set Git identity
git config user.name "thatkingmag"
git config user.email "thatkingmag@github.com"

echo [1/3] Adding files...
git add .

echo [2/3] Committing changes...
git commit -m "Full dashboard upload: 258 webinars + Mastery curriculum"

echo [3/3] Pushing to GitHub...
echo.
echo IMPORTANT: If a login popup appears, please sign in to your GitHub account.
echo.
git push origin main --force

echo.
echo ============================================================
echo   DONE! Your dashboard should now be fully live.
echo ============================================================
pause
