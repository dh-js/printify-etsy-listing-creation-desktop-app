const apiCall = require('./api_call');

async function getAllEtsyListings(shop_id, access_token, refresh_token) {

    let stayInLoop = true;
    let allEtsyListings = [];
    const limit = 10;
    let offset = 0;
    while (stayInLoop) {

        let etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings?state=active&limit=${limit}&offset=${offset}`;
        
        const listingsData = await apiCall('etsy', etsyApiUrl, 'GET', null, 3, 5, access_token, refresh_token);

        allEtsyListings.push(...listingsData.results);

        let listingCount = listingsData.count;
        offset += 10;
        if (offset >= listingCount) {
            stayInLoop = false;
        };
    }

    return allEtsyListings;

}

module.exports = getAllEtsyListings;

