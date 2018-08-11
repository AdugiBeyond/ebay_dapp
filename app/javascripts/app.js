// Import the page's CSS. Webpack will know what to do with it.
import '../stylesheets/app.css'

// Import libraries we need.
import {
    default as Web3
} from 'web3'
import {
    default as contract
} from 'truffle-contract'
import ecommerce_store_artifacts from '../../build/contracts/EcommerceStore.json'

var EcommerceStore = contract(ecommerce_store_artifacts)

const ipfsAPI = require('ipfs-api')
const ethUtil = require('ethereumjs-util')

const ipfs = ipfsAPI({
    host: 'localhost',
    port: '5001',
    protocol: 'http'
})

const offchainServer = "http://localhost:3000";
const categories = ["Art", "Books", "Cameras", "Cell Phones & Accessories", "Clothing", "Computers & Tablets", "Gift Cards & Coupons", "Musical Instruments & Gear", "Pet Supplies", "Pottery & Glass", "Sporting Goods", "Tickets", "Toys & Hobbies", "Video Games"];


window.App = {
    start: function () {
        var self = this
        EcommerceStore.setProvider(web3.currentProvider);
        renderStore();

        var reader;

        $("#product-image").change(function (event) {
            const file = event.target.files[0]
            reader = new window.FileReader()
            reader.readAsArrayBuffer(file)
        });

        $("#add-item-to-store").submit(function (event) {
            const req = $("#add-item-to-store").serialize();
            let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
            let decodedParams = {}
            Object.keys(params).forEach(function (v) {
                decodedParams[v] = decodeURIComponent(decodeURI(params[v]));
            });
            saveProduct(reader, decodedParams);
            event.preventDefault();
        });

        // This if block should be with in the window.App = {} function
        if ($("#product-details").length > 0) {
            //This is product details page
            console.log("window.location.search :", window.location.search);

            let productId = new URLSearchParams(window.location.search).get('id');
            renderProductDetails(productId);
        }

        $("#bidding").submit(function (event) {
            $("#msg").hide();
            let amount = $("#bid-amount").val();
            let sendAmount = $("#bid-send-amount").val();
            let secretText = $("#secret-text").val();
            let sealedBid = '0x' + ethUtil.sha3(web3.toWei(amount, 'ether') + secretText).toString('hex');
            let productId = $("#product-id").val();
            let userNumber = $("#bidding-user-number").val();
            console.log(sealedBid + " for " + productId + " from user: " + userNumber);
            EcommerceStore.deployed().then(function (i) {
                console.log("bidding begin...");
                //var e = i.allEvents({fromBlock: 0, toBlock: 'latest'});
                var e = i.allEvents({});
                //var e = i.BidEvent({fromBlock: 0, toBlock: 'latest'});
                //var e = i.BidEvent({});
                // e.watch(function (err, res){
                //     console.log("BidEvent :", res);
                // })
                i.bid(parseInt(productId), sealedBid, {
                    value: web3.toWei(sendAmount),
                    //from: web3.eth.accounts[userNumber],
                    from: web3.eth.accounts[0],
                    gas: 440000
                }).then( function (f) {
                        console.log("after bidding result : ", f)
                        $("#msg").html("Your bid has been successfully submitted!");
                        $("#msg").show();
                    }
                ).catch((err) => {
                    console.log("bidding:", err);
                })
            });
            event.preventDefault();
        });

        /*
        https://www.zastrin.com/courses/3/lessons/6-3
        Exercises:
        1. Upon revealing the bid, we just show a message that the bid has been revealed.
           Enhance the code to display the highest bidder info upon revealing the bid and also show a message if their bid is in the lead or if they lost the auction.
        2. Add a new section on the product details page listing all the bids that have been revealed so far and the bid amounts.
        3. Also display the total number of bids received and the total number of bids revealed.
         */
        $("#revealing").submit(function (event) {
            $("#msg").hide();
            let amount = $("#actual-amount").val();
            let secretText = $("#reveal-secret-text").val();
            let productId = $("#product-id").val();
            let userNumber = $("#reveal-user-number").val();
            console.log("revealing product id :" , productId, "userNumber :", userNumber);
            EcommerceStore.deployed().then(function (i) {
                i.revealBid(parseInt(productId), web3.toWei(amount).toString(), secretText, {
                    //from: web3.eth.accounts[userNumber],
                    from: web3.eth.accounts[0],
                    gas: 440000
                }).then(
                    function (f) {
                        $("#msg").show();
                        $("#msg").html("Your bid has been successfully revealed!");
                        //f是这个交易动作的返回值,包括hash，logs等
                        console.log("after revealing:", f)
                    }
                )
            });
            event.preventDefault();
        });

        $("#finalize-auction").submit(function (event) {
            $("#msg").hide();
            let productId = $("#product-id").val();
            let userNumber = $("#finalize-user-number").val();
            console.log("userNumber:", userNumber);
            EcommerceStore.deployed().then(function (i) {
                // var e = i.CreateEscrow({});
                // e.watch(function (err, res){
                //     console.log("finalize-auction res :", res);
                // })
                i.finalizeAuction(parseInt(productId), {
                    //from: web3.eth.accounts[userNumber],
                    from: web3.eth.accounts[0],
                    gas: 4400000
                }).then(
                    function (f) {
                        $("#msg").show();
                        $("#msg").html("The auction has been finalized and winner declared.");
                        console.log(f)
                        location.reload();
                    }
                ).catch(function (e) {
                    console.log(e);
                    $("#msg").show();
                    $("#msg").html("The auction can not be finalized by the buyer or seller, only a third party aribiter can finalize it");
                })
            });
            event.preventDefault();
        });

        // https://www.zastrin.com/courses/3/lessons/7-4
        $("#release-funds").click(function () {
            let productId = new URLSearchParams(window.location.search).get('id');
            EcommerceStore.deployed().then(function (f) {
                $("#msg").html("Your transaction has been submitted. Please wait for few seconds for the confirmation").show();
                console.log(productId);
                f.releaseAmountToSeller(productId, {
                    from: web3.eth.accounts[0],
                    gas: 440000
                }).then(function (f) {
                    console.log(f);
                    location.reload();
                }).catch(function (e) {
                    console.log(e);
                })
            });
        });

        $("#refund-funds").click(function () {
            let productId = new URLSearchParams(window.location.search).get('id');
            EcommerceStore.deployed().then(function (f) {
                $("#msg").html("Your transaction has been submitted. Please wait for few seconds for the confirmation").show();
                f.refundAmountToBuyer(productId, {
                    from: web3.eth.accounts[0],
                    gas: 440000
                }).then(function (f) {
                    console.log(f);
                    location.reload();
                }).catch(function (e) {
                    console.log(e);
                })
            });

            alert("refund the funds!");
        });

        //监听duke
        /*
        let elmo = function (me) {
            var self = me;
            EcommerceStore.deployed().then(function (i) {
                //console.log("got events : ", i.allEvents());
                var events = i.allEvents({});
                events.watch(function (error, result) {
                    console.log("In events, reslut :", result);

                    if (error) {
                        console.log(error);
                    } else {
                        for (var key in result) {
                            if (result.hasOwnProperty(key)) {
                                if (key !== "args") {
                                     //console.log(key + " : " + result[key]);
                                } else {
                                    let args = result["args"];
                                    var message = "";
                                    for (var arg in args) {

                                        if (args.hasOwnProperty(arg)) {
                                            var outcome = args[arg];
                                            if (arg === 'value') {
                                                outcome = web3.fromWei(outcome, 'ether');
                                            }
                                            message = message + " " + arg + ": " + outcome + "   ";
                                            //console.log("arg.. " + arg + ": " + outcome);
                                        }
                                    }
                                    $("#msg2").show();
                                    $("#msg2").html(message);
                                }
                            }
                        }
                    }
                })
            });
        };
        elmo(this);
        */

    }//start
}//app

