# PowerShell script to update all controller constructors to accept ResponseHelper

$controllersPath = "c:\Users\offic\OneDrive\Desktop\randevubu.server\src\controllers"

# List of controllers to update (excluding already updated ones)
$controllers = @(
    "userBehaviorController.ts",
    "subscriptionController.ts",
    "roleController.ts",
    "discountCodeController.ts",
    "usageController.ts",
    "staffController.ts",
    "pushNotificationController.ts",
    "dailyNotebookController.ts",
    "paymentMethodController.ts",
    "contactController.ts",
    "businessClosureController.ts",
    "businessController.ts",
    "authController.ts",
    "ratingController.ts",
    "reportsController.ts",
    "paymentController.ts",
    "secureNotificationController.ts"
)

foreach ($controller in $controllers) {
    $filePath = Join-Path $controllersPath $controller
    
    if (Test-Path $filePath) {
        Write-Host "Processing $controller..." -ForegroundColor Cyan
        
        $content = Get-Content $filePath -Raw
        
        # Check if ResponseHelper is already imported
        if ($content -notmatch "import.*ResponseHelper.*from.*responseHelper") {
            # Add ResponseHelper import after the first import statement
            $content = $content -replace "(import.*from.*;\r?\n)", "`$1import { ResponseHelper } from '../utils/responseHelper';`n"
            
            Write-Host "  - Added ResponseHelper import" -ForegroundColor Green
        }
        
        # Update constructor - find constructor and add responseHelper parameter
        # Pattern: constructor(...) {
        if ($content -match "constructor\s*\([^)]*\)\s*\{") {
            # Extract current constructor parameters
            $constructorMatch = [regex]::Match($content, "constructor\s*\(([^)]*)\)")
            if ($constructorMatch.Success) {
                $currentParams = $constructorMatch.Groups[1].Value.Trim()
                
                # Check if responseHelper is already in params
                if ($currentParams -notmatch "responseHelper") {
                    # Add responseHelper parameter
                    if ($currentParams -eq "") {
                        $newParams = "private responseHelper: ResponseHelper"
                    } else {
                        # Add comma and new parameter
                        $newParams = $currentParams + ",`n    private responseHelper: ResponseHelper"
                    }
                    
                    # Replace constructor
                    $oldConstructor = "constructor($currentParams)"
                    $newConstructor = "constructor($newParams)"
                    $content = $content -replace [regex]::Escape($oldConstructor), $newConstructor
                    
                    Write-Host "  - Updated constructor" -ForegroundColor Green
                }
            }
        }
        
        # Write back to file
        Set-Content -Path $filePath -Value $content -NoNewline
        Write-Host "  ✓ Completed $controller" -ForegroundColor Green
    } else {
        Write-Host "  ✗ File not found: $controller" -ForegroundColor Red
    }
}

Write-Host "`nAll controllers updated successfully!" -ForegroundColor Green
