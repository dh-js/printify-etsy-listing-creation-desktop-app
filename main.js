const express = require('express');
const router = express.Router();


const initialCsvCheck = require('./functions/initial_csv_check');

router.post('/', async (req, res) => {
    const {access_token, refresh_token, shop_id, first_name, type_of_run} = req.body;
    
    const csvCheckResult = await initialCsvCheck();

    console.log(csvCheckResult);

    if (csvCheckResult.csvErrorArray.length > 0) {
        res.render("home", {
            first_name_hbs: first_name,
            shop_id_hbs: shop_id,
            access_token_hbs: access_token,
            refresh_token_hbs: refresh_token,
            csvErrors: csvErrorArray
        });
        return;
    }

});

module.exports = router;