window.addEventListener('load', function () {
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 !== 'undefined') {
        console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
        // Use Mist/MetaMask's provider
        window.web3 = new Web3(web3.currentProvider)
    } else {
        console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask")
        // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
        window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
    }

    App.start()
})


function renderStore() {
// https://www.zastrin.com/courses/3/lessons/8-7
  renderProducts("product-list", {});
  renderProducts("product-reveal-list", {productStatus: "reveal"});
  renderProducts("product-finalize-list", {productStatus: "finalize"});
  categories.forEach(function(value) {
    //$("#categories").append("<div>" + value + "");
    $("#categories").append("<div>" + "<a href=\"#\">" + value + "</>" + "");
  })
}

/*
//在主页面显示
function renderStore() {
    EcommerceStore.deployed().then(function (i) {
        console.log("renderStore deploy ok")

        // i.getProduct.call(1).then(function(p) {
        //     $("#product-list").append(buildProduct(p));
        // });
        // i.getProduct.call(2).then(function(p) {
        //     $("#product-list").append(buildProduct(p));
        // });
        // i.getProduct.call(3).then(function(p) {
        //     $("#product-list").append(buildProduct(p));
        // });
        // i.getProduct.call(4).then(function(p) {
        //     $("#product-list").append(buildProduct(p));
        // });
        // i.getProduct.call(5).then(function(p) {
        //     $("#product-list").append(buildProduct(p));
        // });
        // i.getProduct.call(6).then(function(p) {
        //     $("#product-list").append(buildProduct(p));
        // });
        // i.getProduct.call(7).then(function(p) {
        //     $("#product-list").append(buildProduct(p));
        // });
        // i.getProduct.call(8).then(function(p) {
        //     $("#product-list").append(buildProduct(p));
        // });
        let goober = function (id) {
            return function (p) {
                $("#product-list").append(buildProduct(p, id));
            }
        }

        for (var id = 1; id <= 6; id++) {
            let g = goober(id);
            i.getProduct.call(id).then(g);
        }

    });

    categories.forEach(function(value) {
        $("#categories").append("<div>" + value + "");
    })

}
*/
/*
function renderStore() {
 //https://www.zastrin.com/courses/3/lessons/5-4
  EcommerceStore.deployed().then(function(i) {
    i.getProduct.call(1).then(function(p) {
      $("#product-list").append(buildProduct(p));
    });
    i.getProduct.call(2).then(function(p) {
      $("#product-list").append(buildProduct(p));
    });
  });
}
*/

