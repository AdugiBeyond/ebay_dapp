pragma solidity ^0.4.22;
import "contracts/Escrow.sol";


contract EcommerceStore {
    enum ProductStatus {Open, Sold, Unsold}
    enum ProductCondition {New, Used}

    uint public productIndex;

    //产品id=》仲裁合约
    mapping (uint => address) productEscrow;

    /*
       We keep track of who inserted the product through the mapping. The key is the merchant's account address
       and the value is the mapping of productIndex to the Product struct. For example, let's say there are no
       products in our store. A user with account address (0x64fcba11d3dce1e3f781e22ec2b61001d2c652e5) adds
       an iphone to the store to sell. Our stores mapping would now have:

         0x64fcba11d3dce1e3f781e22ec2b61001d2c652e5 => {1 => "struct with iphone details"}

           stores[msg.sender][productIndex] = product;

    */
    //所有产品索引结构，key为卖家地址，mapping的key为产品id，value为产品
    mapping(address => mapping(uint => Product)) stores;

    /*
      mapping used to keep track of which products are in which merchant's store.
      productIdInStore[productIndex] = msg.sender;
    */
    mapping(uint => address) productIdInStore;

    struct Bid {
        address bidder;
        uint productId;
        uint value;
        bool revealed;
    }

    struct Product {
        uint id;
        string name;
        string category;
        string imageLink;
        string descLink;
        uint auctionStartTime;
        uint auctionEndTime;
        uint startPrice;
        address highestBidder;
        uint highestBid;
        uint secondHighestBid;
        uint totalBids;
        ProductStatus status;
        ProductCondition condition;

        /*
        To easily lookup which user bid and what they bid, let's add a mapping to the
        product struct mapping (address => mapping (bytes32 => Bid)) bids;. The key is
        the address of the bidder and value is the mapping of the hashed bid string to
        the bid struct.
        */
        //每一个产品可以由多方进行竞标，key是竞标人，
        mapping (address => mapping (bytes32 => Bid)) bids;
    }

    constructor() public {
        productIndex = 0;
    }

    // https://www.zastrin.com/courses/3/lessons/8-6
    event NewProduct(uint _productId, string _name, string _category, string _imageLink, string _descLink, uint _auctionStartTime, uint _auctionEndTime, uint _startPrice, uint _productCondition);
    event BidEvent(address _bider, uint _productId);
    event FinalizeAuctionEvent(ProductStatus _status, address buyer, uint refund);

    function addProductToStore(string _name, string _category, string _imageLink, string _descLink, uint _auctionStartTime,
        uint _auctionEndTime, uint _startPrice, uint _productCondition) public {
        require(_auctionStartTime < _auctionEndTime);
        productIndex += 1;
        Product memory product = Product(productIndex, _name, _category, _imageLink, _descLink, _auctionStartTime, _auctionEndTime,
            _startPrice, 0, 0, 0, 0, ProductStatus.Open, ProductCondition(_productCondition));
        //维护产品归属信息
        stores[msg.sender][productIndex] = product;
        productIdInStore[productIndex] = msg.sender;
        NewProduct(productIndex, _name, _category, _imageLink, _descLink, _auctionStartTime, _auctionEndTime, _startPrice, _productCondition);
    }

    function getProduct(uint _productId) public view returns (uint, string, string, string, string, uint, uint, uint, ProductStatus, ProductCondition) {
        
        //  https://solidity.readthedocs.io/en/latest/frequently-asked-questions.html#what-is-the-memory-keyword-what-does-it-do
        //   memory keyword is to tell the EVM that this object is only used as a temporary variable. It will be cleared from memory
        //   as soon as this function completes execution
        
        //有点绕，其实就是根据id找到卖家，再根据id找到产品,只不过是访问了两个map
        Product memory product = stores[productIdInStore[_productId]][_productId];
        //果然必须返回元组，无法直接返回数据结构
        return (product.id, product.name, product.category, product.imageLink, product.descLink, product.auctionStartTime,
        product.auctionEndTime, product.startPrice, product.status, product.condition);
    }
    // function getProduct(uint _productId) view public returns (Product) {
    // /*
    //   https://solidity.readthedocs.io/en/latest/frequently-asked-questions.html#what-is-the-memory-keyword-what-does-it-do
    //    memory keyword is to tell the EVM that this object is only used as a temporary variable. It will be cleared from memory
    //    as soon as this function completes execution
    // */
    //     Product memory product = stores[productIdInStore[_productId]][_productId];
    //     return product;
    // }

    //这个_bid 类型是byte32，莫非是前台调用的时候自己运算成byte32传递过来？？
    function bid(uint _productId, bytes32 _bid) public payable returns (bool) {
        Product storage product = stores[productIdInStore[_productId]][_productId];
        require(now >= product.auctionStartTime);
        require(now <= product.auctionEndTime);
        require(msg.value > product.startPrice);
        //这个产品我们有没竞标过，每个产品每人只能竞标一次
        require(product.bids[msg.sender][_bid].bidder == 0);
        //竞标的时候，钱已经打过去了，在揭标的时候再返还，所以一定要记得揭标，否则就白白的损失掉了
        product.bids[msg.sender][_bid] = Bid(msg.sender, _productId, msg.value, false);
        product.totalBids += 1;
        emit BidEvent(msg.sender, _productId);
        return true;
    }

    event RevealBidEvent(string info, address higheseBidder, uint refund, uint amount, bool isRevealed);
    //当只有一个人参与时，返回的buyer居然是000000000000，这是为什么？？

    function revealBid(uint _productId, string _amount, string _secret) public payable {
        Product storage product = stores[productIdInStore[_productId]][_productId];
        require(now > product.auctionEndTime);
        bytes32 sealedBid = sha3(_amount, _secret);

        Bid memory bidInfo = product.bids[msg.sender][sealedBid];
        emit RevealBidEvent("揭标人信息： ", bidInfo.bidder, bidInfo.productId, bidInfo.value, bidInfo.revealed);

        //必须是竞标过的人才有资格揭标
        require(bidInfo.bidder > 0);
        require(bidInfo.revealed == false);

        uint refund;

        uint amount = stringToUint(_amount);

        //我特么真是傻逼了，这个揭标数值一直填错了，导致总是在这个if分支跳出去。
        //应该填bid amount，但是我一直填的是send amount，send amount总是大于bid amount的（好像逻辑不太对,再研究）
        if (bidInfo.value < amount) {
            // They didn't send enough amount, they lost
            refund = bidInfo.value;
        } else {
            // If first to reveal set as highest bidder
            //第一个揭标的人将被设置为最高竞标，包括bider和bid金额
            if (address(product.highestBidder) == 0) {
                product.highestBidder = msg.sender;
                product.highestBid = amount;
                product.secondHighestBid = product.startPrice;
                refund = bidInfo.value - amount;
            } else {
                //自己之前报过一个价格，现在揭标的时候再次输入一个新的价格，
                //如果揭标的价格小于当初报的价格，那么直接竞争失败。
                //在揭标过程中就开始逐渐淘汰失败者，并将当初锁定的钱返回。
                //揭标的价格一定小于自己当初的报价，否则无法揭标，当自己成为当前最高的时候，也会将当初报价的差价返回给自己
                //如果非第一个揭标的人的金额大于所有人的金额，那么他将成为最高竞标者，更新相关信息
                if (amount > product.highestBid) {
                    product.secondHighestBid = product.highestBid;
                    //将原来最高竞标者的钱原路返回
                    product.highestBidder.transfer(product.highestBid);
                    product.highestBidder = msg.sender;
                    product.highestBid = amount;
                    refund = bidInfo.value - amount;
                } else if (amount > product.secondHighestBid) {
                    //如果这个揭标人成为第二高的竞标人，那么更新第二高的信息
                    product.secondHighestBid = amount;
                    refund = amount;
                } else {
                    //没有达到第一或第二的价格，原路返回
                    refund = amount;
                }
            }
            if (refund > 0) {
                msg.sender.transfer(refund);
                product.bids[msg.sender][sealedBid].revealed = true;
            }
        }

        emit RevealBidEvent("揭标结束：", product.highestBidder, refund, amount, bidInfo.revealed);
    }

    function highestBidderInfo(uint _productId) public view returns (address, uint, uint) {
        Product memory product = stores[productIdInStore[_productId]][_productId];
        return (product.highestBidder, product.highestBid, product.secondHighestBid);
    }

    function totalBids(uint _productId) public view returns (uint) {
        Product memory product = stores[productIdInStore[_productId]][_productId];
        return product.totalBids;
    }

    function finalizeAuction(uint _productId) public {
        Product storage product = stores[productIdInStore[_productId]][_productId];
        // 48 hours to reveal the bid
        require(now > product.auctionEndTime);
        require(product.status == ProductStatus.Open);
        //require(product.highestBidder != msg.sender);
        //require(productIdInStore[_productId] != msg.sender);

        if (product.totalBids == 0) {
            product.status = ProductStatus.Unsold;
        } else {
            //竞拍成功
            // Whoever finalizes the auction is the arbiter
            //生成一个合约，合约是个地址，传入四个参数，value字段是msg.value
                                                                        //(productId, buyer, seller, arbiter)
            //由当前合约自动向这个Escrow转钱，测试时重点关注一下//duke
            //转钱金额为第二高价格
            Escrow escrow = (new Escrow).value(product.secondHighestBid)(_productId, product.highestBidder, productIdInStore[_productId], msg.sender);
            //每个产品都对应一个escrow，便于使用产品id对其进行访问操作
            productEscrow[_productId] = address(escrow);
            product.status = ProductStatus.Sold;
            // The bidder only pays the amount equivalent to second highest bidder
            // Refund the difference
            //返回第一与第二的差价给竞争胜出者
            uint refund = product.highestBid - product.secondHighestBid;
            product.highestBidder.transfer(refund);
            emit FinalizeAuctionEvent(product.status, product.highestBidder, refund);
        }
    }

    function escrowAddressForProduct(uint _productId) public view returns (address) {
        return productEscrow[_productId];
    }

    function escrowInfo(uint _productId) public view returns (address, address, address, bool, uint, uint) {
        return Escrow(productEscrow[_productId]).escrowInfo();
    }

    function releaseAmountToSeller(uint _productId) public {
        Escrow(productEscrow[_productId]).releaseAmountToSeller(msg.sender);
    }

    function refundAmountToBuyer(uint _productId) public {
        Escrow(productEscrow[_productId]).refundAmountToBuyer(msg.sender);
    }

    function stringToUint(string s) private pure returns (uint) {
        bytes memory b = bytes(s);
        uint result = 0;
        for (uint i = 0; i < b.length; i++) {
            if (b[i] >= 48 && b[i] <= 57) {
                result = result * 10 + (uint(b[i]) - 48);
            }
        }
        return result;
    }



}
