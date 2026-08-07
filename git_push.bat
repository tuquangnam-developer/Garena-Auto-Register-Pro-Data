@echo off
title Git Auto Push Tool
color 0A

echo ========================================
echo    GIT AUTO PUSH TOOL
echo ========================================
echo.

:: Đường dẫn đến thư mục project
set PROJECT_PATH=G:\github-git\Garena-Auto-Register-Pro-Data

:: Di chuyển vào thư mục project
cd /d "%PROJECT_PATH%"

:: Kiểm tra xem có thay đổi gì không
git status --porcelain
if errorlevel 1 (
    echo [!] Loi: Khong tim thay repository Git!
    pause
    exit
)

:: Kiểm tra xem có thay đổi không
git status --porcelain | findstr . > nul
if errorlevel 1 (
    echo [!] Khong co thay doi nao de commit!
    echo.
    echo Nhan phim bat ky de thoat...
    pause > nul
    exit
)

:: Hiển thị file đã thay đổi
echo [*] Cac file thay doi:
git status --short
echo.

:: Nhập message commit
set /p commit_msg="Nhap commit message (hoac de trong de dung mac dinh): "

:: FIX: Đặt default message không có dấu cách và ký tự đặc biệt
if "%commit_msg%"=="" set commit_msg=Auto-update-%date:~10,4%-%date:~4,2%-%date:~7,2%

:: Thực hiện add, commit, push
echo.
echo [*] Dang add file...
git add .

echo [*] Dang commit...
git commit -m "%commit_msg%"

if errorlevel 1 (
    echo [!] Commit that bai!
    echo Thu lai voi message khac...
    set /p commit_msg="Nhap commit message (khong dau cach, khong ki tu dac biet): "
    git commit -m "%commit_msg%"
)

echo [*] Dang push len GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo [!] Push that bai! Thu lai voi branch khac...
    git push origin master
)

echo.
echo ========================================
echo    HOAN THANH! ^(^_^^)
echo ========================================
echo.
pause