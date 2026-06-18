// ============================================================
// Configuration & State
// ============================================================
const CONFIG = {
    rpcUrl: 'http://129.151.164.202:8545',
    chainId: 12345,
    chainName: 'TKM Chain',
    symbol: 'ANTD',
    decimals: 18
};

const state = {
    web3: null,
    account: null,
    balance: '0',
    isMining: false,
    hashRate: 0,
    sharesFound: 0,
    blocksMined: 0,
    miningInterval: null,
    statusInterval: null,
    transactions: [],
    blockNumber: 0,
    difficulty: 0,
    mainKing: '',
    rotatingKing: '',
    miner: '',
    rewardData: {
        mainKing: 0,
        rotatingKing: 0,
        miner: 0
    }
};

// ============================================================
// DOM References
// ============================================================
const DOM = {
    connectionDot: document.getElementById('connectionDot'),
    connectionStatus: document.getElementById('connectionStatus'),
    blockNumber: document.getElementById('blockNumber'),
    difficulty: document.getElementById('difficulty'),
    walletBalance: document.getElementById('walletBalance'),
    mainBalance: document.getElementById('mainBalance'),
    walletAddress: document.getElementById('walletAddress'),
    receiveAddress: document.getElementById('receiveAddress'),
    hashRate: document.getElementById('hashRate'),
    sharesFound: document.getElementById('sharesFound'),
    blocksMined: document.getElementById('blocksMined'),
    latestBlock: document.getElementById('latestBlock'),
    blockTime: document.getElementById('blockTime'),
    blockDiff: document.getElementById('blockDiff'),
    mainKingAddress: document.getElementById('mainKingAddress'),
    rotatingKingAddress: document.getElementById('rotatingKingAddress'),
    rotatingKingBlock: document.getElementById('rotatingKingBlock'),
    minerAddress: document.getElementById('minerAddress'),
    mainKingReward: document.getElementById('mainKingReward'),
    rotatingKingReward: document.getElementById('rotatingKingReward'),
    minerReward: document.getElementById('minerReward'),
    miningDot: document.getElementById('miningDot'),
    miningStatusText: document.getElementById('miningStatusText'),
    startMiningBtn: document.getElementById('startMiningBtn'),
    stopMiningBtn: document.getElementById('stopMiningBtn'),
    miningThreads: document.getElementById('miningThreads'),
    recipientAddress: document.getElementById('recipientAddress'),
    sendAmount: document.getElementById('sendAmount'),
    toast: document.getElementById('toast'),
    rpcUrl: document.getElementById('rpcUrl'),
    chainId: document.getElementById('chainId'),
    theme: document.getElementById('theme')
};

// ============================================================
// Web3 Initialization
// ============================================================
function initWeb3() {
    try {
        const url = DOM.rpcUrl.value || CONFIG.rpcUrl;
        state.web3 = new Web3(url);
        updateConnectionStatus(true);
        showToast('Connected to TKM Chain', 'success');
        return true;
    } catch (error) {
        console.error('Web3 init error:', error);
        updateConnectionStatus(false);
        showToast('Failed to connect', 'error');
        return false;
    }
}

// ============================================================
// Connection Status
// ============================================================
function updateConnectionStatus(connected) {
    if (connected) {
        DOM.connectionDot.className = 'status-dot online';
        DOM.connectionStatus.textContent = 'Connected';
    } else {
        DOM.connectionDot.className = 'status-dot offline';
        DOM.connectionStatus.textContent = 'Disconnected';
    }
}

// ============================================================
// Account Management
// ============================================================
function createAccount() {
    try {
        const account = state.web3.eth.accounts.create();
        state.account = account;
        DOM.walletAddress.textContent = account.address;
        DOM.receiveAddress.textContent = account.address;
        localStorage.setItem('tkm_wallet', JSON.stringify(account));
        showToast('Wallet created!', 'success');
        updateBalance();
        return account;
    } catch (error) {
        console.error('Create account error:', error);
        showToast('Failed to create wallet', 'error');
        return null;
    }
}

function loadWallet() {
    const saved = localStorage.getItem('tkm_wallet');
    if (saved) {
        try {
            const account = JSON.parse(saved);
            state.account = account;
            DOM.walletAddress.textContent = account.address;
            DOM.receiveAddress.textContent = account.address;
            showToast('Wallet loaded', 'info');
            updateBalance();
            return account;
        } catch (e) {
            console.error('Load wallet error:', e);
        }
    }
    return null;
}

// ============================================================
// Balance
// ============================================================
async function updateBalance() {
    if (!state.web3 || !state.account) return;

    try {
        const balance = await state.web3.eth.getBalance(state.account.address);
        state.balance = balance;
        const formatted = state.web3.utils.fromWei(balance, 'ether');
        DOM.mainBalance.textContent = parseFloat(formatted).toFixed(4);
        DOM.walletBalance.textContent = parseFloat(formatted).toFixed(4) + ' ANTD';
    } catch (error) {
        console.error('Balance update error:', error);
    }
}

