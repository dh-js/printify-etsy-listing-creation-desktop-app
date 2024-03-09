const apiCall = require('./api_call');

async function publishListingsPrintify(rowsArray) {

    let errorsArray = [];

    // Now for each listing, publish to Etsy store
    for (const row of rowsArray) {
        let updatedProductTypesWithYes = []; // To store successfully published products
        for (const product of row.ProductTypesWithYes) {

            const printifyListingId = row[`${product} Printify Listing ID`];
            const printifyApiUrl = `https://api.printify.com/v1/shops/${process.env.PRINTIFY_SHOP_ID}/products/${printifyListingId}/publish.json`;
            let publishObject = {
                "title": true,
                "description": true,
                "images": false,
                "variants": true,
                "tags": false,
                "keyFeatures": true,
                "shipping_template": true
            }
            const publishResult = await apiCall('printify', printifyApiUrl, 'POST', publishObject, 3, 10);
            console.log(publishResult);
            if (Object.keys(publishResult).length === 0) {
                // If publishResult is an empty object, indicating success, keep the product
                updatedProductTypesWithYes.push(product);
            } else {
                // If there's an error, add the product and its row to the errorsArray
                errorsArray.push({ row, product, error: publishResult });
            }
            // Wait 10 seconds to avoid hitting the publishing rate limit
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        // Update the row's ProductTypesWithYes to only include successfully published products
        row.ProductTypesWithYes = updatedProductTypesWithYes;
    }

    return {
        rowsArray,
        errorsArray
    };

}

module.exports = publishListingsPrintify;