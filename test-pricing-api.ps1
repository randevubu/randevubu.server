# Test pricing API endpoints
Write-Host "🧪 Testing Pricing API Endpoints..." -ForegroundColor Green

# Test Istanbul pricing (Tier 1 - 2x multiplier)
Write-Host "`n📍 Testing Istanbul (Tier 1 - 2x multiplier):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/subscriptions/plans?city=Istanbul" -Method GET
    Write-Host "✅ Istanbul pricing response received" -ForegroundColor Green
    Write-Host "Location: $($response.data.location.city)" -ForegroundColor Cyan
    if ($response.data.plans.Count -gt 0) {
        $plan = $response.data.plans[0]
        Write-Host "First plan: $($plan.displayName)" -ForegroundColor Cyan
        Write-Host "Base price: $($plan.basePrice) TL" -ForegroundColor Cyan
        Write-Host "Location price: $($plan.price) TL" -ForegroundColor Cyan
        Write-Host "Multiplier: $($plan.locationPricing.multiplier)x" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Istanbul test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Bursa pricing (Tier 2 - 1.5x multiplier)
Write-Host "`n📍 Testing Bursa (Tier 2 - 1.5x multiplier):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/subscriptions/plans?city=Bursa" -Method GET
    Write-Host "✅ Bursa pricing response received" -ForegroundColor Green
    Write-Host "Location: $($response.data.location.city)" -ForegroundColor Cyan
    if ($response.data.plans.Count -gt 0) {
        $plan = $response.data.plans[0]
        Write-Host "First plan: $($plan.displayName)" -ForegroundColor Cyan
        Write-Host "Base price: $($plan.basePrice) TL" -ForegroundColor Cyan
        Write-Host "Location price: $($plan.price) TL" -ForegroundColor Cyan
        Write-Host "Multiplier: $($plan.locationPricing.multiplier)x" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Bursa test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Kütahya pricing (Tier 3 - 1x multiplier)
Write-Host "`n📍 Testing Kütahya (Tier 3 - 1x multiplier):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/subscriptions/plans?city=Kutahya" -Method GET
    Write-Host "✅ Kütahya pricing response received" -ForegroundColor Green
    Write-Host "Location: $($response.data.location.city)" -ForegroundColor Cyan
    if ($response.data.plans.Count -gt 0) {
        $plan = $response.data.plans[0]
        Write-Host "First plan: $($plan.displayName)" -ForegroundColor Cyan
        Write-Host "Base price: $($plan.basePrice) TL" -ForegroundColor Cyan
        Write-Host "Location price: $($plan.price) TL" -ForegroundColor Cyan
        Write-Host "Multiplier: $($plan.locationPricing.multiplier)x" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Kütahya test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test default pricing (no city specified)
Write-Host "`n📍 Testing Default Pricing (no city):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/subscriptions/plans" -Method GET
    Write-Host "✅ Default pricing response received" -ForegroundColor Green
    Write-Host "Location: $($response.data.location)" -ForegroundColor Cyan
    if ($response.data.plans.Count -gt 0) {
        $plan = $response.data.plans[0]
        Write-Host "First plan: $($plan.displayName)" -ForegroundColor Cyan
        Write-Host "Price: $($plan.price) TL" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Default pricing test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Pricing API tests completed!" -ForegroundColor Green

