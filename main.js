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

    res.send(`<pre>${JSON.stringify(uploadProductsPrintifyResult.rowsArray, null, 2)}</pre>`);

    // Now i guess publish the printify listings to Etsy store

});

module.exports = router;