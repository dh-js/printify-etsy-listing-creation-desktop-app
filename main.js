const express = require('express');
const router = express.Router();
const path = require('path');

const initialCsvProcessing = require('./functions/initial_csv_processing');
const printifyApiCall = require('./functions/printify_api_call');
const uploadGraphicsPrintify = require('./functions/upload_graphics_printify');


const gildan_18000_ids = require('./products/gildan_18000_ids');
const gildan_18000_price = 2893;

router.post('/', async (req, res) => {
    const {access_token, refresh_token, shop_id, first_name, type_of_run} = req.body;

    let printifyApiUrl;
    
    const initialCsvProcessingResult = await initialCsvProcessing();

    // Access the global ngrok URL
    const ngrokUrl = global.ngrokUrl;
    console.log(`Accessing ngrok URL in main.js: ${ngrokUrl}`);

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
    // const simplifiedVariants = allProductsData[0].variants.map(variant => ({
    //     id: variant.id,
    //     title: variant.title
    // }));
    // res.send(`<pre>${JSON.stringify(simplifiedVariants, null, 2)}</pre>`);
    //------End of dev section

    //const rowsArray = initialCsvProcessingResult.newRowsArray;

    const rowsArray = await uploadGraphicsPrintify(initialCsvProcessingResult.newRowsArray);

    console.log(rowsArray);

    return;

    let colorsToUse = rowsArray[0]['Gildan 18000 Primary Colors'].split(',');
    let variantsArray = [];
    let printAreaOneIds = [];
    let printAreaTwoIds = [];
    for (const item of gildan_18000_ids) {
        // Directly set is_enabled based on the condition in the object creation
        let variant = {
            "id": item.id,
            "price": gildan_18000_price,
            "is_enabled": colorsToUse.some(color => item.title.includes(color))
        };
        
        variantsArray.push(variant);
        printAreaOneIds.push(item.id);
    }

    let newProductTemplate = {
        "title": rowsArray[0]['Gildan 18000 Product Title'],
        "description": "Test description 123...",
        "blueprint_id": 49,
        "print_provider_id": 39,
        "variants": variantsArray,
        "print_areas": [
            {
                "variant_ids": printAreaOneIds,
                "placeholders": [
                    {
                        "position": "front",
                        "images": [
                            {
                                "id": "65e9c0ae7e5edf7b92e6080b",
                                "name": "2_luck_arrows_grey.png",
                                "type": "image/png",
                                "height": null,
                                "width": null,
                                "x": 0.5,
                                "y": 0.5,
                                "scale": 1,
                                "angle": 0
                            }
                        ]
                    }
                ]
            }
        ]
    }

    if (printAreaTwoIds.length > 0) {
        newProductTemplate.print_areas.push({
            "variant_ids": printAreaTwoIds,
            "placeholders": [
                {
                    "position": "front",
                    "images": [
                        {
                            "id": "65ab52ca35d56f123d1bd674",
                            "name": "PNG file-05 (8)(trimmed).png",
                            "type": "image/png",
                            "height": null,
                            "width": null,
                            "x": 0.5,
                            "y": 0.5,
                            "scale": 1,
                            "angle": 0
                        }
                    ]
                }
            ]
        });
    } else {
        console.log('No secondary print area');
    }

    printifyApiUrl = `https://api.printify.com/v1/shops/${process.env.PRINTIFY_SHOP_ID}/products.json`;
    const newProduct = await printifyApiCall(printifyApiUrl, 'POST', newProductTemplate);

    res.send(`<pre>${JSON.stringify(newProduct, null, 2)}</pre>`);


    // Now upload the graphics somewhere they can be accessed by Printify
    // The graphics will be available at:
    // ngrokUrl and then the path from the object E.G.
    //'Gildan 18000 Primary Graphic Folder': './files/sweatshirt_listing_primary_images/1_luck_arrows_white.png',
    //'Gildan 18000 Process Type': 'Primary Secondary',
    //'Gildan 18000 Secondary Graphic Folder': './files/sweatshirt_listing_secondary_images/1_luck_arrows_black.png
    //'Bella Canvas 3001 Primary Graphic Folder': './files/shirt_listing_primary_images/1_luck_arrows_white.png',
    //'Bella Canvas 3001 Process Type': 'Primary Secondary',
    //'Bella Canvas 3001 Secondary Graphic Folder': './files/shirt_listing_secondary_images/1_luck_arrows_black.png
    //'Mug Primary Graphic Folder': './files/mug_listing_primary_images/1_luck_arrows_white.png',
    //'Mug Process Type': 'Single'


});

module.exports = router;