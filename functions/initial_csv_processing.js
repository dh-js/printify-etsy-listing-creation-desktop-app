const fs = require('fs'); 
const fsPromises = require('fs').promises;
const csv = require("csv-parser");
const chalk = require('chalk');

const { arrayOfProductTypesBeingUsed, productsNotInUse } = require('../products/products_being_used.js');

async function initialCsvProcessing() {

    const csvDirectory = './.csv/';
    const initialReadRowsArray = [];
    const newRowsArray = []; 
    const csvErrorArray = [];

    const readFile = await (async () => {
        try {
            const allFilesInCsvDirectory = await fsPromises.readdir(csvDirectory);
            const allCsvFiles = allFilesInCsvDirectory.filter(file => file.endsWith('.csv'));

            if (allCsvFiles.length === 0) {
                throw new Error("No CSV file found in the .csv folder");
            } else if (allCsvFiles.length > 1) {
                throw new Error("Multiple CSV files found. Please ensure only one CSV file exists in the .csv folder");
            }
            
            return csvDirectory + allCsvFiles[0];

        } catch (error) {
            csvErrorArray.push(`${error.message}`);
        }
    })();

    if (!readFile) {
        csvErrorArray.push("There was a problem reading the CSV file. Please check the file and try again.");
    }

    if (csvErrorArray.length > 0) {
        return {
            newRowsArray,
            csvErrorArray
        };
    }

    // Read the CSV file and store each row in initialReadRowsArray
    let headers = [];
    let graphicsUploadedToPrintifyExists = false;
    try {
        const csvStream = fs.createReadStream(readFile).pipe(csv({
            mapHeaders: ({ header }) => {
                headers.push(header);
                return header;
            }
        }));

        // Process each row. The headers are collected asynchronously here.
        for await (const row of csvStream) {
            // CONVERT ANY BACKUP PROPERTIES TO ARRAYS SO THE REST OF THE CODE CAN USE THEM
            if (row.GraphicsUploadedToPrintify !== undefined) {
                // Convert GraphicsUploadedToPrintify prop from string to array, if string empty, convert to empty array
                row.GraphicsUploadedToPrintify = row.GraphicsUploadedToPrintify ? row.GraphicsUploadedToPrintify.split(',') : [];
            }
            if (row.ProductTypesWithYes !== undefined) {
                // Convert GraphicsUploadedToPrintify prop from string to array, if string empty, convert to empty array
                row.ProductTypesWithYes = row.ProductTypesWithYes ? row.ProductTypesWithYes.split(',') : [];
            }
            if (row.ProductsUploadedToPrintify !== undefined) {
                // Convert GraphicsUploadedToPrintify prop from string to array, if string empty, convert to empty array
                row.ProductsUploadedToPrintify = row.ProductsUploadedToPrintify ? row.ProductsUploadedToPrintify.split(',') : [];
            }
            if (row.ProductsPublishedToPrintify !== undefined) {
                // Convert GraphicsUploadedToPrintify prop from string to array, if string empty, convert to empty array
                row.ProductsPublishedToPrintify = row.ProductsPublishedToPrintify ? row.ProductsPublishedToPrintify.split(',') : [];
            }
            
            initialReadRowsArray.push(row); // Push each row into the rowsArray
        }
    } catch (error) {
        csvErrorArray.push(`Error reading CSV file: ${error.message}`);
        return {
            newRowsArray,
            csvErrorArray
        };
    }

    // CHECKING IF THIS IS RESUMING FROM BACKUP - AND RETURNING IF SO
    // If the row already has the GraphicsUploadedToPrintify property, then dont need to do anything
    // as it has already gone through the checking process
    graphicsUploadedToPrintifyExists = headers.includes('GraphicsUploadedToPrintify');
    if (graphicsUploadedToPrintifyExists) {
        console.log(chalk.yellow("RESUMING FROM A BACKUP FILE. No need to re-check for .csv errors"));
        return {
            newRowsArray: initialReadRowsArray,
            csvErrorArray
        };
    } else {
        console.log(chalk.yellow("NEW .CSV FILE. Running check for .csv errors"));
    }
    // END OF BACKUP CHECK

    // Filter out columns based on productsNotInUse
    const filteredRowsArray = initialReadRowsArray.map(row => {
        return Object.keys(row).reduce((acc, key) => {
            // Check if the key starts with any of the strings in productsNotInUse
            const shouldExclude = productsNotInUse.some(productType => key.startsWith(productType));
            if (!shouldExclude) {
                acc[key] = row[key]; // Keep the column if it doesn't need to be excluded
            }
            return acc;
        }, {});
    });

    let lineCount = 1; //for logging the row number in the error message

    for (const row of filteredRowsArray) {

            lineCount++;
            let productTypesWithYes = [];

            for (const productType of arrayOfProductTypesBeingUsed) {

                if (row[productType] === "Yes") {

                    productTypesWithYes.push(productType);
                    
                    let singleImageColumnName = productType + " Single Image File";
                    let primaryImageColumnName = productType + " Primary Image File";
                    let columnNameForImageFilename;
                    let primarySecondaryLogic = false;
                    if (row[singleImageColumnName]) {
                        columnNameForImageFilename = singleImageColumnName;
                    } else if (row[primaryImageColumnName]) {
                        columnNameForImageFilename = primaryImageColumnName;
                        primarySecondaryLogic = true;
                    }
                    let nameUsedForFolders;
                    
                    if (productType === 'Bella Canvas 3001') {
                        nameUsedForFolders = "shirt";
                    } else if (productType === 'Gildan 18000') {
                        nameUsedForFolders = "sweatshirt";
                    } else if (productType === 'Mug') {
                        nameUsedForFolders = "mug";
                    }

                    let mockupPhotoFolderName = `${nameUsedForFolders}_listing_photos`;
                    let mockupVideoFolderName = `${nameUsedForFolders}_listing_videos`;
                    let primaryGraphicFolderName = `${nameUsedForFolders}_listing_primary_images`;

                    let testMockupImageNameWithoutExtension = row[columnNameForImageFilename].replace(/\.(png|jpg)$/,'');
                    let testMockupPhotoFilePath = `./files/${mockupPhotoFolderName}/${testMockupImageNameWithoutExtension}_${nameUsedForFolders}`;
                    let videoFileName = testMockupImageNameWithoutExtension.split('_').slice(0, 2).join('_') + "_video.mp4";
                    let testMockupVideoFilePath = `./files/${mockupVideoFolderName}/${videoFileName}`;
                    let testPrimaryGraphicFilePath = `./files/${primaryGraphicFolderName}/${row[columnNameForImageFilename]}`;
                    
                    //console.log(`Checking for ${testMockupPhotoFilePath}`);
                    if (!fs.existsSync(testMockupPhotoFilePath)) {
                        let csvErrorString = `.CSV Error Row ${lineCount}: No photos folder found at ${testMockupPhotoFilePath}`;
                        csvErrorArray.push(csvErrorString);
                    }
                    //console.log(`Checking for ${testMockupVideoFilePath}`);
                    if (!fs.existsSync(testMockupVideoFilePath)) {
                        let csvErrorString = `.CSV Error Row ${lineCount}: No video file found at ${testMockupVideoFilePath}`;
                        csvErrorArray.push(csvErrorString);
                    }
                    //console.log(`Checking for ${testPrimaryGraphicFilePath}`);
                    if (!fs.existsSync(testPrimaryGraphicFilePath)) {
                        let csvErrorString = `.CSV Error Row ${lineCount}: No primary graphic file found at ${testPrimaryGraphicFilePath}`;
                        csvErrorArray.push(csvErrorString);
                    }

                    let testSecondaryGraphicFilePath;
                    if (primarySecondaryLogic) {
                        let secondaryImageColumnName = productType + " Secondary Image File";
                        let secondaryImageFilename = row[secondaryImageColumnName];
                        let secondaryGraphicFolderName = `${nameUsedForFolders}_listing_secondary_images`;
                        testSecondaryGraphicFilePath = `./files/${secondaryGraphicFolderName}/${secondaryImageFilename}`;
                        //console.log(`Checking for ${testSecondaryGraphicFilePath}`);
                        if (!fs.existsSync(testSecondaryGraphicFilePath)) {
                            let csvErrorString = `.CSV Error Row ${lineCount}: No secondary graphic file found at ${testSecondaryGraphicFilePath}`;
                            csvErrorArray.push(csvErrorString);
                        }
                    }

                    //Add the file paths to the row object
                    row[`${productType} Photo Mockup Folder`] = testMockupPhotoFilePath;
                    row[`${productType} Video Mockup Folder`] = testMockupVideoFilePath;
                    row[`${productType} Primary Graphic Folder`] = testPrimaryGraphicFilePath;
                    if (primarySecondaryLogic) {
                        row[`${productType} Process Type`] = "Primary Secondary";
                        row[`${productType} Secondary Graphic Folder`] = testSecondaryGraphicFilePath;
                    } else {
                        row[`${productType} Process Type`] = "Single";
                    }
                }
            }

            row['ProductTypesWithYes'] = productTypesWithYes;

        newRowsArray.push(row);

    }

    return {
        newRowsArray,
        csvErrorArray
    };

}

module.exports = initialCsvProcessing;