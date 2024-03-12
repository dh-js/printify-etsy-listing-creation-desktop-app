const express = require('express');
const router = express.Router();
const path = require('path');
const chalk = require('chalk');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const initialCsvProcessing = require('./functions/initial_csv_processing');
const apiCall = require('./functions/api_call');
const uploadGraphicsPrintify = require('./functions/upload_graphics_printify');
const uploadProductsPrintify = require('./functions/upload_products_printify');
const updateEtsyListings = require('./functions/update_etsy_listings');
const checkAllPublished = require('./functions/check_all_published');
const getAllEtsyListings = require('./functions/get_all_etsy_listings');
const publishListingsPrintify = require('./functions/publish_listings_printify');


function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    
}

async function createBackupCsv(rowsArray, fileName) {
    const backupDirectory = './backups/';
    const backupFilePath = backupDirectory + fileName;

    let createBackupFile = createCsvWriter({
        path: backupFilePath,
        header: Object.keys(rowsArray[0]).map(key => {
            return {id: key, title: key};
        })
    });

    try {
        await createBackupFile.writeRecords(rowsArray);
        console.log(chalk.green(`--> ${backupFilePath} has been created.`));
    } catch (err) {
        console.error("Error creating backup CSV file:", err);
    }
}

router.post('/', async (req, res) => {
    const {access_token, refresh_token, shop_id, first_name, type_of_run} = req.body;
    const backupFileName = "Backup_" + getFormattedDate() + ".csv";

    if (type_of_run === 'dontPublish') {
        console.log(chalk.yellow(`Running in 'Don't Publish' mode`));
    }

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
        res.send(`Error getting active Etsy listings: ${error}`);
        return;
    }

    console.log(`Number of currently active listings in Etsy store: ${startingNumberOfEtsyActiveListings}`);
    
    const initialCsvProcessingResult = await initialCsvProcessing();

    if (initialCsvProcessingResult.csvErrorArray.length > 0) {
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            errors: initialCsvProcessingResult.csvErrorArray,
            completedWithNoErrors: false
        });
        return;
    }

    //res.send(`<pre>${JSON.stringify(initialCsvProcessingResult.newRowsArray, null, 2)}</pre>`);
    //return;

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

    // This section is to get shop ID during development
    // printifyApiUrl = `https://api.printify.com//v1/shops.json`
    // const shopData = await apiCall('printify', printifyApiUrl, 'GET');
    // console.log(shopData);
    // res.send(`<pre>${JSON.stringify(shopData, null, 2)}</pre>`);
    // return;


    let errorsArray = [];

    const uploadGraphicsPrintifyResult = await uploadGraphicsPrintify(initialCsvProcessingResult.newRowsArray);
    if (uploadGraphicsPrintifyResult.errorsArray.length > 0) {
        console.log(chalk.red("The following graphics failed to upload to Printify:", uploadGraphicsPrintifyResult.errorsArray));
        errorsArray = errorsArray.concat(uploadGraphicsPrintifyResult.errorsArray);
    }

    try {
        await createBackupCsv(uploadGraphicsPrintifyResult.rowsArray, backupFileName);
        console.log(chalk.yellow("'UPLOADING GRAPHICS TO PRINTIFY' BACKUP COMPLETED. To Resume from this point or re-attempt any failed graphic uploads, move the backup .csv file into the '.csv' folder and re-run the process"));
    } catch (err) {
        console.log(chalk.red("Backup creation process failed:", err));
    }

    //res.send(`<pre>${JSON.stringify(uploadGraphicsPrintifyResult.rowsArray, null, 2)}</pre>`);
    //return;

    const uploadProductsPrintifyResult = await uploadProductsPrintify(uploadGraphicsPrintifyResult.rowsArray);

    if (uploadProductsPrintifyResult.errorsArray.length > 0) {
        console.log(chalk.red("The following listings failed to upload to Printify:", uploadProductsPrintifyResult.errorsArray));
        errorsArray = errorsArray.concat(uploadProductsPrintifyResult.errorsArray);
    }

    try {
        await createBackupCsv(uploadProductsPrintifyResult.rowsArray, backupFileName);
        console.log(chalk.yellow("'CREATING LISTINGS ON PRINTIFY' BACKUP COMPLETED. To Resume from this point or re-attempt any failed listings, move the backup .csv file into the '.csv' folder and re-run the process"));
    } catch (err) {
        console.log(chalk.red("Backup creation process failed:", err));
    }

    //res.send(`<pre>${JSON.stringify(uploadProductsPrintifyResult.rowsArray, null, 2)}</pre>`);
    //return;

    // If the type of run is 'dontPublish' then exit early & render the home page with the errors
    if (type_of_run === 'dontPublish') {
        console.log("FINISHED");
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            errors: errorsArray,
            completedWithNoErrors: errorsArray.length === 0
        });
        return;
    }

    ////////// PUBLISHING SECTION /////////////////
    const printifyPublishingResult = await publishListingsPrintify(uploadProductsPrintifyResult.rowsArray);
    if (printifyPublishingResult.errorsArray.length > 0) {
        console.log(chalk.red("The following products failed to publish:"));
        printifyPublishingResult.errorsArray.forEach(error => {
            console.log(chalk.red(error));
        });
        errorsArray = errorsArray.concat(printifyPublishingResult.errorsArray)
    }

    const rowsArrayAfterPrintify = printifyPublishingResult.rowsArray;
    const numberOfPublishedProducts = printifyPublishingResult.howManyProductsPublished;

    try {
        await createBackupCsv(rowsArrayAfterPrintify, backupFileName);
        console.log(chalk.yellow("'PUBLISHING LISTINGS TO ETSY' BACKUP COMPLETED. To Resume from this point or re-attempt any un-published listings, move the backup .csv file into the '.csv' folder and re-run the process"));
    } catch (err) {
        console.log(chalk.red("Backup creation process failed:", err));
    }

    console.log(chalk.yellow(`Products published: ${numberOfPublishedProducts}`));

    ////////// END OF PUBLISHING SECTION //////////////


    // IF THERE ARE ANY PUBLISHED LISTINGS THEN CHECK THAT ALL PUBLISHED LISTINGS ARE SHOWING ON ETSY 
    if (numberOfPublishedProducts > 0) {
        let allPublishedListingsAreShowing = false;
        try {
            allPublishedListingsAreShowing = await checkAllPublished(startingNumberOfEtsyActiveListings, numberOfPublishedProducts, shop_id, access_token, refresh_token);
        } catch (error) {
            console.error(chalk.red(`Unable to check how many listings are now active on Etsy, the automation will continue and you can re-run the process on the post-Etsy backup .csv file if any listings aren't updated on Etsy: ${error}`));
        }
        // If an error was thrown or if false was returned
        if (!allPublishedListingsAreShowing) {
            console.log(chalk.red(`Not all published listings are showing on Etsy. The automation will continue and you can re-run the process on the post-Etsy backup .csv file if any listings aren't updated on Etsy`));
        }
    } else{
        console.log(`No products were published so no need to check if they are showing on Etsy`);
    }
    // END OF CHECKING WHETHER ALL PUBLISHED LISTINGS ARE SHOWING ON ETSY

    //res.send(`<pre>${JSON.stringify(rowsArrayAfterPrintify, null, 2)}</pre>`);
    //return;


    // GET ALL ACTIVE ETSY LISTINGS IN AN ARRAY SO THEY CAN BE MATCHED WITH THE CORRESPONDING ROW
    console.log("GETTING ALL ACTIVE ETSY LISTINGS")
    const allEtsyListings = await getAllEtsyListings(shop_id, access_token, refresh_token);

    //res.send(`<pre>${JSON.stringify(allEtsyListings, null, 2)}</pre>`);
    //return;

    //GET SHOP SECTIONS & SECTION IDS
    let shopSectionTranslations = {};
    etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/sections`;
    try {
        const getEtsyShopSectionsResult = await apiCall('etsy', etsyApiUrl, 'GET', null, 3, 5, access_token, refresh_token);
        //Creating the shopSectionTranslations object which has the shop section titles & the corresponding IDs
        getEtsyShopSectionsResult.results.forEach(result => {
            shopSectionTranslations[result.title] = result.shop_section_id;
        });
        console.log(`Successfully got shop sections from Etsy API`);
    } catch (error) {
        console.error(chalk.red(`Error getting Etsy shop sections: ${error}`));
        errorsArray = errorsArray.concat(`Error getting Etsy shop sections: ${error}`);
    }

    // For each row in rowsArrayAfterPrintify, for each ProductTypesWithYes, update the Etsy listing
    console.log("STARTING TO UPDATE ETSY LISTINGS")
    let etsyRowCounter = 1;

    for (const row of rowsArrayAfterPrintify) {
        etsyRowCounter++
        console.log(`--------Starting row: ${etsyRowCounter}`);
        // Add property if it doesnt exist already, it will already exist if this is a resumption of a backup .csv
        if (!row.ProductTypesDoneOnEtsy) {
            row.ProductTypesDoneOnEtsy = [];
        }
    
        for (const product of row.ProductTypesWithYes) {
            // This will only execute only if there are items in ProductTypesWithYes
            // Check if the product is not already in the ProductTypesDoneOnEtsy array
            if (!row.ProductTypesDoneOnEtsy.includes(product)) {
                try {
                    const updateEtsyListingsResult = await updateEtsyListings(product, row, allEtsyListings, shop_id, access_token, refresh_token, etsyRowCounter, shopSectionTranslations);
                    // No error caught so add the product to the ProductTypesDoneOnEtsy array
                    if (updateEtsyListingsResult.errorsArray.length === 0) {
                        row.ProductTypesDoneOnEtsy.push(product);
                        console.log(chalk.green(`ETSY LISTING UPDATE SUCCESS FOR ROW ${etsyRowCounter}, PRODUCT ${product} - NO ERRORS`));
                    } else {
                        // If there are errors, concatenate them into a single string message then throw them to the catch block
                        const errorMessage = updateEtsyListingsResult.errorsArray.join('; ');
                        throw new Error(errorMessage);
                    }
                } catch (error) {
                    errorsArray = errorsArray.concat(`Error when updating Etsy info for row ${etsyRowCounter}, product: ${product} you can re-attempt this from the backup .csv.  Details: ${error.message}`);
                    console.log(chalk.red(`Error when updating Etsy info for row ${etsyRowCounter}, product: ${product}. You can re-attempt this from the backup .csv.  Details: ${error.message}`));
                }
            } else {
                console.log(`Row ${etsyRowCounter}, product: ${product}, already done on Etsy, skipping...`);
            }
        }
    }

    try {
        await createBackupCsv(rowsArrayAfterPrintify, backupFileName);
        console.log(chalk.yellow("'POST-ETSY' (FINAL) BACKUP COMPLETED. To re-attempt any listings, move the backup .csv file into the '.csv' folder and re-run the process"));
    } catch (err) {
        console.log(chalk.red("Backup creation process failed:", err));
    }

    //res.send(`<pre>${JSON.stringify(rowsArrayAfterPrintify, null, 2)}</pre>`);

    console.log("FINISHED");

    if (errorsArray.length > 0) {
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            errors: errorsArray,
            completedWithNoErrors: false
        });
        return;
    } else {
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            errors: errorsArray,
            completedWithNoErrors: true
        });
        return;
    }
    

});

module.exports = router;