const chalk = require('chalk');
const apiCall = require('./api_call');

async function checkAllPublished(startingNumberOfEtsyActiveListings, numberOfPublishedProducts, shop_id, access_token, refresh_token) {

    // Now keep checking the number of active Etsy listings until it is equal to the number of products published by Printify
    let totalAttempts = 0;
    const etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings?state=active`
    let newActiveEtsyListingsCount = 0;
    let targetNumberofActiveListings = startingNumberOfEtsyActiveListings + numberOfPublishedProducts;
    console.log(`Target number of active Etsy listings: ${targetNumberofActiveListings}`);
    console.log(`Automation will wait indefinitely for all products to appear before moving on`)
    do {
        try {
            const etsyListingsResult = await apiCall('etsy', etsyApiUrl, 'GET', null, 3, 5, access_token, refresh_token)
            newActiveEtsyListingsCount = etsyListingsResult.count;
            console.log(`Current check shows ${newActiveEtsyListingsCount} active Etsy listings`);
        } catch (error) {
            throw error
        }

        if (newActiveEtsyListingsCount < targetNumberofActiveListings) {
            console.log('Waiting 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000)); // wait for 60 seconds before checking again
        }
        //totalAttempts++;
        // if (totalAttempts > 30) {
        //     throw new Error('Exceeded the set time limit for checking whether all products have been published');
        // }
    } while (newActiveEtsyListingsCount < targetNumberofActiveListings);

    console.log(chalk.green('All Printify products are now active on Etsy.'));
    return true;
}   

module.exports = checkAllPublished;
