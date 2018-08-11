Eutil = require('ethereumjs-util');
EcommerceStore = artifacts.require("./EcommerceStore.sol");
module.exports = function(callback) {
 current_time = Math.round(new Date() / 1000);
 amt_1 = web3.toWei(1, 'ether');
 EcommerceStore.deployed().then(function(i) {i.addProductToStore('天梭男', '手表', 'QmU5EKkgNqredTV1sfE5tq1QGxxn3dV7KyQK7Ld3Li919X', 'QmQX7QeDspxdoSNf3Ntkio6oQfDQJ68tmHY4kBPjLKhpPH', current_time, current_time + 40, 2*amt_1, 0).then(function(f) {console.log(f)})});
 EcommerceStore.deployed().then(function(i) {i.addProductToStore('天梭男', '手表', 'QmQWmPVaKCK5uJUEcKy9UytWHenupmWfgLFC1uZTtvcV9f', 'QmQX7QeDspxdoSNf3Ntkio6oQfDQJ68tmHY4kBPjLKhpPH', current_time, current_time + 400, 3*amt_1, 1).then(function(f) {console.log(f)})});
 EcommerceStore.deployed().then(function(i) {i.addProductToStore('天梭女', '手表', 'QmVxFZqGDeoB73bZohX2dXATDPFzg2ZhxjJGP44DfhmSoM', 'QmSmA522DhReYwQk2PJMQixDdpPZBVThGW9nxDwxhrpjb8', current_time, current_time + 14, amt_1, 0).then(function(f) {console.log(f)})}); 
 EcommerceStore.deployed().then(function(i) {i.addProductToStore('天梭男', '手表', 'QmaTzxp2aDbdF4KknfeZGpxCVJ89kHSzwLZkh5YfDg4CWu', 'QmQX7QeDspxdoSNf3Ntkio6oQfDQJ68tmHY4kBPjLKhpPH', current_time, current_time + 86400, 4*amt_1, 1).then(function(f) {console.log(f)})});
 EcommerceStore.deployed().then(function(i) {i.addProductToStore('天梭男', '手表', 'QmaTzxp2aDbdF4KknfeZGpxCVJ89kHSzwLZkh5YfDg4CWu', 'QmQX7QeDspxdoSNf3Ntkio6oQfDQJ68tmHY4kBPjLKhpPH', current_time, current_time + 86400, 5*amt_1, 1).then(function(f) {console.log(f)})});
 EcommerceStore.deployed().then(function(i) {i.addProductToStore('天梭女', '手表', 'QmTWyWdG1PTA9jQdEBrLJDYNCWQ49USQoq4f1ts8cc1Tbn', 'QmSmA522DhReYwQk2PJMQixDdpPZBVThGW9nxDwxhrpjb8', current_time, current_time + 86400 + 86400 + 86400, 5*amt_1, 1).then(function(f) {console.log(f)})});
 EcommerceStore.deployed().then(function(i) {i.productIndex.call().then(function(f){console.log(f)})});
}
