const apiCall = require('./api_call');

async function checkAllPublished(rowsArray, startingNumberOfEtsyActiveListings, shop_id, access_token, refresh_token) {
    // FIRST CHECK THAT ALL PRODUCTS HAVE BEEN PUBLISHED
    let totalProductTypesWithYes = 0;
    for (const row of rowsArray) {
        totalProductTypesWithYes += row.ProductTypesWithYes.length;
    }
    console.log(`Starting number of active Etsy listings: ${startingNumberOfEtsyActiveListings}`);
    console.log(`Total number of products published by Printify: ${totalProductTypesWithYes}`);

    // Now keep checking the number of active Etsy listings until it is equal to the number of products published by Printify
    let totalAttempts = 0;
    const etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings?state=active`
    let newActiveEtsyListingsCount = 0;
    let targetNumberofActiveListings = startingNumberOfEtsyActiveListings + totalProductTypesWithYes;
    console.log(`Target number of active Etsy listings: ${targetNumberofActiveListings}`);
    do {
        try {
            const etsyListingsResult = await apiCall('etsy', etsyApiUrl, 'GET', null, 3, 5, access_token, refresh_token)
            newActiveEtsyListingsCount = etsyListingsResult.count;
            console.log(`Current check shows ${newActiveEtsyListingsCount} active Etsy listings`);
        } catch (error) {
            throw error
        }

        if (newActiveEtsyListingsCount < targetNumberofActiveListings) {
            console.log('Waiting 20 seconds...');
            await new Promise(resolve => setTimeout(resolve, 20000)); // wait for 20 seconds before checking again
        }
        totalAttempts++;
        if (totalAttempts > 90) {
            throw new Error('Exceeded the set time limit for checking whether all products have been published');
        }
    } while (newActiveEtsyListingsCount < targetNumberofActiveListings);

    console.log('All Printify products are now active on Etsy.');
    return true;
}   

module.exports = checkAllPublished;
