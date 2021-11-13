const parseArgs = require('minimist');
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const BufferLayout = require('buffer-layout');

// Constants
const commitment = "confirmed";
const ACCOUNT_LAYOUT = BufferLayout.struct([
    BufferLayout.blob(32, 'mint'),
    BufferLayout.blob(32, 'owner'),
    BufferLayout.nu64('amount'),
    BufferLayout.blob(93),
]);
let nodeType = "mainnet-beta";
const tokenInfos = [
    {
        name: "Raydium",
        symbol: "RAY",
        mintAddr: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
        decimal: 6
    },
    {
        name: "Serum",
        symbol: "SRM",
        mintAddr: "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt",
        decimal: 6,
    },
    {
        name: "Synthetify",
        symbol: "SNY",
        mintAddr: "4dmKkXNHdgYsXqBHCuMikNQWwVomZURhYvkkX5c4pQ7y",
        decimal: 6,
    },
    {
        name: "USD Coin",
        symbol: "USDC",
        mintAddr: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimal: 6
    },
    {
        name: 'Wrapped Solana',
        symbol: 'WSOL',
        mintAddr: 'So11111111111111111111111111111111111111112',
        decimal: 9,
    },
];

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

function findItemByKey(arr, key, value) {
    for (let idx=0; idx<arr.length; idx++) {
        let item = arr[idx];
        if (item[key]==value) return item;
    }
    return null;
}

// Parse data
function parseTokenAccountData(data) {
    let { mint, owner, amount } = ACCOUNT_LAYOUT.decode(data);
    return {
        mint: new web3.PublicKey(mint),
        owner: new web3.PublicKey(owner),
        amount,
    };
}

function getOwnedAccountsFilters(publicKey) {
    return [
        {
            memcmp: {
                offset: ACCOUNT_LAYOUT.offsetOf('owner'),
                bytes: publicKey.toBase58(),
            },
        },
        {
            dataSize: ACCOUNT_LAYOUT.span,
        },
    ];
}

async function getOwnedTokenAccounts(connection, publicKey) {
    let filters = getOwnedAccountsFilters(publicKey);
    let resp = await connection.getProgramAccounts(
        splToken.TOKEN_PROGRAM_ID,
        {
            filters,
        },
    );
    return resp.map(({ pubkey, account: { data, executable, owner, lamports } }) => ({
        publicKey: new web3.PublicKey(pubkey),
        accountInfo: {
            data,
            executable,
            owner: new web3.PublicKey(owner),
            lamports,
        },
    }));
}

// Get all token accounts from an address wallet
async function getTokenAccounts(accountAddr) {
    let connection = getConnection();
    let account = new web3.PublicKey(accountAddr);
    let tokenAccounts = await getOwnedTokenAccounts(connection, account);
    return tokenAccounts
        .map(({ publicKey, accountInfo }) => {
            let item = parseTokenAccountData(accountInfo.data);
            item.account = publicKey;
            return item;
        }).sort((account1, account2) =>
            account1.mint
                .toBase58()
                .localeCompare(account2.mint.toBase58()),
      );;
};

// Show token balance
async function showTokenBalance(accountAddr) {
    let tokenAccounts = await getTokenAccounts(accountAddr);
    let otherTokens = [];
    console.log(accountAddr + ":");
    console.log("    Basic tokens:");
    for (let idx=0; idx<tokenAccounts.length; idx++) {
        let tokenAccount = tokenAccounts[idx];
        let mintAddr = tokenAccount.mint.toBase58();
        let item = findItemByKey(tokenInfos, "mintAddr", mintAddr);
        if (item) {
            let tokenBalance = (tokenAccount.amount/10**item.decimal).toFixed(6);
            console.log(`        ${item.name} (${item.symbol}): ${tokenBalance}`);
        } else {
            otherTokens.push( { mintAddr, amount: tokenAccount.amount } );
        }
    }
    console.log("    Other tokens:");
    for (let idx=0; idx<otherTokens.length; idx++) {
        let item = otherTokens[idx];
        console.log(`        ${item.mintAddr}: ${item.amount}`);
    }
}

function showHelp() {
    console.log("Please use by below commands:");
    console.log("    node spl-token/spl-token-balance.js --accountAddr=4Wiid5JonjxyH5ZPo4H2iJLXDrwESNZiXDKsp75bDkYV");
    console.log("    node spl-token/spl-token-balance.js --nodeType=testnet --accountAddr=5W767fcieKYMDKpPYn7TGVDQpMPpFGMUHFMSqeap43Wa");
}

async function main() {
    var opts = parseArgs(process.argv.slice(2));
    if (opts.nodeType) nodeType = opts.nodeType;
    console.log("NodeType:", nodeType);
    if (opts.accountAddr) {
        await showTokenBalance(opts.accountAddr);
    } else {
        showHelp();
    }
    process.exit(0);
}

main();