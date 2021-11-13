// The old wallet (Old standard) of Solana is created from BIP39
// This wallet is rarely used recently.
const parseArgs = require('minimist');
const Web3 = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

const DERIVATION_PATH = "m/44'/501'/0'/0'";          // m/44'/501'/${walletIndex}'/0'

// Generate wallet
async function generateWallet() {
    let mnemonic = bip39.generateMnemonic(256);
    let seed = await bip39.mnemonicToSeed(mnemonic);
    let privateKey = derivePath(DERIVATION_PATH, seed).key;
    let account = Web3.Keypair.fromSeed(new Uint8Array(privateKey));
    console.log("Mnemonic:", mnemonic);
    console.log("Private Key:", privateKey.toString('hex'));
    console.log("Private Key:", "[" + privateKey.join(",") + "]");
    console.log("Wallet:", account.publicKey.toBase58());
    return true;
}

async function generateAccount() {
    let account = Web3.Keypair.generate();
    let privateKey = Buffer.from(account.secretKey).slice(0, 32);
    console.log("Private Key:", privateKey.toString('hex', 0, 32));
    console.log("Private Key:", "[" + privateKey.join(",") + "]");
    console.log("Wallet:", account.publicKey.toBase58());
    return true;
}

async function checkWallet(mnemonic) {
    let seed = await bip39.mnemonicToSeed(mnemonic);
    let privateKey = derivePath(DERIVATION_PATH, seed).key;
    let account = Web3.Keypair.fromSeed(new Uint8Array(privateKey));
    console.log("Mnemonic:", mnemonic);
    console.log("Private Key:", privateKey.toString('hex'));
    console.log("Private Key:", "[" + privateKey.join(",") + "]");
    console.log("Wallet:", account.publicKey.toBase58());
    return true;
}

async function checkAccount(privateKey) {
    if (privateKey.startsWith("[") && privateKey.endsWith("]")) {
        privateKey = Buffer.from(eval(privateKey));
    } else {
        privateKey = Buffer.from(privateKey, "hex");
    }
    let account = Web3.Keypair.fromSeed(new Uint8Array(privateKey));
    console.log("Private Key:", privateKey.toString('hex'));
    console.log("Private Key:", "[" + privateKey.join(",") + "]");
    console.log("Wallet:", account.publicKey.toBase58());
    return true;
}

function showHelp() {
    console.log("Please use by below commands:");
    console.log("    node account/create-wallet.js --action=generate --type=mnemonic");
    console.log("    node account/create-wallet.js --action=generate --type=account");
    console.log("    node account/create-wallet.js --action=check --type=mnemonic --mnemonic=\"xxxxxx\"");
    console.log("    node account/create-wallet.js --action=check --type=privatekey --privateKey=xxxxxx");
    console.log("privateKey supports both array and hexa!");
}

async function main() {
    var opts = parseArgs(process.argv.slice(2));
    if (opts.action=="generate") {
        if (opts.type=="mnemonic") {
            await generateWallet();
        } else if (opts.type=="account") {
            await generateAccount();
        } else {
            showHelp();
        }
    } else if (opts.action=="check") {
        if (opts.type=="mnemonic" && opts.mnemonic) {
            await checkWallet(opts.mnemonic);
        } else if (opts.type=="privatekey" && opts.privateKey) {
            await checkAccount(opts.privateKey);
        } else {
            showHelp();
        }
    } else {
        showHelp();
    }
    process.exit(0);
}

main();