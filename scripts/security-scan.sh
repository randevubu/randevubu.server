#!/bin/bash

# Container Security Scanning Script for RandevuBu
# This script performs comprehensive security scanning of the container images

set -e

CONTAINER_NAME="randevubu-server"
IMAGE_NAME="randevubu-server:latest"
SCAN_RESULTS_DIR="./security-scan-results"

echo "🔒 Starting Security Scan for RandevuBu Container"

# Create results directory
mkdir -p $SCAN_RESULTS_DIR

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Trivy if not present
install_trivy() {
    echo "📦 Installing Trivy security scanner..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update
        sudo apt-get install wget apt-transport-https gnupg lsb-release
        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
        sudo apt-get update
        sudo apt-get install trivy
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install aquasecurity/trivy/trivy
    else
        echo "❌ Please install Trivy manually: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
        exit 1
    fi
}

# Check and install Trivy if needed
if ! command_exists trivy; then
    echo "⚠️  Trivy not found. Installing..."
    install_trivy
fi

echo "🔍 Running Trivy vulnerability scan..."

# Scan for vulnerabilities
trivy image \
    --format json \
    --output $SCAN_RESULTS_DIR/vulnerabilities.json \
    $IMAGE_NAME

# Scan for misconfigurations
trivy config \
    --format json \
    --output $SCAN_RESULTS_DIR/misconfigurations.json \
    .

# Scan for secrets
trivy fs \
    --scanners secret \
    --format json \
    --output $SCAN_RESULTS_DIR/secrets.json \
    .

# Generate human-readable reports
echo "📋 Generating human-readable reports..."

# Vulnerability report
trivy image \
    --format table \
    --output $SCAN_RESULTS_DIR/vulnerabilities.txt \
    $IMAGE_NAME

# Configuration report
trivy config \
    --format table \
    --output $SCAN_RESULTS_DIR/misconfigurations.txt \
    .

# Secret scanning report
trivy fs \
    --scanners secret \
    --format table \
    --output $SCAN_RESULTS_DIR/secrets.txt \
    .

# Check for critical vulnerabilities
echo "🚨 Checking for critical vulnerabilities..."
CRITICAL_VULNS=$(trivy image --severity CRITICAL --format json $IMAGE_NAME | jq '.Results[].Vulnerabilities | length' 2>/dev/null || echo "0")

if [ "$CRITICAL_VULNS" -gt 0 ]; then
    echo "❌ CRITICAL: Found $CRITICAL_VULNS critical vulnerabilities!"
    echo "Please review and fix before deploying to production."
    exit 1
fi

# Check for high severity vulnerabilities
HIGH_VULNS=$(trivy image --severity HIGH --format json $IMAGE_NAME | jq '.Results[].Vulnerabilities | length' 2>/dev/null || echo "0")

if [ "$HIGH_VULNS" -gt 0 ]; then
    echo "⚠️  WARNING: Found $HIGH_VULNS high severity vulnerabilities."
    echo "Consider fixing these before production deployment."
fi

# Docker best practices check
echo "🐳 Checking Docker best practices..."

# Check if running as root
ROOT_CHECK=$(docker run --rm $IMAGE_NAME whoami 2>/dev/null)
if [ "$ROOT_CHECK" = "root" ]; then
    echo "❌ SECURITY: Container is running as root user!"
else
    echo "✅ Container is running as non-root user: $ROOT_CHECK"
fi

# Check exposed ports
EXPOSED_PORTS=$(docker inspect $IMAGE_NAME | jq -r '.[0].Config.ExposedPorts | keys[]' 2>/dev/null || echo "")
if [[ $EXPOSED_PORTS == *"22/tcp"* ]]; then
    echo "❌ SECURITY: SSH port 22 is exposed!"
fi

# Check for unnecessary packages
echo "📦 Checking for unnecessary packages..."
PACKAGE_COUNT=$(docker run --rm $IMAGE_NAME apk list --installed 2>/dev/null | wc -l || echo "unknown")
echo "📊 Total installed packages: $PACKAGE_COUNT"

# Generate security summary
echo "📊 Generating security summary..."
cat > $SCAN_RESULTS_DIR/security-summary.md << EOF
# Security Scan Summary

**Scan Date**: $(date)
**Image**: $IMAGE_NAME

## Vulnerability Summary
- Critical Vulnerabilities: $CRITICAL_VULNS
- High Severity Vulnerabilities: $HIGH_VULNS
- Total Installed Packages: $PACKAGE_COUNT

## User Security
- Running as user: $ROOT_CHECK

## Files Generated
- \`vulnerabilities.json\` - Detailed vulnerability data
- \`vulnerabilities.txt\` - Human-readable vulnerability report
- \`misconfigurations.json\` - Configuration issues data
- \`misconfigurations.txt\` - Human-readable configuration report
- \`secrets.json\` - Secret scanning results
- \`secrets.txt\` - Human-readable secret report

## Recommendations
1. Review all critical and high severity vulnerabilities
2. Update base image and dependencies regularly
3. Remove unnecessary packages and files
4. Ensure no secrets are hardcoded in the image
5. Regular security scanning in CI/CD pipeline

## Next Steps
- Fix any critical vulnerabilities before deployment
- Consider using distroless or minimal base images
- Implement runtime security monitoring
- Set up automated vulnerability scanning
EOF

echo "✅ Security scan completed!"
echo "📁 Results saved to: $SCAN_RESULTS_DIR/"
echo "📖 Review security-summary.md for overview"

# Return appropriate exit code
if [ "$CRITICAL_VULNS" -gt 0 ]; then
    exit 1
else
    exit 0
fi