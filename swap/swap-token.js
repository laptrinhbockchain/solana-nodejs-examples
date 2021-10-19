// Reference: https://github.com/raydium-io/raydium-ui/blob/master/src/utils/swap.ts (Function: swap())
const parseArgs = require('minimist');
const web3 = require('@solana/web3.js');
const SplToken = require('@solana/spl-token');
const TokenAmount = require('./utils/TokenAmount');
const SwapUtils = require('./utils/SwapUtils');
const { nu64, struct, u8 } = require('buffer-layout');
// const { Account, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction } = require('@solana/web3.js');
const { TOKENS } = require('./utils/tokens');

// 
const LIQUIDITY_POOL_PROGRAM_ID_V4 = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
// const ASSOCIATED_TOKEN_PROGRAM_ID = new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
// const RENT_PROGRAM_ID = new web3.PublicKey('SysvarRent111111111111111111111111111111111');
// const SYSTEM_PROGRAM_ID = new web3.PublicKey('11111111111111111111111111111111');
// const TOKEN_PROGRAM_ID = new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
// ;

const SERUM_PROGRAM_ID_V3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';

const commitment = "confirmed";
const nodeType = "mainnet-beta";
const rayusdcPoolInfo = {
    name: 'RAY-USDC',
    coin: TOKENS.RAY,
    pc: TOKENS.USDC,
    version: 4,
    programId: LIQUIDITY_POOL_PROGRAM_ID_V4,

    // AMM
    ammId: '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg',
    ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    ammOpenOrders: 'J8u8nTHYtvudyqwLrXZboziN95LpaHFHpd97Jm5vtbkW',
    ammTargetOrders: '3cji8XW5uhtsA757vELVFAeJpskyHwbnTSceMFY5GjVT',
    poolCoinTokenAccount: 'FdmKUE4UMiJYFK5ogCngHzShuVKrFXBamPWcewDr31th',
    poolPcTokenAccount: 'Eqrhxd7bDUCH3MepKmdVkgwazXRzY6iHhEoBpY7yAohk',

    // SERUM
    serumProgramId: SERUM_PROGRAM_ID_V3,
    serumMarket: '2xiv8A5xrJ7RnGdxXB42uFEkYHJjszEhaJyKKt4WaLep',
    serumBids: 'Hf84mYadE1VqSvVWAvCWc9wqLXak4RwXiPb4A91EAUn5',
    serumAsks: 'DC1HsWWRCXVg3wk2NndS5LTbce3axwUwUZH1RgnV4oDN',
    serumEventQueue: 'H9dZt8kvz1Fe5FyRisb77KcYTaN8LEbuVAfJSnAaEABz',
    serumCoinVaultAccount: 'GGcdamvNDYFhAXr93DWyJ8QmwawUHLCyRqWL3KngtLRa',
    serumPcVaultAccount: '22jHt5WmosAykp3LPGSAKgY45p7VGh4DFWSwp21SWBVe',
    serumVaultSigner: 'FmhXe9uG6zun49p222xt3nG1rBAkWvzVz7dxERQ6ouGw',
};
const solusdcPoolInfo = {
    name: 'SOL-USDC',
    coin: TOKENS.SOL,
    pc: TOKENS.USDC,
    version: 4,
    programId: LIQUIDITY_POOL_PROGRAM_ID_V4,

    // AMM
    ammId: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
    ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    ammOpenOrders: 'HRk9CMrpq7Jn9sh7mzxE8CChHG8dneX9p475QKz4Fsfc',
    ammTargetOrders: 'CZza3Ej4Mc58MnxWA385itCC9jCo3L1D7zc3LKy1bZMR',
    poolCoinTokenAccount: 'DQyrAcCrDXQ7NeoqGgDCZwBvWDcYmFCjSb9JtteuvPpz',
    poolPcTokenAccount: 'HLmqeL62xR1QoZ1HKKbXRrdN1p3phKpxRMb2VVopvBBz',

    // SERUM
    serumProgramId: SERUM_PROGRAM_ID_V3,
    serumMarket: '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT',
    serumBids: '14ivtgssEBoBjuZJtSAPKYgpUK7DmnSwuPMqJoVTSgKJ',
    serumAsks: 'CEQdAFKdycHugujQg9k2wbmxjcpdYZyVLfV9WerTnafJ',
    serumEventQueue: '5KKsLVU6TcbVDK4BS6K1DGDxnh4Q9xjYJ8XaDCG5t8ht',
    serumCoinVaultAccount: '36c6YqAwyGKQG66XEp2dJc5JqjaBNv7sVghEtJv4c7u6',
    serumPcVaultAccount: '8CFo8bL8mZQK8abbFyypFMwEDd8tVJjHTTojMLgQTUSZ',
    serumVaultSigner: 'F8Vyqk3unwxkXukZFQeYyGmFfTG3CAX4v24iyrjEYBJV',
};

