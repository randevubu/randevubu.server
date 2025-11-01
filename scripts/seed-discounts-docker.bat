@echo off
REM Docker-compatible discount code seeding script for Windows
REM This script runs the discount code seeding inside a Docker container

echo 🐳 Running discount code seeding in Docker...
echo ==============================================

REM Check if we're in a Docker environment
if exist C:\.dockerenv (
    echo ✅ Running inside Docker container
    echo 📦 Installing dependencies...
    npm install
    
    echo 🎫 Seeding comprehensive discount codes...
    npx ts-node scripts/seed-comprehensive-discount-codes.ts
    
    if %errorlevel% equ 0 (
        echo ✅ Discount code seeding completed successfully!
        echo 🎉 All discount codes have been created and are ready for use.
    ) else (
        echo ❌ Discount code seeding failed!
        exit /b 1
    )
) else (
    echo 🐳 Running from host machine - using Docker Compose
    
    REM Check if docker-compose is available
    docker-compose --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo 📦 Using docker-compose to run seeding...
        docker-compose exec app npx ts-node scripts/seed-comprehensive-discount-codes.ts
    ) else (
        echo 📦 Using docker run to execute seeding...
        docker exec -it $(docker ps -q --filter "name=app") npx ts-node scripts/seed-comprehensive-discount-codes.ts
    )
)

echo.
echo 🎯 Available discount codes:
echo    📊 ONE-TIME DISCOUNTS:
echo    • WELCOME20 - 20%% off first payment
echo    • EARLY50 - 50%% off first payment
echo    • SAVE100 - 100 TL off first payment
echo    • FLASH60 - 60%% off first payment
echo    • HOLIDAY40 - 40%% off first payment
echo    • REFER15 - 15%% off first payment
echo    • TRIAL50 - 50 TL off first payment
echo.
echo    🔄 RECURRING DISCOUNTS:
echo    • LOYAL35 - 35%% off for 3 payments
echo    • UPGRADE25 - 25%% off for 2 payments
echo    • STUDENT50 - 50%% off for 6 payments
echo    • VIP30 - 30%% off for 4 payments
echo    • ANNUAL20 - 20%% off for 12 payments
echo.
echo    🧪 TEST DISCOUNTS:
echo    • EXPIRED10 - Expired discount (Testing)
echo    • LIMITED5 - Usage limit reached (Testing)
echo    • MINIMUM25 - High minimum purchase (Testing)
echo.
echo 🚀 Ready to test the discount system!



