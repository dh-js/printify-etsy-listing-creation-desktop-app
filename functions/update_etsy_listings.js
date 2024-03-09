async function updateEtsyListings(productType, row, allEtsyListings, shop_id, access_token, refresh_token) {

    console.log(`Updating Etsy listing for ${row[`${productType} Product Title`]} in row: ${JSON.stringify(row)}`);
    const errorsArray = [];
    
}

module.exports = updateEtsyListings;