// Global variables
let connection = null;
let tokenAccountInfos = {};

// Get solana Web3 connection
function getConnection() {
    if (!connection) {
        connection = new web3.Connection(
            web3.clusterApiUrl(nodeType),
            commitment,
        );
    }
    return connection;
}

function getBigNumber(num) {
    return num === undefined || num === null ? 0 : parseFloat(num.toString())
}

async function addToken(accountPk, tokenName) {
    // Init owner account
    let ownerAccount = web3.Keypair.fromSeed(new Uint8Array(Buffer.from(accountPk, "hex")));

    // Init Token object
    let tokenMint = new web3.PublicKey(TOKENS[tokenName].mintAddress);
    let token = new SplToken.Token(getConnection(), tokenMint, SplToken.TOKEN_PROGRAM_ID, ownerAccount);

    // Create associated token accounts for my token if they don't exist yet
    let tokenAccount = await token.getOrCreateAssociatedAccountInfo(ownerAccount.publicKey);
    console.log(`Token account for ${tokenName}: ${tokenAccount.address.toBase58()}`);
    return tokenAccount;
}

// Swap
async function swap(accountPk, fromToken, toToken, aIn, aOutMin) {
    // Checking
    let poolInfo = null;
    if ((fromToken=="RAY" && toToken=="USDC") || (fromToken=="USDC" && toToken=="RAY")) {
        poolInfo = rayusdcPoolInfo;
    } else if ((fromToken=="SOL" && toToken=="USDC") || (fromToken=="USDC" && toToken=="SOL")) {
        poolInfo = solusdcPoolInfo;
    }
    if (!poolInfo) {
        console.log("fromToken/toToken is not matched with the pool!");
        return false;
    }

    // Init
    let connection = getConnection();
    let signers = [];
    let ownerAccount = web3.Keypair.fromSeed(new Uint8Array(Buffer.from(accountPk, "hex")));
    let from = TOKENS[fromToken];
    let to = TOKENS[toToken];
    const amountIn = new TokenAmount(aIn, from.decimals, false);
    const amountOutMin = new TokenAmount(aOutMin, to.decimals, false);

    // Get associated token account
    let fromMint = from.mintAddress;
    let toMint = to.mintAddress;
    let fromWrappedSolAccount = null;
    let toWrappedSolAccount = null;
    let transaction = new web3.Transaction();
    if (fromToken=="SOL") {
        fromMint = TOKENS.WSOL.mintAddress;
        fromWrappedSolAccount = await SwapUtils.createTokenAccountIfNotExist(
            connection,
            fromWrappedSolAccount,
            ownerAccount.publicKey,
            TOKENS.WSOL.mintAddress,
            getBigNumber(amountIn.wei) + 1e7,
            transaction,
            signers
        );
    }
    if (toToken=="SOL") {
        toMint = TOKENS.WSOL.mintAddress;
        toWrappedSolAccount = await SwapUtils.createTokenAccountIfNotExist(
            connection,
            toWrappedSolAccount,
            ownerAccount.publicKey,
            TOKENS.WSOL.mintAddress,
            1e7,
            transaction,
            signers
        );
    }

    // let fromTokenAccount = await SwapUtils.createAssociatedTokenAccountIfNotExist(null, ownerAccount.publicKey, fromMint, transaction);
    let fromTokenAccount = await SwapUtils.getAssociatedTokenAccount(ownerAccount.publicKey, fromMint);
    // let toTokenAccount = await SwapUtils.createAssociatedTokenAccountIfNotExist(null, ownerAccount.publicKey, toMint, transaction);
    let toTokenAccount = await SwapUtils.getAssociatedTokenAccount(ownerAccount.publicKey, toMint);
    transaction.add(
        SwapUtils.swapInstruction(
            new web3.PublicKey(poolInfo.programId),
            new web3.PublicKey(poolInfo.ammId),
            new web3.PublicKey(poolInfo.ammAuthority),
            new web3.PublicKey(poolInfo.ammOpenOrders),
            new web3.PublicKey(poolInfo.ammTargetOrders),
            new web3.PublicKey(poolInfo.poolCoinTokenAccount),
            new web3.PublicKey(poolInfo.poolPcTokenAccount),
            new web3.PublicKey(poolInfo.serumProgramId),
            new web3.PublicKey(poolInfo.serumMarket),
            new web3.PublicKey(poolInfo.serumBids),
            new web3.PublicKey(poolInfo.serumAsks),
            new web3.PublicKey(poolInfo.serumEventQueue),
            new web3.PublicKey(poolInfo.serumCoinVaultAccount),
            new web3.PublicKey(poolInfo.serumPcVaultAccount),
            new web3.PublicKey(poolInfo.serumVaultSigner),
            fromWrappedSolAccount??fromTokenAccount,
            toWrappedSolAccount??toTokenAccount,
            ownerAccount.publicKey,
            Math.floor(amountIn.toWei()),
            Math.floor(amountOutMin.toWei())
        )
    );

    if (fromWrappedSolAccount) {
        transaction.add(
            SwapUtils.closeAccountInstruction(fromWrappedSolAccount, ownerAccount.publicKey, ownerAccount.publicKey)
        );
    }
    if (toWrappedSolAccount) {
        transaction.add(
            SwapUtils.closeAccountInstruction(toWrappedSolAccount, ownerAccount.publicKey, ownerAccount.publicKey)
        );
    }
    // console.log("Signers", signers);
    // console.log("Transaction", transaction);

    // signers.push(ownerAccount);
    var signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [ownerAccount, ...signers]
    );
    console.log("Response", signature);         // Signature is the transaction hash
}

function showHelp() {
    console.log("Please use by below command:");
    console.log("    node swap/swap-token.js --type=add-token --accountPk=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a --token=RAY");
    console.log("    node swap/swap-token.js --type=swap --accountPk=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a --fromToken=RAY --toToken=USDC --amount=0.01");
    console.log("    node swap/swap-token.js --type=swap --accountPk=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a --fromToken=USDC --toToken=RAY --amount=0.1");
    console.log("    node swap/swap-token.js --type=swap --accountPk=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a --fromToken=USDC --toToken=SOL --amount=1");
}

async function main() {
    var opts = parseArgs(process.argv.slice(2));
    if (opts.nodeType) nodeType = opts.nodeType;
    console.log("NodeType:", nodeType);
    if (opts.type=="add-token" && opts.accountPk && opts.token) {
        await addToken(opts.accountPk, opts.token);
    } else if (opts.type=="swap" && opts.accountPk && opts.fromToken && opts.toToken && opts.amount) {
        let aOut = 0;
        await swap(opts.accountPk, opts.fromToken, opts.toToken, opts.amount, aOut);
    } else {
        showHelp();
    }
    process.exit(0);
}

main();