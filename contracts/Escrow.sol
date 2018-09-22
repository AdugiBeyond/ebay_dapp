pragma solidity ^0.4.22;


//第三方契约，用于监督买卖双方的第三方
//这个契约每个产品都会生成一个
contract Escrow {
    uint public productId;
    address public buyer;
    address public seller;
    //仲裁人
    address public arbiter;
    uint public amount;
    //已支付
    bool public fundsDisbursed;
    //交易生效，放款
    mapping (address => bool) releaseAmount;
    uint public releaseCount;
    //交易无效，退款
    mapping (address => bool) refundAmount;
    uint public refundCount;

    event CreateEscrow(uint _productId, address _buyer, address _seller, address _arbiter);
    event UnlockAmount(uint _productId, string _operation, address _operator);
    event DisburseAmount(uint _productId, uint _amount, address _beneficiary);

    constructor(uint _productId, address _buyer, address _seller, address _arbiter) public payable {
        productId = _productId;
        buyer = _buyer;
        seller = _seller;
        arbiter = _arbiter;
        amount = msg.value;
        fundsDisbursed = false;
        emit CreateEscrow(_productId, _buyer, _seller, _arbiter);
    }

    function escrowInfo() public view returns (address, address, address, bool, uint, uint) {
        return (buyer, seller, arbiter, fundsDisbursed, releaseCount, refundCount);
    }

    function releaseAmountToSeller(address caller) public {
        require(!fundsDisbursed);
        //仅三人有权投票，且没人只能投一次票
        if ((caller == buyer || caller == seller || caller == arbiter) && releaseAmount[caller] != true) {
            releaseAmount[caller] = true;
            releaseCount += 1;
            emit UnlockAmount(productId, "release", caller);
        }

        if (releaseCount == 2) {
            fundsDisbursed = true;
            seller.transfer(amount);
            emit DisburseAmount(productId, amount, seller);
        }
    }

    function refundAmountToBuyer(address caller) public {
        require(!fundsDisbursed);
        if ((caller == buyer || caller == seller || caller == arbiter) && refundAmount[caller] != true) {
            refundAmount[caller] = true;
            refundCount += 1;
            emit UnlockAmount(productId, "refund", caller);
        }

        if (refundCount == 2) {
            fundsDisbursed = true;
            buyer.transfer(amount);
            emit DisburseAmount(productId, amount, buyer);
        }
    }
}
