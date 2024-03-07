const path = require('path');

const printifyApiCall = require('./printify_api_call');

async function uploadGraphicsPrintify(rowsArray) {

    const ngrokUrl = global.ngrokUrl;

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

                console.log("Uploading primary graphic...");
                console.log(imageUploadObject);

                const printifyApiUrl = `https://api.printify.com/v1/uploads/images.json`;
                const uploadedGraphicPrimary = await printifyApiCall(printifyApiUrl, 'POST', imageUploadObject);

                console.log(uploadedGraphicPrimary);
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

                console.log("Uploading secondary graphic...");
                console.log(imageUploadObject);

                const printifyApiUrl = `https://api.printify.com/v1/uploads/images.json`;
                const uploadedGraphicSecondary = await printifyApiCall(printifyApiUrl, 'POST', imageUploadObject);

                console.log(uploadedGraphicSecondary);
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
    return rowsArray;
}

module.exports = uploadGraphicsPrintify;