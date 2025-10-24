// Configuration
const CONFIG = {
    CHAIN_ID: 8453, // Base Mainnet
    CHAIN_NAME: 'Base',
    RPC_URL: 'https://mainnet.base.org',
    BLOCK_EXPLORER: 'https://basescan.org',
    USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    // CONTRACT_ADDRESS will be set after deployment
    CONTRACT_ADDRESS: 'TBD_AFTER_DEPLOYMENT'
};

// ABI (simplified - only needed functions)
const TOKEN_ABI = [
    'function getPool(uint256 poolId) view returns (uint256 pricePerToken, uint256 tokensRemaining, uint256 tokensSold, uint8 status, uint256 percentSold)',
    'function buyTokens(uint256 poolId, uint256 tokenAmount)',
    'function totalToasted() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'event TokensPurchased(address indexed buyer, uint256 poolId, uint256 tokens, uint256 usdcPaid)'
];

const USDC_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)'
];

// Global state
let provider = null;
let signer = null;
let userAddress = null;
let contract = null;
let usdcContract = null;
let selectedPoolId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask no está instalado. Por favor instalá MetaMask para continuar.');
        return;
    }

    // Set up event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);

    // Listen for account changes
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', () => window.location.reload());

    // Load pools (read-only mode before wallet connection)
    loadPoolsReadOnly();
}

// Connect wallet
async function connectWallet() {
    try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = accounts[0];

        // Check if on correct network
        const network = await provider.getNetwork();
        if (network.chainId !== CONFIG.CHAIN_ID) {
            await switchToBase();
        }

        // Initialize contracts
        contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, TOKEN_ABI, signer);
        usdcContract = new ethers.Contract(CONFIG.USDC_ADDRESS, USDC_ABI, signer);

        // Update UI
        updateWalletUI();
        loadPools();

    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Error al conectar wallet: ' + error.message);
    }
}

// Switch to Base network
async function switchToBase() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ethers.utils.hexValue(CONFIG.CHAIN_ID) }],
        });
    } catch (switchError) {
        // Chain not added, add it
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ethers.utils.hexValue(CONFIG.CHAIN_ID),
                        chainName: CONFIG.CHAIN_NAME,
                        nativeCurrency: {
                            name: 'Ethereum',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: [CONFIG.RPC_URL],
                        blockExplorerUrls: [CONFIG.BLOCK_EXPLORER]
                    }]
                });
            } catch (addError) {
                console.error('Error adding Base network:', addError);
                alert('Error al agregar Base network. Por favor agregalo manualmente en MetaMask.');
            }
        }
    }
}

// Update UI after wallet connection
function updateWalletUI() {
    const connectBtn = document.getElementById('connectWallet');
    const walletStatus = document.getElementById('walletStatus');

    const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    connectBtn.textContent = shortAddress;
    connectBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

    walletStatus.innerHTML = `
        <p>✅ Wallet conectada: <strong>${shortAddress}</strong></p>
        <p>Seleccioná un pool para comprar tokens</p>
    `;
}

// Handle account changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected wallet
        userAddress = null;
        location.reload();
    } else {
        // User switched account
        userAddress = accounts[0];
        updateWalletUI();
    }
}

// Load pools (read-only before wallet connection)
async function loadPoolsReadOnly() {
    const poolsGrid = document.getElementById('poolsGrid');
    poolsGrid.innerHTML = '<div class="pool-card loading"><p>Conectá tu wallet para ver los pools disponibles</p></div>';
}

// Load pools from contract
async function loadPools() {
    try {
        const poolsGrid = document.getElementById('poolsGrid');
        poolsGrid.innerHTML = '';

        // Load first 20 pools (can be paginated later)
        for (let i = 0; i < 20; i++) {
            const poolData = await contract.getPool(i);
            const poolCard = createPoolCard(i, poolData);
            poolsGrid.appendChild(poolCard);
        }

        // Update stats
        updateStats();

    } catch (error) {
        console.error('Error loading pools:', error);
        document.getElementById('poolsGrid').innerHTML =
            '<div class="pool-card"><p>Error cargando pools. Verificá que el contrato esté deployado.</p></div>';
    }
}

// Create pool card element
function createPoolCard(poolId, poolData) {
    const [pricePerToken, tokensRemaining, tokensSold, status, percentSold] = poolData;

    const statusText = ['INACTIVE', 'ACTIVE', 'RELEASED'][status];
    const statusClass = statusText.toLowerCase();

    const priceInUSD = ethers.utils.formatUnits(pricePerToken, 6);
    const tokensRemainingFormatted = ethers.utils.formatUnits(tokensRemaining, 18);

    const card = document.createElement('div');
    card.className = `pool-card ${statusClass}`;
    card.innerHTML = `
        <div class="pool-header">
            <div class="pool-number">Pool #${poolId + 1}</div>
            <div class="pool-status ${statusClass}">${statusText}</div>
        </div>
        <div class="pool-info">
            <div class="pool-price">$${priceInUSD} / token</div>
            <div class="pool-remaining">${parseFloat(tokensRemainingFormatted).toLocaleString()} tokens restantes</div>
        </div>
        <div class="pool-progress">
            <div class="pool-progress-bar" style="width: ${percentSold}%"></div>
        </div>
    `;

    if (status > 0) { // ACTIVE or RELEASED
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => selectPool(poolId, pricePerToken));
    }

    return card;
}