// ============================================================
// Send Transaction
// ============================================================
async function sendTransaction() {
    const to = DOM.recipientAddress.value.trim();
    const amount = DOM.sendAmount.value.trim();

    if (!to || !state.web3.utils.isAddress(to)) {
        showToast('Invalid address', 'error');
        return;
    }

    if (!amount || parseFloat(amount) <= 0) {
        showToast('Invalid amount', 'error');
        return;
    }

    try {
        const amountWei = state.web3.utils.toWei(amount, 'ether');
        const balanceWei = state.web3.utils.toBN(state.balance);

        if (balanceWei.lt(state.web3.utils.toBN(amountWei))) {
            showToast('Insufficient balance', 'error');
            return;
        }

        const gasPrice = await state.web3.eth.getGasPrice();
        const tx = {
            from: state.account.address,
            to: to,
            value: amountWei,
            gas: 21000,
            gasPrice: gasPrice,
            chainId: CONFIG.chainId
        };

        const signedTx = await state.web3.eth.accounts.signTransaction(tx, state.account.privateKey);
        const receipt = await state.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        showToast('Transaction sent!', 'success');

        // Add to history
        state.transactions.unshift({
            hash: receipt.transactionHash,
            to: to,
            amount: amount,
            type: 'sent',
            timestamp: new Date().toISOString()
        });

        setTimeout(updateBalance, 3000);

        DOM.recipientAddress.value = '';
        DOM.sendAmount.value = '';
        hideSendForm();

    } catch (error) {
        console.error('Send transaction error:', error);
        showToast('Transaction failed: ' + error.message, 'error');
    }
}

// ============================================================
// Mining
// ============================================================
let minerWorker = null;
let miningInterval = null;
let hashrateInterval = null;

function startMining() {
    if (state.isMining) {
        showToast('Already mining', 'warning');
        return;
    }

    if (!state.account) {
        showToast('Create a wallet first', 'warning');
        return;
    }

    const threads = parseInt(DOM.miningThreads.value) || 2;
    state.isMining = true;
    state.sharesFound = 0;

    DOM.miningDot.className = 'mining-dot mining';
    DOM.miningStatusText.textContent = 'Mining...';
    DOM.startMiningBtn.style.display = 'none';
    DOM.stopMiningBtn.style.display = 'block';

    showToast(`Mining started (${threads} threads)`, 'success');

    // Simulate mining in the renderer process
    miningInterval = setInterval(async () => {
        if (!state.isMining) return;

        try {
            // Simulate hashing
            const hash = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
            state.hashRate = Math.round(Math.random() * 100 + 50);

            // Update UI
            DOM.hashRate.textContent = state.hashRate;

            // Randomly find shares
            if (Math.random() < 0.01) {
                state.sharesFound++;
                DOM.sharesFound.textContent = state.sharesFound;
                showToast('�� Share found!', 'success');
            }

            // Randomly mine blocks
            if (Math.random() < 0.001) {
                state.blocksMined++;
                DOM.blocksMined.textContent = state.blocksMined;
                showToast('⛏️ Block mined!', 'success');
            }

        } catch (error) {
            console.error('Mining error:', error);
        }
    }, 100);

    // Update hashrate
    hashrateInterval = setInterval(() => {
        if (!state.isMining) {
            clearInterval(hashrateInterval);
        }
    }, 1000);

    localStorage.setItem('tkm_mining', 'true');
}

function stopMining() {
    state.isMining = false;

    if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
    }

    if (hashrateInterval) {
        clearInterval(hashrateInterval);
        hashrateInterval = null;
    }

    DOM.miningDot.className = 'mining-dot idle';
    DOM.miningStatusText.textContent = 'Idle';
    DOM.startMiningBtn.style.display = 'block';
    DOM.stopMiningBtn.style.display = 'none';
    DOM.hashRate.textContent = '0';

    localStorage.setItem('tkm_mining', 'false');
    showToast('Mining stopped', 'info');
}

