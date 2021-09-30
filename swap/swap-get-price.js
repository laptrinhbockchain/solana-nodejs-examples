const web3 = require('@solana/web3.js');
const TokenAmount = require('./TokenAmount');
const { LIQUIDITY_POOLS, getPoolByName } = require('./pools');
const { ACCOUNT_LAYOUT, AMM_INFO_LAYOUT_V4, MINT_LAYOUT } = require('./layout');
const { TOKENS } = require('./tokens');

//
const commitment = "confirmed";
const nodeType = "mainnet-beta";

// Global variables
let connection = null;
let liquidityPools = null;

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

async function getSwapOutAmount(poolName, fromToken, toToken, amount, slippage) {
    if (liquidityPools==null) {
        liquidityPools = await getLiquidityInfos();
    }

    let poolInfo = liquidityPools[getPoolByName(poolName).lp.mintAddress];
    let fromCoinMint = TOKENS[fromToken].mintAddress;
    let toCoinMint = TOKENS[toToken].mintAddress;
    const { coin, pc, fees } = poolInfo;
    const { swapFeeNumerator, swapFeeDenominator } = fees;

    if (fromCoinMint === coin.mintAddress && toCoinMint === pc.mintAddress) {
        // coin2pc
        const fromAmount = new TokenAmount(amount, coin.decimals, false)
        const fromAmountWithFee = fromAmount.wei
            .multipliedBy(swapFeeDenominator - swapFeeNumerator)
            .dividedBy(swapFeeDenominator)

        const denominator = coin.balance.wei.plus(fromAmountWithFee)
        const amountOut = pc.balance.wei.multipliedBy(fromAmountWithFee).dividedBy(denominator)
        const amountOutWithSlippage = amountOut.dividedBy(1 + slippage / 100)

        const outBalance = pc.balance.wei.minus(amountOut)
        const beforePrice = new TokenAmount(
            parseFloat(new TokenAmount(pc.balance.wei, pc.decimals).fixed()) /
            parseFloat(new TokenAmount(coin.balance.wei, coin.decimals).fixed()),
            pc.decimals,
            false
        )
        const afterPrice = new TokenAmount(
            parseFloat(new TokenAmount(outBalance, pc.decimals).fixed()) /
            parseFloat(new TokenAmount(denominator, coin.decimals).fixed()),
            pc.decimals,
            false
        )
        const priceImpact =
            ((parseFloat(beforePrice.fixed()) - parseFloat(afterPrice.fixed())) / parseFloat(beforePrice.fixed())) * 100

        return {
            amountIn: fromAmount,
            amountOut: new TokenAmount(amountOut, pc.decimals),
            amountOutWithSlippage: new TokenAmount(amountOutWithSlippage, pc.decimals),
            priceImpact
        }
    } else {
        // pc2coin
        const fromAmount = new TokenAmount(amount, pc.decimals, false)
        const fromAmountWithFee = fromAmount.wei
            .multipliedBy(swapFeeDenominator - swapFeeNumerator)
            .dividedBy(swapFeeDenominator)

        const denominator = pc.balance.wei.plus(fromAmountWithFee)
        const amountOut = coin.balance.wei.multipliedBy(fromAmountWithFee).dividedBy(denominator)
        const amountOutWithSlippage = amountOut.dividedBy(1 + slippage / 100)

        const outBalance = coin.balance.wei.minus(amountOut)

        const beforePrice = new TokenAmount(
            parseFloat(new TokenAmount(pc.balance.wei, pc.decimals).fixed()) /
            parseFloat(new TokenAmount(coin.balance.wei, coin.decimals).fixed()),
            pc.decimals,
            false
        )
        const afterPrice = new TokenAmount(
            parseFloat(new TokenAmount(denominator, pc.decimals).fixed()) /
            parseFloat(new TokenAmount(outBalance, coin.decimals).fixed()),
            pc.decimals,
            false
        )
        const priceImpact =
            ((parseFloat(afterPrice.fixed()) - parseFloat(beforePrice.fixed())) / parseFloat(beforePrice.fixed())) * 100

        return {
            amountIn: fromAmount,
            amountOut: new TokenAmount(amountOut, coin.decimals),
            amountOutWithSlippage: new TokenAmount(amountOutWithSlippage, coin.decimals),
            priceImpact
        }
    }
}

async function main() {
    console.log("NodeType:", nodeType);
    let poolName = "RAY-USDT";
    let fromToken = "RAY";
    let toToken = "USDT";
    let amountIn = "100";
    let slippage = 1;
    let swapOutInfo = await getSwapOutAmount(poolName, fromToken, toToken, amountIn, slippage);
    let amountOut = swapOutInfo.amountOut.fixed();
    let price = amountOut/amountIn;
    console.log("swapOutInfo", JSON.stringify(swapOutInfo, null, "    "));
    console.log(`Swap Info: ${amountIn} ${fromToken} => ${amountOut} ${toToken}: price=${price} - priceImpact=${(swapOutInfo.priceImpact*100).toFixed(2)}%`);
    process.exit(0);
}

main();