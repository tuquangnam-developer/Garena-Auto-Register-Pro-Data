@echo off
title Git Auto Push - Simple
color 0E

cd /d G:\github-git\Garena-Auto-Register-Pro-Data

:: Tạo message an toàn
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set day=%%a
    set month=%%b
    set year=%%c
)
set commit_msg=Update-%year%%month%%day%

echo Dang push code len GitHub...
echo Commit message: %commit_msg%
echo.

git add .
git commit -m "%commit_msg%"
git push origin main

echo.
echo Hoan thanh!
pause