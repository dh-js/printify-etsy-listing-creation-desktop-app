const chalk = require('chalk');
const apiCall = require('./api_call');

async function updateEtsyListings(productType, row, allEtsyListings, shop_id, access_token, refresh_token, etsyRowCounter) {

    // If listing ID can't be found then error is thrown which is then handled in main.js
    // If there is a different issue (that doesnt impact other sections running) then compile the errors in
    // errorsArray then return them at the end and it will be handled in main.js
    let errorsArray = [];
    let etsyApiUrl;
    
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
    let tags = row['Sweatshirt Tags'].split(',').map(tag => tag.trim());

    etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyListingId}`;

    let tagObject = {
        tags: tags
    };

    try {
        const updateTagsResult = await apiCall('etsy', etsyApiUrl, 'PATCH', tagObject, 3, 5, access_token, refresh_token);
        // If apiCall does not throw an error, it means the update was successful.
        console.log(chalk.green`Successfully updated tags for row ${etsyRowCounter}: ${productTitle}`);
    } catch (error) {
        console.log(chalk.red(`Error updating tags for row ${etsyRowCounter}: ${productTitle}.`));
        errorsArray.push(`Error updating tags for row ${etsyRowCounter}: ${productTitle}.`);
    }

    return {
        errorsArray
    };
}

module.exports = updateEtsyListings;