const NATIVE_SOL = {
    symbol: 'SOL',
    name: 'Native Solana',
    mintAddress: '11111111111111111111111111111111',
    decimals: 9,
    tags: ['raydium']
};
exports.NATIVE_SOL = NATIVE_SOL;

const TOKENS = {
    WSOL: {
        symbol: 'WSOL',
        name: 'Wrapped Solana',
        mintAddress: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        referrer: 'HTcarLHe7WRxBQCWvhVB8AP56pnEtJUV2jDGvcpY3xo5',
        tags: ['raydium']
    },
    RAY: {
        symbol: 'RAY',
        name: 'Raydium',
        mintAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        decimals: 6,
        referrer: '33XpMmMQRf6tSPpmYyzpwU4uXpZHkFwCZsusD9dMYkjy',
        tags: ['raydium']
    },
    USDT: {
        symbol: 'USDT',
        name: 'USDT',
        mintAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
        referrer: '8DwwDNagph8SdwMUdcXS5L9YAyutTyDJmK6cTKrmNFk3',
        tags: ['raydium']
    },
};
exports.TOKENS = TOKENS;

const LP_TOKENS = {
    'RAY-USDT-V4': {
        symbol: 'RAY-USDT',
        name: 'RAY-USDT LP',
        coin: { ...TOKENS.RAY },
        pc: { ...TOKENS.USDT },

        mintAddress: 'C3sT1R3nsw4AVdepvLTLKr5Gvszr7jufyBWUCvy4TUvT',
        decimals: TOKENS.RAY.decimals
    },
};
exports.LP_TOKENS = LP_TOKENS;