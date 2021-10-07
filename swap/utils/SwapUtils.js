const web3 = require('@solana/web3.js');
const SplToken = require('@solana/spl-token');
const { initializeAccount, closeAccount } = require('@project-serum/serum/lib/token-instructions');
const { ACCOUNT_LAYOUT } = require('./layout');
const { nu64, struct, u8 } = require('buffer-layout');
const { TOKENS } = require('./tokens');

async function createProgramAccountIfNotExist(connection, account, owner, programId, lamports, layout, transaction, signer) {
    let publicKey = null;
    if (account) {
        publicKey = new web3.PublicKey(account);
    } else {
        const newAccount = web3.Keypair.generate();
        publicKey = newAccount.publicKey;

        transaction.add(
            web3.SystemProgram.createAccount({
                fromPubkey: owner,
                newAccountPubkey: publicKey,
                lamports: lamports ?? (await connection.getMinimumBalanceForRentExemption(layout.span)),
                space: layout.span,
                programId
            })
        );

        signer.push(newAccount);
    }

    return publicKey
}
exports.createProgramAccountIfNotExist = createProgramAccountIfNotExist;

async function createTokenAccountIfNotExist(connection, account, owner, mintAddress, lamports, transaction, signer) {
    let publicKey = null;
    if (account) {
        publicKey = new web3.PublicKey(account);
    } else {
        publicKey = await createProgramAccountIfNotExist(
            connection,
            account,
            owner,
            SplToken.TOKEN_PROGRAM_ID,
            lamports,
            ACCOUNT_LAYOUT,
            transaction,
            signer
        );

        transaction.add(
            initializeAccount({
                account: publicKey,
                mint: new web3.PublicKey(mintAddress),
                owner
            })
        );
    }

    return publicKey;
}
exports.createTokenAccountIfNotExist = createTokenAccountIfNotExist;

async function getAssociatedTokenAccount(owner, mintAddress) {
    let mintAccount = new web3.PublicKey(mintAddress);
    let tokenAccount = await SplToken.Token.getAssociatedTokenAddress(SplToken.ASSOCIATED_TOKEN_PROGRAM_ID, SplToken.TOKEN_PROGRAM_ID, mintAccount, owner, true);
    return tokenAccount;
}
exports.getAssociatedTokenAccount = getAssociatedTokenAccount;

async function createAssociatedTokenAccountIfNotExist(account, owner, mintAddress, transaction, atas = []) {
    let publicKey = null;
    if (account) {
        publicKey = new web3.PublicKey(account)
    }

    const mint = new web3.PublicKey(mintAddress)
    const ata = await SplToken.Token.getAssociatedTokenAddress(
        SplToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        SplToken.TOKEN_PROGRAM_ID,
        mint, owner, true
    );

    if (
        (!publicKey || !ata.equals(publicKey)) &&
        mintAddress !== TOKENS.WSOL.mintAddress &&
        !atas.includes(ata.toBase58())
    ) {
        transaction.add(
            SplToken.Token.createAssociatedTokenAccountInstruction(
                SplToken.ASSOCIATED_TOKEN_PROGRAM_ID,
                SplToken.TOKEN_PROGRAM_ID,
                mint,
                ata,
                owner,
                owner
            )
        );
        atas.push(ata.toBase58());
    }

    return ata;
}
exports.createAssociatedTokenAccountIfNotExist = createAssociatedTokenAccountIfNotExist;

function swapInstruction(
    // Token program Id
    programId,
    // amm
    ammId, ammAuthority, ammOpenOrders,
    ammTargetOrders, poolCoinTokenAccount, poolPcTokenAccount,
    // serum
    serumProgramId, serumMarket, serumBids, serumAsks,
    serumEventQueue, serumCoinVaultAccount, serumPcVaultAccount, serumVaultSigner,
    // user
    userSourceTokenAccount, userDestTokenAccount, userOwner,
    amountIn, minAmountOut
) {
    const keys = [
        // spl token
        { pubkey: SplToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        // amm
        { pubkey: ammId, isSigner: false, isWritable: true },
        { pubkey: ammAuthority, isSigner: false, isWritable: false },
        { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
        { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
        { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
        // serum
        { pubkey: serumProgramId, isSigner: false, isWritable: false },
        { pubkey: serumMarket, isSigner: false, isWritable: true },
        { pubkey: serumBids, isSigner: false, isWritable: true },
        { pubkey: serumAsks, isSigner: false, isWritable: true },
        { pubkey: serumEventQueue, isSigner: false, isWritable: true },
        { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
        { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
        { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
        // user
        { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userDestTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userOwner, isSigner: true, isWritable: false }
    ];
    // console.log("1. TOKEN_PROGRAM_ID", SplToken.TOKEN_PROGRAM_ID.toBase58());
    // console.log("2. ammId", ammId.toBase58());
    // console.log("3. ammAuthority", ammAuthority.toBase58());
    // console.log("4. ammOpenOrders", ammOpenOrders.toBase58());
    // console.log("5. ammTargetOrders", ammTargetOrders.toBase58());
    // console.log("6. poolCoinTokenAccount", poolCoinTokenAccount.toBase58());
    // console.log("7. poolPcTokenAccount", poolPcTokenAccount.toBase58());
    // console.log("8. serumProgramId", serumProgramId.toBase58());
    // console.log("9. serumMarket", serumMarket.toBase58());
    // console.log("10. serumBids", serumBids.toBase58());
    // console.log("11. serumAsks", serumAsks.toBase58());
    // console.log("12. serumEventQueue", serumEventQueue.toBase58());
    // console.log("13. serumCoinVaultAccount", serumCoinVaultAccount.toBase58());
    // console.log("14. serumPcVaultAccount", serumPcVaultAccount.toBase58());
    // console.log("15. serumVaultSigner", serumVaultSigner.toBase58());
    // console.log("16. userSourceTokenAccount", userSourceTokenAccount.toBase58());
    // console.log("17. userDestTokenAccount", userDestTokenAccount.toBase58());
    // console.log("18. userOwner", userOwner.toBase58());

    const dataLayout = struct([u8('instruction'), nu64('amountIn'), nu64('minAmountOut')]);
    let data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            instruction: 9,
            amountIn,
            minAmountOut
        },
        data
    );
    // console.log("Data:", data.toString("hex"));

    return new web3.TransactionInstruction({
        keys,
        programId,
        data
    });
}
exports.swapInstruction = swapInstruction;

function closeAccountInstruction(source, destination, owner) {
    return closeAccount({
        source: source,
        destination: destination,
        owner
    });
}
exports.closeAccountInstruction = closeAccountInstruction