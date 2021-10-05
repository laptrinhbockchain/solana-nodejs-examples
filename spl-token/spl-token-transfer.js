// https://stackoverflow.com/questions/68236211/how-to-transfer-custom-token-by-solana-web3-js
const parseArgs = require('minimist');
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

// Constants
const commitment = "confirmed";
const nodeType = "testnet";

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

// Create new token
async function createToken(accountPk) {
    // Create token
    let connection = getConnection();
    let payer = web3.Keypair.fromSeed(new Uint8Array(Buffer.from(accountPk, "hex")));
    let mintToken = await splToken.Token.createMint(connection, payer, payer.publicKey, null, 6, splToken.TOKEN_PROGRAM_ID);
    console.log('Mint address:', mintToken.publicKey.toBase58());
}

// Mint token
async function mintToken(accountPk, mintAddress, toAddress, amount, decimal) {
    // Init account
    let owner = web3.Keypair.fromSeed(new Uint8Array(Buffer.from(accountPk, "hex")));
    let toAccount = new web3.PublicKey(toAddress);
    let mintAccount = new web3.PublicKey(mintAddress);

    // Init Token object
    let token = new splToken.Token(getConnection(), mintAccount, splToken.TOKEN_PROGRAM_ID, owner);

    // Get associated account
    let tokenAccount = await token.getOrCreateAssociatedAccountInfo(toAccount);
    console.log('Token account address:', tokenAccount.address.toBase58());
    
    // Minting tokens to the token address we just created
    let networkAmount = (amount*10**decimal).toFixed(0);
    await token.mintTo(tokenAccount.address, owner.publicKey, [], networkAmount);
    console.log(`Mint ${amount} token to ${toAccount.toBase58()}: DONE!`);
}

// Show token balance
async function transferToken(accountPk, mintAddress, toAddress, amount, decimal) {
    let connection = getConnection();
    let fromAccount = web3.Keypair.fromSeed(new Uint8Array(Buffer.from(accountPk, "hex")));
    let toAccount = new web3.PublicKey(toAddress);
    let mintAccount = new web3.PublicKey(mintAddress);
    let networkAmount = (amount*10**decimal).toFixed(0);

    // Init Token object
    let token = new splToken.Token(connection, mintAccount, splToken.TOKEN_PROGRAM_ID, fromAccount);

    // Create associated token accounts for my token if they don't exist yet
    let fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(fromAccount.publicKey);
    let toTokenAccount = await token.getOrCreateAssociatedAccountInfo(toAccount);

    // Add token transfer instructions to transaction
    let transaction = new web3.Transaction();
    transaction.add(
        splToken.Token.createTransferInstruction(
            splToken.TOKEN_PROGRAM_ID,
            fromTokenAccount.address,
            toTokenAccount.address,
            fromAccount.publicKey,
            [],
            networkAmount
        )
    );
    
    // Sign transaction, broadcast, and confirm
    var signature = await web3.sendAndConfirmTransaction(connection, transaction, [fromAccount]);
    console.log("SIGNATURE", signature);
    console.log("SUCCESS");
}

function showHelp() {
    console.log("Please use by below command:");
    console.log("    node spl-token/spl-token-transfer.js --action=create --accountPk=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a");
    console.log("    node spl-token/spl-token-transfer.js --action=create --nodeType=mainnet-beta --accountPk=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a");
    console.log("    node spl-token/spl-token-transfer.js --action=mint --accountPk=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a --mintAddress=5gAveMVpKqD7PSvzp22iGRZzMPE386JsHGgjFHd5WKXB --toAddress=5W767fcieKYMDKpPYn7TGVDQpMPpFGMUHFMSqeap43Wa --amount=1000");
    console.log("    node spl-token/spl-token-transfer.js --action=transfer --accountPk=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a --mintAddress=5gAveMVpKqD7PSvzp22iGRZzMPE386JsHGgjFHd5WKXB --toAddress=XDC4iNqUJi6WAWXTwEFGo5z1AHzEVbMdB8mGi58jKsD --amount=1");
}

async function main() {
    var opts = parseArgs(process.argv.slice(2));
    if (opts.nodeType) nodeType = opts.nodeType;
    let decimal = 6;
    if (opts.decimal) decimal = opts.decimal;
    console.log("NodeType:", nodeType);
    if (opts.action=="create" && opts.accountPk) {
        await createToken(opts.accountPk);
    } else if (opts.action=="mint" && opts.accountPk && opts.mintAddress && opts.toAddress && opts.amount) {
        await mintToken(opts.accountPk, opts.mintAddress, opts.toAddress, opts.amount, decimal);
    } else if (opts.action=="transfer" && opts.accountPk && opts.toAddress && opts.mintAddress && opts.amount) {
        await transferToken(opts.accountPk, opts.mintAddress, opts.toAddress, opts.amount, decimal);
    } else {
        showHelp();
    }
    process.exit(0);
}

main();