// Select pool for purchase
function selectPool(poolId, pricePerToken) {
    selectedPoolId = poolId;
    const priceInUSD = ethers.utils.formatUnits(pricePerToken, 6);

    const buyInterface = document.getElementById('buyInterface');
    buyInterface.style.display = 'block';
    buyInterface.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('selectedPool').value = `Pool #${poolId + 1}`;
    document.getElementById('poolPrice').value = `$${priceInUSD}`;

    // Set up purchase listeners
    document.getElementById('tokenAmount').addEventListener('input', updateTotalCost);
    document.getElementById('approveUSDC').addEventListener('click', approveUSDC);
    document.getElementById('buyTokens').addEventListener('click', buyTokens);

    updateTotalCost();
}

// Update total cost calculation
async function updateTotalCost() {
    const tokenAmount = document.getElementById('tokenAmount').value;
    if (!tokenAmount || tokenAmount <= 0) {
        document.getElementById('totalCost').value = '$0';
        return;
    }

    const poolData = await contract.getPool(selectedPoolId);
    const pricePerToken = poolData[0];

    const tokenAmountWei = ethers.utils.parseUnits(tokenAmount, 18);
    const totalCostWei = tokenAmountWei.mul(pricePerToken).div(ethers.utils.parseUnits('1', 18));
    const totalCostUSD = ethers.utils.formatUnits(totalCostWei, 6);

    document.getElementById('totalCost').value = `$${parseFloat(totalCostUSD).toFixed(2)}`;
}

// Approve USDC spending
async function approveUSDC() {
    try {
        const tokenAmount = document.getElementById('tokenAmount').value;
        if (!tokenAmount || tokenAmount <= 0) {
            alert('Ingresá la cantidad de tokens a comprar');
            return;
        }

        const poolData = await contract.getPool(selectedPoolId);
        const pricePerToken = poolData[0];

        const tokenAmountWei = ethers.utils.parseUnits(tokenAmount, 18);
        const totalCostWei = tokenAmountWei.mul(pricePerToken).div(ethers.utils.parseUnits('1', 18));

        // Check USDC balance
        const usdcBalance = await usdcContract.balanceOf(userAddress);
        if (usdcBalance.lt(totalCostWei)) {
            alert('No tenés suficiente USDC. Comprá USDC en https://app.uniswap.org');
            return;
        }

        // Approve USDC
        const approveTx = await usdcContract.approve(CONFIG.CONTRACT_ADDRESS, totalCostWei);

        const approveBtn = document.getElementById('approveUSDC');
        approveBtn.textContent = 'Aprobando...';
        approveBtn.disabled = true;

        await approveTx.wait();

        approveBtn.textContent = '✅ USDC Aprobado';
        approveBtn.style.background = '#10b981';

        document.getElementById('buyTokens').disabled = false;

    } catch (error) {
        console.error('Error approving USDC:', error);
        alert('Error al aprobar USDC: ' + error.message);
        document.getElementById('approveUSDC').disabled = false;
        document.getElementById('approveUSDC').textContent = '1. Aprobar USDC';
    }
}

// Buy tokens
async function buyTokens() {
    try {
        const tokenAmount = document.getElementById('tokenAmount').value;
        if (!tokenAmount || tokenAmount <= 0) {
            alert('Ingresá la cantidad de tokens a comprar');
            return;
        }

        const tokenAmountWei = ethers.utils.parseUnits(tokenAmount, 18);

        const buyTx = await contract.buyTokens(selectedPoolId, tokenAmountWei);

        const buyBtn = document.getElementById('buyTokens');
        buyBtn.textContent = 'Comprando...';
        buyBtn.disabled = true;

        await buyTx.wait();

        buyBtn.textContent = '✅ Compra Exitosa!';
        buyBtn.style.background = '#10b981';

        alert('🎉 ¡Compra exitosa! Tokens recibidos en tu wallet.');

        // Reload pools and stats
        loadPools();

        // Reset form after 3 seconds
        setTimeout(() => {
            document.getElementById('buyInterface').style.display = 'none';
            resetBuyForm();
        }, 3000);

    } catch (error) {
        console.error('Error buying tokens:', error);
        alert('Error al comprar tokens: ' + error.message);
        document.getElementById('buyTokens').disabled = false;
        document.getElementById('buyTokens').textContent = '2. Comprar Tokens';
    }
}

// Reset buy form
function resetBuyForm() {
    document.getElementById('tokenAmount').value = '';
    document.getElementById('totalCost').value = '$0';
    document.getElementById('approveUSDC').disabled = false;
    document.getElementById('approveUSDC').textContent = '1. Aprobar USDC';
    document.getElementById('approveUSDC').style.background = '';
    document.getElementById('buyTokens').disabled = true;
    document.getElementById('buyTokens').textContent = '2. Comprar Tokens';
    document.getElementById('buyTokens').style.background = '';
}

// Update stats
async function updateStats() {
    try {
        // Total toasted
        const totalToasted = await contract.totalToasted();
        document.getElementById('tokensToasted').textContent =
            parseFloat(ethers.utils.formatUnits(totalToasted, 18)).toLocaleString();

        // Calculate total sold from all pools
        let totalSold = ethers.BigNumber.from(0);
        for (let i = 0; i < 100; i++) {
            const poolData = await contract.getPool(i);
            totalSold = totalSold.add(poolData[2]); // tokensSold
        }

        document.getElementById('tokensSold').textContent =
            parseFloat(ethers.utils.formatUnits(totalSold, 18)).toLocaleString();

        // Find current pool price
        for (let i = 0; i < 100; i++) {
            const poolData = await contract.getPool(i);
            if (poolData[3] > 0) { // ACTIVE or RELEASED
                const priceInUSD = ethers.utils.formatUnits(poolData[0], 6);
                document.getElementById('currentPrice').textContent = `$${priceInUSD}`;
                break;
            }
        }

    } catch (error) {
        console.error('Error updating stats:', error);
    }
}