//用到了MongoDB，所以起不来
function renderProducts(div, filters) {
  //https://www.zastrin.com/courses/3/lessons/8-7
  $.ajax({
    url: offchainServer + "/products",
    type: 'get',
    contentType: "application/json; charset=utf-8",
    data: filters
  }).done(function(data) {
    if (data.length == 0) {
      $("#" + div).html('No products found');
    } else {
      $("#" + div).html('');
    }
    while(data.length > 0) {
      let chunks = data.splice(0, 4);
      let row = $("<div/>");
      row.addClass("row");
      chunks.forEach(function(value) {
        let node = buildProduct(value);
        row.append(node);
      })
      $("#" + div).append(row);
    }
  })
}

/*
{
  "auctionEndTime": 1520312886,
  "auctionStartTime": 1520226486,
  "blockchainId": 4,
  "category": "Cell TVs",
  "condition": 1,
  "ipfsDescHash": "QmP9XGszXbHeEKU88Evyxz1YrF4RGaCRy9a5yoDQUidf1x",
  "ipfsImageHash": "QmV4jmragpMe4ozQh8bEpb8wUqpditgr1RHwX1MZWRAsYN",
  "name": "Vizio TV",
  "price": 4000000000000000000,
  "productStatus": 0,
  "_id": "5a9cd0b64aaaaa9f2fc200d9"
}
 */

function buildProduct(product) {
    //console.log(product)
    let node = $("<div/>");
    node.addClass("col-sm-3 text-center col-margin-bottom-1");
    //node.append("<img src='https://ipfs.io/ipfs/" + product[3] + "' width='150px' />");
    //node.append("<img src='https://ipfs.io/ipfs/" + product[3] + "' width='150px' />");

    //node.append("<img src='http://localhost:8080/ipfs/" + product[3] + "' width='150px' />");
    node.append("<img src='http://localhost:8080/ipfs/" + product.ipfsImageHash+ "' width='150px' />");
    node.append("<div>" + product.name + "</div>");
    node.append("<div>" + product.category + "</div>");
    node.append("<div>" + new Date(product.auctionStartTime * 1000) + "</div>");
    node.append("<div>" + new Date(product.auctionEndTime * 1000) + "</div>");
    node.append("<div>Ether " + web3.fromWei(product.price, 'ether') + "</div>");
    node.append("<a class=\"btn btn-primary\" + href=product.html?id=" + product.blockchainId + ">Details</a>");
    //node.append("<a href=product.html?id=" + id + ">Details</a>");
    return node;
}

