// Reference: https://github.com/raydium-io/raydium-ui/blob/master/src/utils/swap.ts (Function: getSwapOutAmount)
const web3 = require('@solana/web3.js');
const TokenAmount = require('./utils/TokenAmount');
const AMMCalculator = require('./utils/AMMCalculator');
const { ACCOUNT_LAYOUT, AMM_INFO_LAYOUT_V4, MINT_LAYOUT } = require('./utils/layout');
const { TOKENS } = require('./utils/tokens');

const rayUsdcPool = {
    name: 'RAY-USDC',
    coin: TOKENS.RAY,
    pc: TOKENS.USDC,
    ammId: '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg',
    poolCoinTokenAccount: 'FdmKUE4UMiJYFK5ogCngHzShuVKrFXBamPWcewDr31th',
    poolPcTokenAccount: 'Eqrhxd7bDUCH3MepKmdVkgwazXRzY6iHhEoBpY7yAohk',
};

//
const commitment = "confirmed";
const nodeType = "mainnet-beta";

// Global variables
let connection = null;
let ammCalculator = null;

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

async function getAMMCalculator() {
    if (ammCalculator==null) {
        let feeInfo = await getFeenfos();
        if (feeInfo && feeInfo.swapFeeNumerator && feeInfo.swapFeeDenominator) {
            ammCalculator = new AMMCalculator(feeInfo.swapFeeNumerator, feeInfo.swapFeeDenominator);
        }
    }
    return ammCalculator;
}

function getBigNumber(num) {
    return num === undefined || num === null ? 0 : parseFloat(num.toString())
}

// getMultipleAccounts
async function getMultipleAccounts(connection, publicKeys, commitment) {
    const keys = [];
    let tempKeys = [];
    publicKeys.forEach((k) => {
        if (tempKeys.length >= 100) {
            keys.push(tempKeys);
            tempKeys = [];
        }
        tempKeys.push(k);
    })
    if (tempKeys.length > 0) {
        keys.push(tempKeys);
    }

    const accounts = [];
    const resArray = {};
    await Promise.all(
        keys.map(async (key, index) => {
            const res = await connection.getMultipleAccountsInfo(key, commitment);
            resArray[index] = res;
        })
    );

    Object.keys(resArray)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((itemIndex) => {
            const res = resArray[parseInt(itemIndex)]
            for (const account of res) {
                accounts.push(account)
            }
        });

    return accounts.map((account, idx) => {
        if (account === null) {
            return null
        }
        return {
            publicKey: publicKeys[idx],
            account
        }
    });
}

async function getFeenfos() {
    const feeInfo = {};
    const publicKeys = [
        new web3.PublicKey(rayUsdcPool.ammId)
    ];

    const multipleInfos = await getMultipleAccounts(getConnection(), publicKeys, commitment);
    let info = multipleInfos[0];
    let data = Buffer.from(info.account.data);
    let parsed = AMM_INFO_LAYOUT_V4.decode(data)
    feeInfo.swapFeeNumerator = getBigNumber(parsed.swapFeeNumerator).toFixed(0);
    feeInfo.swapFeeDenominator = getBigNumber(parsed.swapFeeDenominator).toFixed(0);

    return feeInfo;
}

async function getLiquidityInfos() {
    const liquidityInfo = {};
    const publicKeys = [
        new web3.PublicKey(rayUsdcPool.poolCoinTokenAccount),
        new web3.PublicKey(rayUsdcPool.poolPcTokenAccount),
    ];

    const multipleInfos = await getMultipleAccounts(getConnection(), publicKeys, commitment);
    for (let idx=0; idx<multipleInfos.length; idx++) {
        let info = multipleInfos[idx];
        const data = Buffer.from(info.account.data)
        if (idx==0) {
            const parsed = ACCOUNT_LAYOUT.decode(data)
            liquidityInfo.rayBalance =  getBigNumber(parsed.amount).toFixed(0);
        } else if (idx==1) {
            const parsed = ACCOUNT_LAYOUT.decode(data)
            liquidityInfo.usdcBalance =  getBigNumber(parsed.amount).toFixed(0);
        }
    }
    return liquidityInfo;
}

async function updateLiquidity() {
    let ammCalculator = await getAMMCalculator();
    let liquidityInfo = await getLiquidityInfos();
    ammCalculator.updateLiquidity(liquidityInfo.rayBalance, liquidityInfo.usdcBalance);
}

async function getSwapOutAmount(fromToken, toToken, amountIn) {
    // Get AMMCalculator
    let amountOut = null;
    let ammCalculator = await getAMMCalculator();

    // Calculate
    if (fromToken=="RAY" && toToken=="USDC") {
        let networkAmountIn = (new TokenAmount(amountIn, TOKENS.RAY.decimals, false)).toWei();
        let networkAmountOut = ammCalculator.getSwapAmountOut(networkAmountIn);
        amountOut = networkAmountOut/(10**TOKENS.USDC.decimals);
    } else if (fromToken=="USDC" && toToken=="RAY") {
        let networkAmountIn = (new TokenAmount(amountIn, TOKENS.USDC.decimals, false)).toWei();
        let networkAmountOut = ammCalculator.getReverseSwapAmountOut(networkAmountIn);
        amountOut = networkAmountOut/(10**TOKENS.RAY.decimals);
    } else {
        console.log("Token is not supported!");
    }
    return amountOut;
}

async function getSwapInAmount(fromToken, toToken, amountOut) {
    // Get AMMCalculator
    let amountIn = null;
    let ammCalculator = await getAMMCalculator();

    // Update liquidity
    let liquidityInfo = await getLiquidityInfos();
    ammCalculator.updateLiquidity(liquidityInfo.rayBalance, liquidityInfo.usdcBalance);

    // Calculate
    if (fromToken=="RAY" && toToken=="USDC") {
        let networkAmountOut = (new TokenAmount(amountOut, TOKENS.USDC.decimals, false)).toWei();
        let networkAmountIn = ammCalculator.getSwapAmountIn(networkAmountOut);
        amountIn = networkAmountIn/(10**TOKENS.RAY.decimals);
    } else if (fromToken=="USDC" && toToken=="RAY") {
        let networkAmountOut = (new TokenAmount(amountOut, TOKENS.RAY.decimals, false)).toWei();
        let networkAmountIn = ammCalculator.getReverseSwapAmountIn(networkAmountOut);
        amountIn = networkAmountIn/(10**TOKENS.USDC.decimals);
    } else {
        console.log("Token is not supported!");
    }
    return amountIn;
}

async function main() {
    console.log("NodeType:", nodeType);
    let coin = "RAY";
    let currency = "USDC";
    let rayAmount = "100";
    await updateLiquidity();
    let usdcAmount = await getSwapOutAmount(coin, currency, rayAmount);
    let sellprice = usdcAmount/rayAmount;
    let usdcAmount1 = await getSwapInAmount(currency, coin, rayAmount);
    let buyprice = usdcAmount1/rayAmount;
    console.log(`Swap Info for ${coin}-${currency}:`);
    console.log(`    Sell Price: ${sellprice}`);
    console.log(`    Buy Price: ${buyprice}`);
    process.exit(0);
}

main();