// ============================================================
// Kings Info
// ============================================================
async function updateKingsInfo() {
    try {
        const blockNumber = await state.web3.eth.getBlockNumber();
        DOM.blockNumber.textContent = blockNumber;

        const block = await state.web3.eth.getBlock(blockNumber);
        if (block) {
            DOM.latestBlock.textContent = `#${blockNumber}`;
            DOM.blockTime.textContent = new Date(block.timestamp * 1000).toLocaleTimeString();
            DOM.blockDiff.textContent = block.difficulty || '--';
            state.difficulty = block.difficulty || 0;
            DOM.difficulty.textContent = state.difficulty;
        }

        // Simulate king addresses
        DOM.mainKingAddress.textContent = '0x' + Math.random().toString(36).substring(2, 15);
        DOM.rotatingKingAddress.textContent = '0x' + Math.random().toString(36).substring(2, 15);
        DOM.rotatingKingBlock.textContent = `Block: ${blockNumber % 100 || 100}`;
        DOM.minerAddress.textContent = state.account ? 
            state.account.address.slice(0, 10) + '...' + state.account.address.slice(-6) : 
            '0x... (not set)';

        // Reward distribution
        const reward = 200;
        DOM.mainKingReward.textContent = (reward * 0.1).toFixed(2);
        DOM.rotatingKingReward.textContent = (reward * 0.4).toFixed(2);
        DOM.minerReward.textContent = (reward * 0.5).toFixed(2);

    } catch (error) {
        console.error('Update kings info error:', error);
    }
}

// ============================================================
// UI Utilities
// ============================================================
function showToast(message, type = 'info') {
    const toast = DOM.toast;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

function copyAddress() {
    if (!state.account) {
        showToast('No wallet loaded', 'warning');
        return;
    }

    navigator.clipboard.writeText(state.account.address)
        .then(() => showToast('Address copied!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
}

function hideSendForm() {
    document.getElementById('sendForm').style.display = 'none';
}

function receive() {
    document.getElementById('receiveModal').style.display = 'block';
}

function hideReceive() {
    document.getElementById('receiveModal').style.display = 'none';
}

function viewHistory() {
    showToast('Transaction history loaded', 'info');
}

function saveSettings() {
    const url = DOM.rpcUrl.value;
    const chainId = parseInt(DOM.chainId.value);
    
    CONFIG.rpcUrl = url;
    CONFIG.chainId = chainId;
    
    initWeb3();
    showToast('Settings saved!', 'success');
}

function resetWallet() {
    if (confirm('Are you sure you want to reset your wallet?')) {
        localStorage.removeItem('tkm_wallet');
        state.account = null;
        DOM.walletAddress.textContent = '0x...';
        DOM.receiveAddress.textContent = '0x...';
        DOM.mainBalance.textContent = '0.00';
        DOM.walletBalance.textContent = '0 ANTD';
        showToast('Wallet reset', 'info');
        setTimeout(createAccount, 1000);
    }
}

function exportWallet() {
    if (!state.account) {
        showToast('No wallet to export', 'warning');
        return;
    }

    const data = JSON.stringify({
        address: state.account.address,
        privateKey: state.account.privateKey
    }, null, 2);

    // Create download
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tkm-wallet-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Wallet exported!', 'success');
}

// ============================================================
// Theme
// ============================================================
function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('theme-light');
    } else {
        document.body.classList.remove('theme-light');
    }
}

DOM.theme.addEventListener('change', function() {
    setTheme(this.value);
    localStorage.setItem('tkm_theme', this.value);
});

// ============================================================
// Navigation
// ============================================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        this.classList.add('active');
        const tab = this.dataset.tab;
        document.getElementById(`tab-${tab}`).classList.add('active');
    });
});

// Window controls (Electron)
if (window.electronAPI) {
    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
        window.electronAPI.minimize();
    });
    document.getElementById('maximizeBtn')?.addEventListener('click', () => {
        window.electronAPI.maximize();
    });
    document.getElementById('closeBtn')?.addEventListener('click', () => {
        window.electronAPI.close();
    });

    // IPC listeners
    window.electronAPI.on('start-mining', startMining);
    window.electronAPI.on('stop-mining', stopMining);
    window.electronAPI.on('new-wallet', createAccount);
    window.electronAPI.on('refresh-chain', updateKingsInfo);
    window.electronAPI.on('about', () => {
        showToast('TKM Chain Wallet v1.0.0', 'info');
    });
}

// ============================================================
// Initialize
// ============================================================
async function init() {
    // Load settings
    const savedRpc = localStorage.getItem('tkm_rpc');
    if (savedRpc) DOM.rpcUrl.value = savedRpc;

    const savedTheme = localStorage.getItem('tkm_theme');
    if (savedTheme) {
        DOM.theme.value = savedTheme;
        setTheme(savedTheme);
    }

    // Initialize Web3
    if (!initWeb3()) {
        setTimeout(init, 3000);
        return;
    }

    // Load or create wallet
    const savedWallet = loadWallet();
    if (!savedWallet) {
        createAccount();
    }

    // Update UI
    await updateBalance();
    await updateKingsInfo();

    // Start monitoring
    setInterval(async () => {
        try {
            await updateKingsInfo();
            await updateBalance();
        } catch (error) {
            console.error('Monitor error:', error);
        }
    }, 10000);

    // Auto-mine if was mining
    if (localStorage.getItem('tkm_mining') === 'true') {
        startMining();
    }

    showToast('Wallet ready!', 'success');
}

// Start
document.addEventListener('DOMContentLoaded', init);
