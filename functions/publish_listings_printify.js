const chalk = require('chalk');
const apiCall = require('./api_call');

async function publishListingsPrintify(rowsArray) {

    let errorsArray = [];
    let rowCounter = 1;
    let howManyProductsPublished = 0

    // Now for each listing, publish to Etsy store
    for (const row of rowsArray) {
        rowCounter++
        if (!row.ProductsPublishedToPrintify) {
            row.ProductsPublishedToPrintify = [];
        }
        for (const product of row.ProductTypesWithYes) {

            if (!row.ProductsPublishedToPrintify.includes(product)) {

                console.log(`Publishing row ${rowCounter}, ${product} to Etsy`);

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
                try {
                    const publishResult = await apiCall('printify', printifyApiUrl, 'POST', publishObject, 3, 10);
                    // If there's an error, add the product and its row to the errorsArray
                    // If the response is an empty object this means success
                    if (Object.keys(publishResult).length !== 0) {
                        errorsArray.push(`Row ${rowCounter}, ${product} publish error: ${JSON.stringify(publishResult)}`);
                    } else {
                        row.ProductsPublishedToPrintify.push(product);
                        console.log(chalk.green(`Row ${rowCounter}, published ${product} to Etsy`));
                        howManyProductsPublished++;
                    }
                } catch (err) {
                    console.log(chalk.red(`API error when publishing row ${rowCounter}, ${product} to Etsy:`, err));
                    errorsArray.push(`API error when publishing to Etsy: Row ${rowCounter}, ${product}, Error: ${err}`);
                }
                
                // Wait 10 seconds to avoid hitting the publishing rate limit
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                console.log(`Row ${rowCounter}, ${product} already published to Etsy, skipping...`);
            }
        }

    }

    return {
        rowsArray,
        errorsArray,
        howManyProductsPublished
    };

}

module.exports = publishListingsPrintify;