const fs = require('fs'); 
const fsPromises = require('fs').promises;

async function initialCsvCheck() {

    const csvDirectory = './.csv/';
    const rowsArray = [];  //store the rows
    const csvErrorArray = []; //store csv rows that have errors

    let lineCount = 1; //for logging the row number in the error message

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
            rowsArray,
            csvErrorArray
        };
    }

    const csvStream = fs.createReadStream(readFile).pipe(csv());

    // Promisify the csvStream events
    const readCsv = () => {
        return new Promise((resolve, reject) => {
            csvStream.on('data', (row) => {

                lineCount++;

                //Check that mockup files exist in the mockup folders
                
                //Shirt
                if (row['Bella Canvas 3001'] === "YES") {
                    let testMockupFilePath;
                    let testVideoMockupFilePath;
                    if (row['Bella Canvas 3001 Single Image File']) {
                        //set the folder to the single image name
                        let testMockupImageNameWithoutExtension = row['Bella Canvas 3001 Single Image File'].replace(/\.(png|jpg)$/,'');
                        let testMockupFolderName = testMockupImageNameWithoutExtension + "_shirt";
                        testMockupFilePath = './shirt_listing_photos/' + '/' + testMockupFolderName;
                        let videoFileName = testMockupImageNameWithoutExtension.split('_').slice(0, 2).join('_') + "_video.mp4";
                        testVideoMockupFilePath = './shirt_listing_videos/' + videoFileName;
                    } else if (row['Bella Canvas 3001 Primary Image File']) {
                        //set the folder to the primary image name
                        let testMockupImageNameWithoutExtension = row['Bella Canvas 3001 Primary Image File'].replace(/\.(png|jpg)$/,'');
                        let testMockupFolderName = testMockupImageNameWithoutExtension + "_shirt";
                        testMockupFilePath = './shirt_listing_photos/' + '/' + testMockupFolderName;
                        let videoFileName = testMockupImageNameWithoutExtension.split('_').slice(0, 2).join('_') + "_video.mp4";
                        testVideoMockupFilePath = './shirt_listing_videos/' + videoFileName;
                    }
                
                    if (!fs.existsSync(testMockupFilePath)) {
                        let csvErrorString = `.CSV Error Row ${lineCount}: No photos folder found at ${testMockupFilePath}`;
                        csvErrorArray.push(csvErrorString);
                    }

                    // Check if testVideoMockupFilePath exists
                    if (!fs.existsSync(testVideoMockupFilePath)) {
                        let csvErrorString = `.CSV Error Row ${lineCount}: No video file found at ${testVideoMockupFilePath}`;
                        csvErrorArray.push(csvErrorString);
                    }
                }
                
                //Sweatshirt
                if (row['Gildan 18000'] === "YES") {
                    let testMockupFilePath;
                    let testVideoMockupFilePath;
                    if (row['Single Image File']) {
                        //set the folder to the single image name
                        let testMockupImageNameWithoutExtension = row['Single Image File'].replace(/\.(png|jpg)$/,'');
                        let testMockupFolderName = testMockupImageNameWithoutExtension + "_sweatshirt";
                        testMockupFilePath = './sweatshirt_listing_photos/' + '/' + testMockupFolderName;
                        let videoFileName = testMockupImageNameWithoutExtension.split('_').slice(0, 2).join('_') + "_video.mp4";
                        testVideoMockupFilePath = './sweatshirt_listing_videos/' + videoFileName;
                    } else if (row['Primary Image File']) {
                        //set the folder to the primary image name
                        let testMockupImageNameWithoutExtension = row['Primary Image File'].replace(/\.(png|jpg)$/,'');
                        let testMockupFolderName = testMockupImageNameWithoutExtension + "_sweatshirt";
                        testMockupFilePath = './sweatshirt_listing_photos' + '/' + testMockupFolderName;
                        let videoFileName = testMockupImageNameWithoutExtension.split('_').slice(0, 2).join('_') + "_video.mp4";
                        testVideoMockupFilePath = './sweatshirt_listing_videos/' + videoFileName;
                    }
                
                    if (!fs.existsSync(testMockupFilePath)) {
                        let csvErrorString = `.CSV Error Row ${lineCount}: No photos folder found at ${testMockupFilePath}`;
                        csvErrorArray.push(csvErrorString);
                    }

                    // Check if testVideoMockupFilePath exists
                    if (!fs.existsSync(testVideoMockupFilePath)) {
                        let csvErrorString = `.CSV Error Row ${lineCount}: No video file found at ${testVideoMockupFilePath}`;
                        csvErrorArray.push(csvErrorString);
                    }
                }

                rowsArray.push(row);

            });

            csvStream.on('end', () => {
                resolve();
            });

            csvStream.on('error', (err) => {
                reject(err);
            });
        });
    };  

    await readCsv();

    return {
        rowsArray,
        csvErrorArray
    };

}

module.exports = initialCsvCheck;