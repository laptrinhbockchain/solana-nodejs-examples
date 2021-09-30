const web3 = require('@solana/web3.js');
const TokenAmount = require('./TokenAmount');
const { LIQUIDITY_POOLS } = require('./pools');
const { ACCOUNT_LAYOUT, AMM_INFO_LAYOUT_V4, MINT_LAYOUT } = require('./layout');

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

function getAddressForWhat(address) {
    for (const pool of LIQUIDITY_POOLS) {
        for (const [key, value] of Object.entries(pool)) {
            if (key === 'lp') {
                if (value.mintAddress === address) {
                    return { key: 'lpMintAddress', lpMintAddress: pool.lp.mintAddress, version: pool.version }
                }
            } else if (value === address) {
                return { key, lpMintAddress: pool.lp.mintAddress, version: pool.version }
            }
        }
    }

    return {}
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
    const liquidityPools = {};
    const publicKeys = [];
    LIQUIDITY_POOLS.forEach((pool) => {
        const { poolCoinTokenAccount, poolPcTokenAccount, ammOpenOrders, ammId, coin, pc, lp } = pool;
        publicKeys.push(
            new web3.PublicKey(poolCoinTokenAccount),
            new web3.PublicKey(poolPcTokenAccount),
            new web3.PublicKey(ammOpenOrders),
            new web3.PublicKey(ammId),
            new web3.PublicKey(lp.mintAddress)
        );
        const poolInfo = cloneDeep(pool);
        poolInfo.coin.balance = new TokenAmount(0, coin.decimals)
        poolInfo.pc.balance = new TokenAmount(0, pc.decimals)
        liquidityPools[lp.mintAddress] = poolInfo
    })

    const multipleInfo = await getMultipleAccounts(getConnection(), publicKeys, commitment);
    multipleInfo.forEach((info) => {
        if (info) {
            const address = info.publicKey.toBase58()
            const data = Buffer.from(info.account.data)
            const { key, lpMintAddress, version } = getAddressForWhat(address);
            console.log(`key=${key} - lpMintAddress=${lpMintAddress} - version=${version}`);

            if (key && lpMintAddress) {
                const poolInfo = liquidityPools[lpMintAddress]

                switch (key) {
                    case 'poolCoinTokenAccount': {
                        const parsed = ACCOUNT_LAYOUT.decode(data)
                        // quick fix: Number can only safely store up to 53 bits
                        poolInfo.coin.balance.wei = poolInfo.coin.balance.wei.plus(getBigNumber(parsed.amount))

                        break
                    }
                    case 'poolPcTokenAccount': {
                        const parsed = ACCOUNT_LAYOUT.decode(data)

                        poolInfo.pc.balance.wei = poolInfo.pc.balance.wei.plus(getBigNumber(parsed.amount))

                        break
                    }
                    case 'ammId': {
                        let parsed
                        if (version === 2) {
                            parsed = AMM_INFO_LAYOUT.decode(data)
                        } else if (version === 3) {
                            parsed = AMM_INFO_LAYOUT_V3.decode(data)
                        } else {
                            parsed = AMM_INFO_LAYOUT_V4.decode(data)

                            const { swapFeeNumerator, swapFeeDenominator } = parsed
                            poolInfo.fees = {
                                swapFeeNumerator: getBigNumber(swapFeeNumerator),
                                swapFeeDenominator: getBigNumber(swapFeeDenominator)
                            }
                        }

                        const { status, needTakePnlCoin, needTakePnlPc } = parsed
                        poolInfo.status = getBigNumber(status)
                        poolInfo.coin.balance.wei = poolInfo.coin.balance.wei.minus(getBigNumber(needTakePnlCoin))
                        poolInfo.pc.balance.wei = poolInfo.pc.balance.wei.minus(getBigNumber(needTakePnlPc))

                        break
                    }
                    // getLpSupply
                    case 'lpMintAddress': {
                        const parsed = MINT_LAYOUT.decode(data)

                        poolInfo.lp.totalSupply = new TokenAmount(getBigNumber(parsed.supply), poolInfo.lp.decimals)

                        break
                    }
                }
            }
        }
    });
    return liquidityPools;
}

async function main() {
    console.log("NodeType:", nodeType);
    let liquidityInfos = await getLiquidityInfos();
    console.log(JSON.stringify(liquidityInfos, null, "    "));
    process.exit(0);
}

main();