function buildProductOld(product) {
    console.log(product)
    let node = $("<div/>");
    node.addClass("col-sm-3 text-center col-margin-bottom-1");
    //node.append("<img src='https://ipfs.io/ipfs/" + product[3] + "' width='150px' />");
    node.append("<img src='http://localhost:8080/ipfs/" + product[3] + "' width='150px' />");
    node.append("<div>" + product[1] + "</div>");
    node.append("<div>" + product[2] + "</div>");
    node.append("<div>" + product[5] + "</div>");
    node.append("<div>" + product[6] + "</div>");
    node.append("<div>Ether " + product[7] + "</div>");
    return node;
}

function saveProduct(reader, decodedParams) {
    let imageId, descId;
    saveImageOnIpfs(reader).then(function (id) {
        imageId = id;
        saveTextBlobOnIpfs(decodedParams["product-description"]).then(function (id) {
            descId = id;
            saveProductToBlockchain(decodedParams, imageId, descId);
        })
    })
}




function saveImageOnIpfs(reader) {
    return new Promise(function (resolve, reject) {
        const buffer = Buffer.from(reader.result);
        ipfs.add(buffer)
            .then((response) => {
                console.log(response)
                resolve(response[0].hash);
            }).catch((err) => {
                console.error(err)
                reject(err);
            })
    })
}

function saveTextBlobOnIpfs(blob) {
    return new Promise(function (resolve, reject) {
        const descBuffer = Buffer.from(blob, 'utf-8');
        ipfs.add(descBuffer)
            .then((response) => {
                console.log(response)
                resolve(response[0].hash);
            }).catch((err) => {
                console.error(err)
                reject(err);
            })
    })
}

function saveProductToBlockchain(params, imageId, descId) {
    console.log(params);
    let auctionStartTime = Date.parse(params["product-auction-start"]) / 1000;
    let auctionEndTime = auctionStartTime + parseInt(params["product-auction-end"]) * 24 * 60 * 60

    EcommerceStore.deployed().then(function (i) {
        i.addProductToStore(params["product-name"], params["product-category"], imageId, descId, auctionStartTime,
            auctionEndTime, web3.toWei(params["product-price"], 'ether'), parseInt(params["product-condition"]), {
                from: web3.eth.accounts[0],
                gas: 440000
            }).then(function (f) {
            console.log(f);
            $("#msg").show();
            $("#msg").html("Your product was successfully added to your store!");
        })
    });
}


/*
function renderProductDetails(productId) {
 // https://www.zastrin.com/courses/3/lessons/6-2
  EcommerceStore.deployed().then(function(i) {
    i.getProduct.call(productId).then(function(p) {
      console.log(p);
      let content = "";
      //git版本一开始也用这种方式，后面随着代码的修改， 就使用stream.on方式了，我还没研究透彻
      ipfs.cat(p[4]).then(function(file) {
        content = file.toString();
        $("#product-desc").append("<div>" + content+ "</div>");
      });

      $("#product-image").append("<img src='https://ipfs.io/ipfs/" + p[3] + "' width='250px' />");
      $("#product-price").html(displayPrice(p[7]));
      $("#product-name").html(p[1].name);
      $("#product-auction-end").html(displayEndHours(p[6]));
      $("#product-id").val(p[0]);
      $("#revealing, #bidding").hide();
      let currentTime = getCurrentTimeInSeconds();
      if(currentTime < p[6]) {
        $("#bidding").show();
      } else if (currentTime - (60) < p[6]) {
        $("#revealing").show();
      }
    })
  })
}
*/

