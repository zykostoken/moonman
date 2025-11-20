#!/bin/bash

# 🔒 ZYKOS Token - Security Audit Script
# Este script corre todos los tests y análisis de seguridad automáticamente

set -e  # Exit on error

echo "🚀 Starting ZYKOS Token Security Audit..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

# Check if we're in the right directory
if [ ! -f "hardhat.config.js" ]; then
    echo "${RED}Error: hardhat.config.js not found. Are you in the project root?${NC}"
    exit 1
fi

# 1. Install dependencies if needed
print_section "📦 Step 1: Installing Dependencies"
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "${GREEN}✓ Dependencies already installed${NC}"
fi

# 2. Compile contracts
print_section "🔨 Step 2: Compiling Contracts"
npx hardhat compile
if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Compilation successful${NC}"
else
    echo "${RED}✗ Compilation failed${NC}"
    exit 1
fi

# 3. Run tests
print_section "🧪 Step 3: Running Tests"
npx hardhat test
if [ $? -eq 0 ]; then
    echo "${GREEN}✓ All tests passed${NC}"
else
    echo "${RED}✗ Some tests failed${NC}"
    exit 1
fi

# 4. Run coverage
print_section "📊 Step 4: Checking Test Coverage"
if ! npx hardhat coverage > /dev/null 2>&1; then
    echo "${YELLOW}⚠ Coverage tool not installed. Installing...${NC}"
    npm install --save-dev solidity-coverage
fi
npx hardhat coverage

# Parse coverage percentage (rough estimate)
COVERAGE=$(npx hardhat coverage 2>/dev/null | grep "% Statements" | awk '{print $3}' | cut -d'%' -f1)
if [ ! -z "$COVERAGE" ]; then
    if (( $(echo "$COVERAGE > 90" | bc -l) )); then
        echo "${GREEN}✓ Coverage: ${COVERAGE}% (Excellent!)${NC}"
    elif (( $(echo "$COVERAGE > 70" | bc -l) )); then
        echo "${YELLOW}⚠ Coverage: ${COVERAGE}% (Good, but aim for 90%+)${NC}"
    else
        echo "${RED}✗ Coverage: ${COVERAGE}% (Too low, add more tests)${NC}"
    fi
fi

# 5. Run Slither (if installed)
print_section "🔍 Step 5: Running Slither Analysis"
if command -v slither &> /dev/null; then
    echo "Running Slither..."
    slither . --filter-paths "node_modules|test" > slither-report.txt 2>&1 || true

    # Check for high/medium issues
    HIGH=$(grep -c "Impact: High" slither-report.txt || true)
    MEDIUM=$(grep -c "Impact: Medium" slither-report.txt || true)

    echo ""
    echo "Slither Results:"
    echo "  High severity issues: $HIGH"
    echo "  Medium severity issues: $MEDIUM"

    if [ $HIGH -gt 0 ]; then
        echo "${RED}✗ Found $HIGH high severity issues. Review slither-report.txt${NC}"
    elif [ $MEDIUM -gt 5 ]; then
        echo "${YELLOW}⚠ Found $MEDIUM medium severity issues. Review slither-report.txt${NC}"
    else
        echo "${GREEN}✓ Slither analysis passed${NC}"
    fi

    echo "Full report saved to: slither-report.txt"
else
    echo "${YELLOW}⚠ Slither not installed. Install with: pip3 install slither-analyzer${NC}"
fi

# 6. Run Aderyn (if installed)
print_section "🛡️ Step 6: Running Aderyn Analysis"
if command -v aderyn &> /dev/null; then
    echo "Running Aderyn..."
    aderyn contracts/ > aderyn-report.txt 2>&1 || true
    echo "${GREEN}✓ Aderyn analysis complete${NC}"
    echo "Full report saved to: aderyn-report.txt"
else
    echo "${YELLOW}⚠ Aderyn not installed. Install with: npm install -g aderyn${NC}"
fi

# 7. Check gas usage
print_section "⛽ Step 7: Checking Gas Usage"
echo "Running gas reporter..."
if ! npx hardhat test --grep "gas" > /dev/null 2>&1; then
    echo "${YELLOW}⚠ Gas reporter not configured${NC}"
else
    echo "${GREEN}✓ Gas usage analysis complete${NC}"
fi

# 8. Final checklist
print_section "✅ Final Security Checklist"

echo "Manual Review Required:"
echo ""
echo "  [ ] Supply is fixed (100M, no additional minting)"
echo "  [ ] Owner cannot freeze/steal user funds"
echo "  [ ] ReentrancyGuard on buyTokens()"
echo "  [ ] No selfdestruct or delegatecall"
echo "  [ ] No proxy/upgradeable patterns"
echo "  [ ] USDC address correct for Base network"
echo "  [ ] Treasury address correct"
echo "  [ ] Prices hardcoded correctly (pool 1-2: 0.05, etc.)"
echo "  [ ] Activation thresholds correct (91%, 98%)"
echo ""

# 9. Summary
print_section "📋 Audit Summary"

echo "Tests: ${GREEN}PASSED${NC} (Run 'npx hardhat test' to see details)"
echo "Compilation: ${GREEN}PASSED${NC}"

if [ ! -z "$COVERAGE" ]; then
    if (( $(echo "$COVERAGE > 90" | bc -l) )); then
        echo "Coverage: ${GREEN}${COVERAGE}%${NC}"
    else
        echo "Coverage: ${YELLOW}${COVERAGE}%${NC}"
    fi
fi

echo ""
echo "Next Steps:"
echo "  1. Review slither-report.txt for any security issues"
echo "  2. Review aderyn-report.txt for vulnerabilities"
echo "  3. Deploy to Base Goerli testnet for testing"
echo "  4. Run for 1-2 weeks on testnet"
echo "  5. Get community review (Reddit/Twitter with bounty)"
echo "  6. Deploy to mainnet"
echo ""
echo "See TESTING_GUIDE.md for detailed instructions."
echo ""

print_section "✨ Audit Complete!"

exit 0
