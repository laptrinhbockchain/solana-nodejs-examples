const BigNumber = require('bignumber.js');

// Class TokenAmount
class TokenAmount {
    constructor(wei, decimals, isWei=true) {
        this.decimals = decimals;
        this._decimals = new BigNumber(10).exponentiatedBy(decimals);

        if (isWei) {
            this.wei = new BigNumber(wei);
        } else {
            this.wei = new BigNumber(wei).multipliedBy(this._decimals);
        }
    }

    toEther() {
        return this.wei.dividedBy(this._decimals)
    }

    toWei() {
        return this.wei
    }

    format() {
        const vaule = this.wei.dividedBy(this._decimals)
        return vaule.toFormat(vaule.isInteger() ? 0 : this.decimals)
    }

    fixed() {
        return this.wei.dividedBy(this._decimals).toFixed(this.decimals)
    }

    isNullOrZero() {
        return this.wei.isNaN() || this.wei.isZero()
    }
};
module.exports = TokenAmount;