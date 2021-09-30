const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const BufferLayout = require('buffer-layout');

// https://stackoverflow.com/questions/68236211/how-to-transfer-custom-token-by-solana-web3-js

// Constants
const commitment = "confirmed";
const ACCOUNT_LAYOUT = BufferLayout.struct([
    BufferLayout.blob(32, 'mint'),
    BufferLayout.blob(32, 'owner'),
    BufferLayout.nu64('amount'),
    BufferLayout.blob(93),
]);
const nodeType = "testnet";
const accountAddresses = [
    "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    "4Wiid5JonjxyH5ZPo4H2iJLXDrwESNZiXDKsp75bDkYV",
    "7wKvqy5Yye8Dr8ERHAgWDKUdNmay3KDSQ3t4qUsUNiKb"
];
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
    console.log(accountAddr + ":");
    for (let idx=0; idx<tokenAccounts.length; idx++) {
        let tokenAccount = tokenAccounts[idx];
        let mintAddr = tokenAccount.mint.toBase58();
        let item = findItemByKey(tokenInfos, "mintAddr", mintAddr);
        if (item) {
            let tokenBalance = (tokenAccount.amount/10**item.decimal).toFixed(6);
            console.log(`    ${item.name} (${item.symbol}): ${tokenBalance}`);
        }
    }
}

async function main() {
    console.log("NodeType:", nodeType);
    await transferToken(accountAddresses[idx]);
    process.exit(0);
}

main();