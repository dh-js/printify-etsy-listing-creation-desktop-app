const path = require('path');
const chalk = require('chalk');

const apiCall = require('./api_call');

async function uploadGraphicsPrintify(rowsArray) {

    const ngrokUrl = global.ngrokUrl;
    const errorsArray = [];

    let rowCounter = 1;

    for (const row of rowsArray) {
        rowCounter++

        // Add property if it doesnt exist already, it will already exist if this is a resumption of a backup .csv
        if (!row.GraphicsUploadedToPrintify) {
            row.GraphicsUploadedToPrintify = [];
        }

        let primaryGraphicUploaded = false;
        let secondaryGraphicUploaded = false;
        let primaryGraphicPrintifyId;
        let primaryGraphicPrintifyName;
        let secondaryGraphicPrintifyId;
        let secondaryGraphicPrintifyName;

        for (const productType of row.ProductTypesWithYes) {
            if (!primaryGraphicUploaded && !row.GraphicsUploadedToPrintify.includes('primary')) {
                const primaryGraphicFileName = path.basename(row[`${productType} Primary Graphic Folder`]);
                const primaryGraphicURL = `${ngrokUrl}/${row[`${productType} Primary Graphic Folder`].substring(2)}`;
                const imageUploadObject = {
                    "file_name": primaryGraphicFileName,
                    "url": primaryGraphicURL
                };

                const printifyApiUrl = `https://api.printify.com/v1/uploads/images.json`;
                let uploadedGraphicPrimary;
                try {
                    uploadedGraphicPrimary = await apiCall('printify', printifyApiUrl, 'POST', imageUploadObject);
                    console.log(chalk.green(`Uploaded file ${primaryGraphicFileName} to Printify`));
                    primaryGraphicPrintifyId = uploadedGraphicPrimary.id;
                    primaryGraphicPrintifyName = uploadedGraphicPrimary.file_name;
                    primaryGraphicUploaded = true;
                } catch (error) {
                    console.log(error);
                    errorsArray.push(error);
                }
            } else if (row.GraphicsUploadedToPrintify.includes('primary')) {
                console.log(`Row ${rowCounter} already has primary graphic uploaded to Printify, moving on`);
            }

            const processTypeKey = `${productType} Process Type`;
            if (row[processTypeKey] === 'Primary Secondary' && !secondaryGraphicUploaded && !row.GraphicsUploadedToPrintify.includes('secondary')) {
                const secondaryGraphicFileName = path.basename(row[`${productType} Secondary Graphic Folder`]);
                const secondaryGraphicURL = `${ngrokUrl}/${row[`${productType} Secondary Graphic Folder`].substring(2)}`;
                const imageUploadObject = {
                    "file_name": secondaryGraphicFileName,
                    "url": secondaryGraphicURL
                };

                const printifyApiUrl = `https://api.printify.com/v1/uploads/images.json`;
                let uploadedGraphicSecondary;
                try {
                    uploadedGraphicSecondary = await apiCall('printify', printifyApiUrl, 'POST', imageUploadObject);
                    console.log(chalk.green(`Uploaded file ${secondaryGraphicFileName} to Printify`));
                    secondaryGraphicPrintifyId = uploadedGraphicSecondary.id;
                    secondaryGraphicPrintifyName = uploadedGraphicSecondary.file_name;
                    secondaryGraphicUploaded = true;
                } catch (error) {
                    console.log(error);
                    errorsArray.push(error);
                }
            } else if (row.GraphicsUploadedToPrintify.includes('secondary')) {
                console.log(`Row ${rowCounter} already has secondary graphic uploaded to Printify, moving on`);
            }
        }

        if (primaryGraphicUploaded) {
            row.primaryGraphicPrintifyId = primaryGraphicPrintifyId;
            row.primaryGraphicPrintifyName = primaryGraphicPrintifyName;
            row.GraphicsUploadedToPrintify.push('primary');
        }
        if (secondaryGraphicUploaded) {
            row.secondaryGraphicPrintifyId = secondaryGraphicPrintifyId;
            row.secondaryGraphicPrintifyName = secondaryGraphicPrintifyName;
            row.GraphicsUploadedToPrintify.push('secondary');
        }
    }
    return {
        rowsArray,
        errorsArray
    }   
}

module.exports = uploadGraphicsPrintify;