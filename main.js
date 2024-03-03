const express = require('express');
const router = express.Router();

const initialCsvProcessing = require('./functions/initial_csv_processing');


router.post('/', async (req, res) => {
    const {access_token, refresh_token, shop_id, first_name, type_of_run} = req.body;
    
    const initialCsvProcessingResult = await initialCsvProcessing();

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

    const rowsArray = initialCsvProcessingResult.newRowsArray;

    console.log(rowsArray);

    // Now upload the graphics somewhere they can be accessed by Printify

});

module.exports = router;