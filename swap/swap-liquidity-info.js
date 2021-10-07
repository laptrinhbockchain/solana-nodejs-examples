// Reference: https://github.com/raydium-io/raydium-ui/blob/master/src/store/liquidity.ts (Function: actionTree)
const web3 = require('@solana/web3.js');
const { ACCOUNT_LAYOUT, AMM_INFO_LAYOUT_V4 } = require('./utils/layout');
const TOKENS = require('./utils/tokens').TOKENS;

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

function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
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

async function getLiquidityInfos() {
    const liquidityPoolInfo = {};
    const publicKeys = [
        new web3.PublicKey(rayUsdcPool.ammId),
        new web3.PublicKey(rayUsdcPool.poolCoinTokenAccount),
        new web3.PublicKey(rayUsdcPool.poolPcTokenAccount),
    ];

    const multipleInfos = await getMultipleAccounts(getConnection(), publicKeys, commitment);
    for (let idx=0; idx<multipleInfos.length; idx++) {
        let info = multipleInfos[idx];
        const data = Buffer.from(info.account.data)
        if (idx==0) {
            let parsed = AMM_INFO_LAYOUT_V4.decode(data)
            liquidityPoolInfo.swapFeeNumerator = getBigNumber(parsed.swapFeeNumerator).toFixed(0);
            liquidityPoolInfo.swapFeeDenominator = getBigNumber(parsed.swapFeeDenominator).toFixed(0);
        } else if (idx==1) {
            const parsed = ACCOUNT_LAYOUT.decode(data)
            liquidityPoolInfo.rayBalance =  getBigNumber(parsed.amount).toFixed(0);
        } else if (idx==2) {
            const parsed = ACCOUNT_LAYOUT.decode(data)
            liquidityPoolInfo.usdcBalance =  getBigNumber(parsed.amount).toFixed(0);
        }
    }
    return liquidityPoolInfo;
}

async function main() {
    console.log("NodeType:", nodeType);
    let liquidityInfos = await getLiquidityInfos();
    console.log(JSON.stringify(liquidityInfos, null, "    "));
    process.exit(0);
}

main();