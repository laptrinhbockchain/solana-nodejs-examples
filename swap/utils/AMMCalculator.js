const BigNumber = require('bignumber.js');

// Class AMM Calculator
// Calculate by formula: x*y=k
// Don't care about decimal
class AMMCalculator {
    constructor(swapFeeNumerator, swapFeeDenominator) {
        this.swapFeeNumerator = new BigNumber(swapFeeNumerator);
        this.swapFeeDenominator = new BigNumber(swapFeeDenominator);
    }

    updateLiquidity(token1Amount0, token2Amount0) {
        this.token1Amount0 = new BigNumber(token1Amount0);
        this.token2Amount0 = new BigNumber(token2Amount0);
    }

    // Swap token1 to token2
    // Need to calculate amountOut of token2 when you know amountIn of token1
    getSwapAmountOut(amountIn) {
        return this._getSwapAmountOut(this.token1Amount0, this.token2Amount0, amountIn);
    }

    // Swap token12 to token1
    // Need to calculate amountOut of token1 when you know amountIn of token2
    getReverseSwapAmountOut(amountIn) {
        return this._getSwapAmountOut(this.token2Amount0, this.token1Amount0, amountIn);
    }

    // Swap token1 to token2
    // Need to calculate amountIn of token1 you when know amountOut of token2
    getSwapAmountIn(amountOut) {
        return this._getSwapAmountIn(this.token1Amount0, this.token2Amount0, amountOut);
    }

    // Swap token2 to token1
    // Need to calculate amountIn of token2 you when know amountOut of token1
    getReverseSwapAmountIn(amountOut) {
        return this._getSwapAmountIn(this.token2Amount0, this.token1Amount0, amountOut);
    }

    _getSwapAmountOut(tokenAAmount0, tokenBAmount0, tokenAAmountIn) {
        let amountIn = new BigNumber(tokenAAmountIn);
        let amountInWithFee = amountIn
            .multipliedBy(this.swapFeeDenominator - this.swapFeeNumerator)
            .dividedBy(this.swapFeeDenominator);
        let denominator = tokenAAmount0.plus(amountInWithFee);
        let amountOut = tokenBAmount0.multipliedBy(amountInWithFee).dividedBy(denominator);
        return amountOut;
    }

    _getSwapAmountIn(tokenAAmount0, tokenBAmount0, tokenBAmountOut) {
        let amountOut = new BigNumber(tokenBAmountOut);
        let denominator = tokenBAmount0.minus(amountOut);
        let amountInWithFee = amountOut
            .multipliedBy(tokenAAmount0)
            .dividedBy(denominator);
        let amountIn = amountInWithFee
            .multipliedBy(this.swapFeeDenominator)
            .dividedBy(this.swapFeeDenominator.minus(this.swapFeeNumerator));
        return amountIn;
    }
};
module.exports = AMMCalculator;