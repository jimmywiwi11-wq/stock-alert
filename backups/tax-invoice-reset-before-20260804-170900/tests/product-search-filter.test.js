const assert = require('assert');

global.CMSProductAdapter = {
  sharedProducts(){
    return [
      { productCode: 'PM00001', productName: 'ABC Pipe', unit: 'piece', salePrice: 10 },
      { productCode: 'PM00002', productName: 'Cement Bag', unit: 'bag', salePrice: 120 },
      { productCode: 'PM00003', productName: 'Steel Bar', unit: 'bar', salePrice: 90 }
    ];
  }
};

const search = require('../modules/invoice-request/invoice-request-product-search.js');

assert.deepStrictEqual(search.searchProducts('', 10), []);
assert.deepStrictEqual(search.searchProducts('ABC', 10).map(row => row.productCode), ['PM00001']);
assert.deepStrictEqual(search.searchProducts('PM00002', 10).map(row => row.productName), ['Cement Bag']);
assert.deepStrictEqual(search.searchProducts('bag', 10).map(row => row.productCode), ['PM00002']);
assert.deepStrictEqual(search.searchProducts('NO_MATCH', 10), []);

console.log('product search filter checks passed');
