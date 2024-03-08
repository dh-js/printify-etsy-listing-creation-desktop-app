const express = require('express');
const router = express.Router();
const path = require('path');

const initialCsvProcessing = require('./functions/initial_csv_processing');
const printifyApiCall = require('./functions/printify_api_call');
const uploadGraphicsPrintify = require('./functions/upload_graphics_printify');
const uploadProductsPrintify = require('./functions/upload_products_printify');


router.post('/', async (req, res) => {
    const {access_token, refresh_token, shop_id, first_name, type_of_run} = req.body;

    let printifyApiUrl;
    
    const initialCsvProcessingResult = await initialCsvProcessing();

    // Access the global ngrok URL
    const ngrokUrl = global.ngrokUrl;
    //console.log(`Accessing ngrok URL in main.js: ${ngrokUrl}`);

    //console.log(initialCsvProcessingResult);

    if (initialCsvProcessingResult.csvErrorArray.length > 0) {
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            csvErrors: initialCsvProcessingResult.csvErrorArray
        });
        return;
    }

    // This section is for during development - to get example product info from Printify
    // printifyApiUrl = `https://api.printify.com/v1/shops/${process.env.PRINTIFY_SHOP_ID}/products.json/?page=1`
    // const allProductsData = await printifyApiCall(printifyApiUrl, 'GET');
    // const simplifiedVariants = allProductsData.data[0].variants.map(variant => ({
    //     id: variant.id,
    //     title: variant.title
    // }));
    // res.send(`<pre>${JSON.stringify(simplifiedVariants, null, 2)}</pre>`);
    // return;
    //------End of dev section

    // printifyApiUrl = `https://api.printify.com//v1/shops.json`
    // const shopData = await printifyApiCall(printifyApiUrl, 'GET');
    // console.log(shopData);
    // res.send(`<pre>${JSON.stringify(shopData, null, 2)}</pre>`);
    // return;

    //const rowsArray = initialCsvProcessingResult.newRowsArray;

    const uploadGraphicsPrintifyResult = await uploadGraphicsPrintify(initialCsvProcessingResult.newRowsArray);

    if (uploadGraphicsPrintifyResult.errorsArray.length > 0) {
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            csvErrors: uploadGraphicsPrintifyResult.errorsArray
        });
        return;
    }

    //console.log(rowsArray);

    const uploadProductsPrintifyResult = await uploadProductsPrintify(uploadGraphicsPrintifyResult.rowsArray);

    if (uploadProductsPrintifyResult.errorsArray.length > 0) {
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            csvErrors: uploadProductsPrintifyResult.errorsArray
        });
        return;
    }

    //res.send(`<pre>${JSON.stringify(uploadProductsPrintifyResult.rowsArray, null, 2)}</pre>`);

    const rowsArrayAfterPrintify = uploadProductsPrintifyResult.rowsArray;
    let publishingErrorsArray = [];

    // Now for each listing, publish to Etsy store
    for (const row of rowsArrayAfterPrintify) {
        let updatedProductTypesWithYes = []; // To store successfully published products
        for (const product of row.ProductTypesWithYes) {

            const printifyListingId = row[`${product} Printify Listing ID`];
            printifyApiUrl = `https://api.printify.com/v1/shops/${process.env.PRINTIFY_SHOP_ID}/products/${printifyListingId}/publish.json`;
            let publishObject = {
                "title": true,
                "description": true,
                "images": false,
                "variants": true,
                "tags": false,
                "keyFeatures": true,
                "shipping_template": true
            }
            const publishResult = await printifyApiCall(printifyApiUrl, 'POST', publishObject, 3, 10);
            console.log(publishResult);
            if (Object.keys(publishResult).length === 0) {
                // If publishResult is an empty object, indicating success, keep the product
                updatedProductTypesWithYes.push(product);
            } else {
                // If there's an error, add the product and its row to the publishingErrorsArray
                publishingErrorsArray.push({ row, product, error: publishResult });
            }
            // Wait 10 seconds to avoid hitting the publishing rate limit
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        // Update the row's ProductTypesWithYes to only include successfully published products
        row.ProductTypesWithYes = updatedProductTypesWithYes;
    }

    // Note: rowsArrayAfterPrintify now contains rows with only successfully published products in their ProductTypesWithYes.
    // publishingErrorsArray contains detailed error info for each failed product, including its row and the specific product that failed.

    if (publishingErrorsArray.length > 0) {
        console.log("The following rows failed to publish:", publishingErrorsArray);
    }

    res.send(`<pre>${JSON.stringify(uploadProductsPrintifyResult.rowsArray, null, 2)}</pre>`);

    // Now interact with Etsy API
    // Fetch countHowManyProductsCreated number of products from Etsy
    // For each row in .csv, if this find the id of the corresponding product in the Etsy store
    // Update the Etsy product with info

    for (const row of rowsArrayAfterPrintify) {
        for (const product of row.ProductTypesWithYes) {
            // This will only execute if there are items in ProductTypesWithYes
            console.log(`Product ${product} was successfully published for this row:`, row);
            
        }
    }

});

module.exports = router;