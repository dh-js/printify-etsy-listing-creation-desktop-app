const express = require('express');
const router = express.Router();
const path = require('path');

const initialCsvProcessing = require('./functions/initial_csv_processing');
const apiCall = require('./functions/api_call');
const uploadGraphicsPrintify = require('./functions/upload_graphics_printify');
const uploadProductsPrintify = require('./functions/upload_products_printify');
const updateEtsyListings = require('./functions/update_etsy_listings');
const checkAllPublished = require('./functions/check_all_published');
const getAllEtsyListings = require('./functions/get_all_etsy_listings');

router.post('/', async (req, res) => {
    const {access_token, refresh_token, shop_id, first_name, type_of_run} = req.body;

    // Define the Printify API URL in case of dev-use
    let printifyApiUrl;
    let etsyApiUrl;
    // Access the global ngrok URL
    const ngrokUrl = global.ngrokUrl;
    //console.log(`Accessing ngrok URL in main.js: ${ngrokUrl}`);

    // FIRST CHECK HOW MANY ALREADY ACTIVE ETSY LISTINGS THERE ARE (for later checking that publishing has finished)
    
    let startingNumberOfEtsyActiveListings;
    try {
        etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings?state=active`
        const activeEtsyListingsResult = await apiCall('etsy', etsyApiUrl, 'GET', null, 3, 0, access_token, refresh_token)
        startingNumberOfEtsyActiveListings = activeEtsyListingsResult.count
    } catch (error) {
        console.log(error);
        return;
    }

    console.log(`Starting number of active Etsy listings: ${startingNumberOfEtsyActiveListings}`);
    
    const initialCsvProcessingResult = await initialCsvProcessing();
    //console.log(initialCsvProcessingResult);

    if (initialCsvProcessingResult.csvErrorArray.length > 0) {
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            errors: initialCsvProcessingResult.csvErrorArray
        });
        return;
    }

    // This section is for during development - to get example product info from Printify
    // printifyApiUrl = `https://api.printify.com/v1/shops/${process.env.PRINTIFY_SHOP_ID}/products.json/?page=1`
    // const allProductsData = await apiCall('printify', printifyApiUrl, 'GET');
    // const simplifiedVariants = allProductsData.data[0].variants.map(variant => ({
    //     id: variant.id,
    //     title: variant.title
    // }));
    // res.send(`<pre>${JSON.stringify(allProductsData.data[0], null, 2)}</pre>`);
    // return;
    //------End of dev section

    // printifyApiUrl = `https://api.printify.com//v1/shops.json`
    // const shopData = await apiCall('printify', printifyApiUrl, 'GET');
    // console.log(shopData);
    // res.send(`<pre>${JSON.stringify(shopData, null, 2)}</pre>`);
    // return;

    //const rowsArray = initialCsvProcessingResult.newRowsArray;


    // DEPENDING ON WHETHER LISTINGS NEED TO BE CREATED ON PRINTIFY FIRST,
    // OR WHETHER IT IS A RE-ATTEMPT OF ADDING THE FILES TO ETSY (in case there was timeout/server issues)
    // ALSO MAY BE A RE-ATTEMPT OF ETSY IF PUBLISHING ON PRINTIFY HAD TO BE DONE MANUALLY FOR SOME LISTINGS
    let uploadGraphicsPrintifyResult;
    let uploadProductsPrintifyResult;
    let printifyPublishingResult;
    let rowsArrayAfterPrintify;

    if (type_of_run === 'create') {
        uploadGraphicsPrintifyResult = await uploadGraphicsPrintify(initialCsvProcessingResult.newRowsArray);

        if (uploadGraphicsPrintifyResult.errorsArray.length > 0) {
            res.render("home", {
                first_name_hbs: first_name,
                shop_id_hbs: shop_id,
                access_token_hbs: access_token,
                refresh_token_hbs: refresh_token,
                errors: uploadGraphicsPrintifyResult.errorsArray
            });
            return;
        }

        uploadProductsPrintifyResult = await uploadProductsPrintify(uploadGraphicsPrintifyResult.rowsArray);

        if (uploadProductsPrintifyResult.errorsArray.length > 0) {
            res.render("home", {
                first_name_hbs: first_name,
                shop_id_hbs: shop_id,
                access_token_hbs: access_token,
                refresh_token_hbs: refresh_token,
                errors: uploadProductsPrintifyResult.errorsArray
            });
            return;
        }

        rowsArrayAfterPrintify = uploadProductsPrintifyResult.rowsArray;

        // PUBLISHING SECTION
        // printifyPublishingResult = await publishListingsPrintify(uploadProductsPrintifyResult.rowsArray);
        // if (printifyPublishingResult.errorsArray.length > 0) {
        //     console.log("The following rows failed to publish:", printifyPublishingResult.errorsArray);
        //     console.log("The listing automation process will continue without these rows");
        // }
        // rowsArrayAfterPrintify = printifyPublishingResult.rowsArray;
        // Note: rowsArrayAfterPrintify now contains rows with only successfully published products in their ProductTypesWithYes.

    } else if (type_of_run === 'resume') {
        rowsArrayAfterPrintify = initialCsvProcessingResult.newRowsArray;
    }
    
    //console.log(rowsArrayAfterPrintify);

    /////////////////////////// NOW INTERACT WITH ETSY API ///////////////////////////

    // CHECKING THAT ALL PUBLISHED LISTINGS ARE SHOWING ON ETSY
    // let allPublishedListingsAreShowing = false;
    // try {
    //     allPublishedListingsAreShowing = await checkAllPublished(rowsArrayAfterPrintify, startingNumberOfEtsyActiveListings, shop_id, access_token, refresh_token);
    // } catch (error) {
    //     console.error(`Unable to check how many listings are now active on Etsy, once you can see all listings have published then run the 'Resume' process: ${error}`);
    //     console.log(`allPublishedListingsAreShowing: ${allPublishedListingsAreShowing}`);
    // }
    // // If an error was thrown or if false was returned
    // if (!allPublishedListingsAreShowing) {
    //     console.log(`Not all published listings are showing on Etsy. Manually run the 'Resume' process once you are happy with what has been published.`);
    //     console.log(`In the 'Resume' process the automation will skip any listings it can't see on Etsy`);
    //     res.render("home", {
    //         first_name_hbs: first_name,
    //         shop_id_hbs: shop_id,
    //         access_token_hbs: access_token,
    //         refresh_token_hbs: refresh_token,
    //         errors: [`Not all published listings are showing on Etsy. Manually run the 'Resume' process once you are happy with what has been published. The automation will skip any listings it can't see on Etsy`]
    //     });
    //     return;
    // }
    // END OF CHECKING WHETHER ALL PUBLISHED LISTINGS ARE SHOWING ON ETSY


    // GET ALL ACTIVE ETSY LISTINGS IN AN ARRAY SO THEY CAN BE MATCHED WITH THE CORRESPONDING ROW
    const allEtsyListings = await getAllEtsyListings(shop_id, access_token, refresh_token);


    // For each row in rowsArrayAfterPrintify, for each ProductTypesWithYes, update the Etsy listing

    for (const row of rowsArrayAfterPrintify) {
        for (const product of row.ProductTypesWithYes) {
            // This will only execute if there are items in ProductTypesWithYes
            const updateEtsyListingsResult = await updateEtsyListings(product, row, allEtsyListings, shop_id, access_token, refresh_token);
            
        }
    }

    

});

module.exports = router;