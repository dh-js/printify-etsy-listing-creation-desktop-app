const path = require('path');

const printifyApiCall = require('./printify_api_call');

async function uploadGraphicsPrintify(rowsArray) {

    const ngrokUrl = global.ngrokUrl;
    const errorsArray = [];

    for (const row of rowsArray) {
        let primaryGraphicUploaded = false;
        let secondaryGraphicUploaded = false;
        let primaryGraphicPrintifyId;
        let primaryGraphicPrintifyName;
        let secondaryGraphicPrintifyId;
        let secondaryGraphicPrintifyName;

        for (const productType of row.ProductTypesWithYes) {
            if (!primaryGraphicUploaded) {
                const primaryGraphicFileName = path.basename(row[`${productType} Primary Graphic Folder`]);
                const primaryGraphicURL = `${ngrokUrl}/${row[`${productType} Primary Graphic Folder`].substring(2)}`;
                const imageUploadObject = {
                    "file_name": primaryGraphicFileName,
                    "url": primaryGraphicURL
                };

                const printifyApiUrl = `https://api.printify.com/v1/uploads/images.json`;
                let uploadedGraphicPrimary;
                try {
                    uploadedGraphicPrimary = await printifyApiCall(printifyApiUrl, 'POST', imageUploadObject);
                    console.log(`Uploaded file ${primaryGraphicFileName} to Printify`);
                } catch (error) {
                    console.log(error);
                    errorsArray.push(error);
                }

                primaryGraphicPrintifyId = uploadedGraphicPrimary.id;
                primaryGraphicPrintifyName = uploadedGraphicPrimary.file_name;
                primaryGraphicUploaded = true;
            }

            const processTypeKey = `${productType} Process Type`;
            if (row[processTypeKey] === 'Primary Secondary' && !secondaryGraphicUploaded) {
                const secondaryGraphicFileName = path.basename(row[`${productType} Secondary Graphic Folder`]);
                const secondaryGraphicURL = `${ngrokUrl}/${row[`${productType} Secondary Graphic Folder`].substring(2)}`;
                const imageUploadObject = {
                    "file_name": secondaryGraphicFileName,
                    "url": secondaryGraphicURL
                };

                const printifyApiUrl = `https://api.printify.com/v1/uploads/images.json`;
                let uploadedGraphicSecondary;
                try {
                    uploadedGraphicSecondary = await printifyApiCall(printifyApiUrl, 'POST', imageUploadObject);
                    console.log(`Uploaded file ${secondaryGraphicFileName} to Printify`);
                } catch (error) {
                    console.log(error);
                    errorsArray.push(error);
                }

                secondaryGraphicPrintifyId = uploadedGraphicSecondary.id;
                secondaryGraphicPrintifyName = uploadedGraphicSecondary.file_name;
                secondaryGraphicUploaded = true;
            }
        }

        row.primaryGraphicPrintifyId = primaryGraphicPrintifyId;
        row.primaryGraphicPrintifyName = primaryGraphicPrintifyName;
        if (secondaryGraphicUploaded) {
            row.secondaryGraphicPrintifyId = secondaryGraphicPrintifyId;
            row.secondaryGraphicPrintifyName = secondaryGraphicPrintifyName;
        }
    }
    return {
        rowsArray,
        errorsArray
    }   
}

module.exports = uploadGraphicsPrintify;