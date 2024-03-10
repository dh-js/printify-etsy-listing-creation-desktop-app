async function updateEtsyListings(productType, row, allEtsyListings, shop_id, access_token, refresh_token) {
    
    console.log(`----Updating ${productType}`);

    const productTitle = row[`${productType} Product Title`];

    // First find the matching Etsy listing based on matching the title
    let etsyListingId;
    try {
        etsyListingId = allEtsyListings.find(listing => listing.title === productTitle).listing_id;
    } catch (error) {
        throw new Error(`Couldn't find published Etsy listing for ${productTitle}`);
    }

    console.log(`Found Etsy listing ID: ${etsyListingId}`);

    // Now update the listing with the info from the row
    
}

module.exports = updateEtsyListings;