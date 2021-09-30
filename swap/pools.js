const { TOKENS, LP_TOKENS, NATIVE_SOL } = require('./tokens');
const { LIQUIDITY_POOL_PROGRAM_ID_V4 } = require('./layout');

const LIQUIDITY_POOLS = [
    {
        name: 'RAY-USDT',
        coin: { ...TOKENS.RAY },
        pc: { ...TOKENS.USDT },
        lp: { ...LP_TOKENS['RAY-USDT-V4'] },

        version: 4,
        programId: LIQUIDITY_POOL_PROGRAM_ID_V4,

        ammId: 'DVa7Qmb5ct9RCpaU7UTpSaf3GVMYz17vNVU67XpdCRut',
        ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        ammOpenOrders: '7UF3m8hDGZ6bNnHzaT2YHrhp7A7n9qFfBj6QEpHPv5S8',
        ammTargetOrders: '3K2uLkKwVVPvZuMhcQAPLF8hw95somMeNwJS7vgWYrsJ',
        // no need
        ammQuantities: NATIVE_SOL.mintAddress,
        poolCoinTokenAccount: '3wqhzSB9avepM9xMteiZnbJw75zmTBDVmPFLTQAGcSMN',
        poolPcTokenAccount: '5GtSbKJEPaoumrDzNj4kGkgZtfDyUceKaHrPziazALC1',
        poolWithdrawQueue: '8VuvrSWfQP8vdbuMAP9AkfgLxU9hbRR6BmTJ8Gfas9aK',
        poolTempLpTokenAccount: 'FBzqDD1cBgkZ1h6tiZNFpkh4sZyg6AG8K5P9DSuJoS5F',
        serumMarket: 'teE55QrL4a4QSfydR9dnHF97jgCfptpuigbb53Lo95g',
        serumBids: 'AvKStCiY8LTp3oDFrMkiHHxxhxk4sQUWnGVcetm4kRpy',
        serumAsks: 'Hj9kckvMX96mQokfMBzNCYEYMLEBYKQ9WwSc1GxasW11',
        serumEventQueue: '58KcficuUqPDcMittSddhT8LzsPJoH46YP4uURoMo5EB',
        serumCoinVaultAccount: '2kVNVEgHicvfwiyhT2T51YiQGMPFWLMSp8qXc1hHzkpU',
        serumPcVaultAccount: '5AXZV7XfR7Ctr6yjQ9m9dbgycKeUXWnWqHwBTZT6mqC7',
        serumVaultSigner: 'HzWpBN6ucpsA9wcfmhLAFYqEUmHjE9n2cGHwunG5avpL',
        official: true
    }
];
exports.LIQUIDITY_POOLS = LIQUIDITY_POOLS;

function getPoolByName(poolName) {
    for (let idx=0; idx<LIQUIDITY_POOLS.length; idx++) {
        if (LIQUIDITY_POOLS[idx].name==poolName) return LIQUIDITY_POOLS[idx];
    }
    return null;
}
exports.getPoolByName = getPoolByName;