/*
Exercise
-- https://www.zastrin.com/courses/3/lessons/8-7
- Update the code for product details page so instead of querying the blockchain,
you query the MongoDB for a product with specific ID and render the page.
*/
//duke
function renderProductDetails(productId) {
    // https://www.zastrin.com/courses/3/lessons/7-3
    EcommerceStore.deployed().then(function (i) {
        i.getProduct.call(productId).then(function (p) {
            //console.log("renderProductDetails: ", p);
            let content = "";

            //此处有两种显示方式， 还不清楚到底什么时候用哪一种，因为有孔壹的版本要用下面的，git上的要用上面的
            //这个可能是和代码处理逻辑有关，或者版本？不清楚
            ipfs.cat(p[4]).then(function (stream) {
                stream.on('data', function (chunk) {
                    // do stuff with this chunk of data
                    content += chunk.toString();
                    $("#product-desc").append("<div>" + content + "</div>");
                })

                /*
                content = stream.toString()
                console.log("content :", content);
                $("#product-desc").append("<div>" + content + "</div>");
                */
            });

            //$("#product-image").append("<img src='https://ipfs.io/ipfs/" + p[3] + "' width='250px' />");
            $("#product-image").append("<img src='http://localhost:8080/ipfs/" + p[3] + "' width='250px' />");
            $("#product-price").html(displayPrice(p[7]));
            $("#product-name").html(p[1].name);
            $("#product-auction-end").html(displayEndHours(p[6]));
            $("#product-id").val(p[0]);
            $("#revealing, #bidding, #finalize-auction, #escrow-info").hide();
            //$("#revealing, #bidding, #finalize-auction").hide();
            let currentTime = getCurrentTimeInSeconds();
            console.log("parseInt p[8]:", parseInt(p[8]));
            //测试，还是没能显示
            // $("#buyer").html('Buyer: ' + 10);
            // $("#seller").html('Seller: ' + 20);
            // $("#arbiter").html('Arbiter: ' + 30);

            //status 状态0：open 1：sold 2：unsold
            if (parseInt(p[8]) == 1) {
                console.log("in sold logic");
                // https://www.zastrin.com/courses/3/lessons/7-4
                //$("#product-status").html("Product sold");
                EcommerceStore.deployed().then(function (i) {
                    $("#escrow-info").show();
                    i.highestBidderInfo.call(productId).then(function (f) {
                        //可以一个人进行竞拍，第二高的价格是出师价格
                        //if (f[2].toLocaleString() == '0') {
                        if (f[2].toLocaleString() == '10') {
                            $("#product-status").html("Auction has ended. No bids were revealed");
                        } else {
                            //现在下面只允许显示一行， 我不知道为什么
                            // $("#product-status").html("Auction has ended. Product sold to " + f[0] + " for " + displayPrice(f[2]) +
                            //     "The money is in the escrow. Two of the three participants (Buyer, Seller and Arbiter) have to " +
                            //     "either release the funds to seller or refund the money to the buyer");
                        }
                    })
                    //在EcommerceStore中封装了一层
                    i.escrowInfo.call(productId).then(function (f) {
                        //为什么显示buyer为00000000000000
                        console.log("in i.escrowInfo:", f, "productId:", productId);
                        $("#buyer").html('Buyer: ' + f[0]);
                        $("#seller").html('Seller: ' + f[1]);
                        $("#arbiter").html('Arbiter: ' + f[2]);
                        if (f[3] == true) {
                            $("#release-count").html("Amount from the escrow has been released");
                        } else {
                            $("#release-count").html(f[4] + " of 3 participants have agreed to release funds");
                            $("#refund-count").html(f[5] + " of 3 participants have agreed to refund the buyer");
                        }
                    })
                })
            } else if (parseInt(p[8]) == 2) {
                //
                $("#product-status").html("Product was not sold");
            } else if (currentTime < parseInt(p[6])) {
                //第一阶段, 竞标界面
                $("#bidding").show();
            } else if (currentTime < (parseInt(p[6]) + 20)) {//duke
                //第二阶段, 揭标时间控制 120s
                $("#revealing").show();
            } else {
                //第三阶段, 揭标结束，显示仲裁界面
                $("#finalize-auction").show();
            }
        })
    })
}


function getCurrentTimeInSeconds() {
    return Math.round(new Date() / 1000);
}

function displayPrice(amt) {
    return 'Ξ' + web3.fromWei(amt, 'ether');
}


function displayEndHours(seconds) {
    let current_time = getCurrentTimeInSeconds()
    let remaining_seconds = seconds - current_time;

    if (remaining_seconds <= 0) {
        return "Auction has ended";
    }

    let days = Math.trunc(remaining_seconds / (24 * 60 * 60));

    remaining_seconds -= days * 24 * 60 * 60
    let hours = Math.trunc(remaining_seconds / (60 * 60));

    remaining_seconds -= hours * 60 * 60

    let minutes = Math.trunc(remaining_seconds / 60);

    if (days > 0) {
        return "Auction ends in " + days + " days, " + hours + ", hours, " + minutes + " minutes";
    } else if (hours > 0) {
        return "Auction ends in " + hours + " hours, " + minutes + " minutes ";
    } else if (minutes > 0) {
        return "Auction ends in " + minutes + " minutes ";
    } else {
        return "Auction ends in " + remaining_seconds + " seconds";
    }
}