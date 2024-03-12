const chalk = require('chalk');
const fsPromises = require('fs').promises;
const FormData = require('form-data');
const apiCall = require('./api_call');

const holidays = {
    "Christmas": 35,
    "Cinco de Mayo": 36,
    "Diwali": 4562,
    "Easter": 37,
    "Eid": 4564,
    "Father's Day": 38,
    "Halloween": 39,
    "Hanukkah": 40,
    "Holi": 4563,
    "Independence Day": 41,
    "Kwanzaa": 42,
    "Lunar New Year": 34,
    "Mother's Day": 43,
    "New Year's": 44,
    "Passover": 47,
    "St Patrick's Day": 45,
    "Thanksgiving": 46,
    "Valentine's Day": 48,
    "Veterans Day": 49
};

async function updateEtsyListings(productType, row, allEtsyListings, shop_id, access_token, refresh_token, etsyRowCounter, shopSectionTranslations) {

    // If listing ID can't be found then error is thrown which is then handled in main.js
    // If there is a different issue (that doesnt impact other sections running) then compile the errors in
    // errorsArray then return them at the end and it will be handled in main.js
    let errorsArray = [];
    let etsyApiUrl;
    
    console.log(`(Updating ${productType})`);

    const productTitle = row[`${productType} Product Title`];

    // First find the matching Etsy listing based on matching the title
    let etsyListingId;
    try {
        etsyListingId = allEtsyListings.find(listing => listing.title === productTitle).listing_id;
    } catch (error) {
        throw new Error(`Couldn't find published Etsy listing for ${productTitle}`);
    }

    //console.log(`Found Etsy listing ID: ${etsyListingId}`);

    // Update the tags
    try {
        let tags = row[`${productType} Tags`].split(',').map(tag => tag.trim());
        let tagObject = {
            tags: tags
        };
        etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyListingId}`;
        const updateTagsResult = await apiCall('etsy', etsyApiUrl, 'PATCH', tagObject, 3, 5, access_token, refresh_token);
        // If apiCall does not throw an error, it means the update was successful.
        console.log(`Successfully updated tags`);
    } catch (error) {
        errorsArray.push(`Error updating tags for row ${etsyRowCounter}: ${productType}. Error details: ${error.message}`);
    }

    // Update the Holiday property
    try {
        //This is the fixed ID for the Holiday property (got from the taxonomy endpoint) 
        const property_id = 46803063659;
        let isThereAHolidayValueToSet = false;

        let holidayPropertyID = [];
        let holidayPropertyName = [];
        if (row[`${productType} Holiday`].trim() !== "") {
            holidayPropertyID.push(holidays[row[`${productType} Holiday`].trim()]);
            holidayPropertyName.push(row[`${productType} Holiday`].trim());
            isThereAHolidayValueToSet = true;
        } else {
            console.log(chalk.yellow(`No holiday value to set`));
        }

        if (isThereAHolidayValueToSet){
            let body = {
                value_ids: holidayPropertyID,
                values: holidayPropertyName
            }

            etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyListingId}/properties/${property_id}`;
            const updateHolidayResult = await apiCall('etsy', etsyApiUrl, 'PUT', body, 3, 5, access_token, refresh_token);
            console.log(`Successfully updated holiday`);
        }

    } catch (error) {
        errorsArray.push(`Error updating holiday property for row ${etsyRowCounter}: ${productType}. Error details: ${error.message}`);
    }

    // Update the Shop Section (Can also update other listing values here)
    try {
        if (Object.keys(shopSectionTranslations).length > 0) {
            // The shopSectionTranslations object is not empty, meaning the API call was successful
            // Example:
            const shopSection = row[`${productType} Section`].trim();
            if (shopSection && shopSectionTranslations[shopSection]) {
                const sectionId = shopSectionTranslations[shopSection];
                let body = {
                    shop_section_id: sectionId
                }
    
                etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyListingId}`;
                const updateShopSectionResult = await apiCall('etsy', etsyApiUrl, 'PATCH', body, 3, 5, access_token, refresh_token);
                console.log(`Successfully updated shop section`);
            } else {
                console.log(chalk.yellow(`Shop section "${shopSection}" not found or not provided for ${productType}`));
            }
        } else {
            throw new Error(`Previous API call to get shop sections must have failed`);
        }

    } catch (error) {
        errorsArray.push(`Error updating shop section for row ${etsyRowCounter}: ${productType}. Error details: ${error.message}`);
    }

    // Upload the photos
    try {
        let imageUploadCounter = 0;
        let mockupFolderPath = row[`${productType} Photo Mockup Folder`];
        let photoFilesArray = await fsPromises.readdir(mockupFolderPath);
        photoFilesArray.sort((a, b) => {
            // Extract the leading numbers from the filenames
            const numberA = parseInt(a.match(/^\d+/));
            const numberB = parseInt(b.match(/^\d+/));
            // Compare the numbers
            return numberA - numberB;
        });
        for (let i = 0; i < photoFilesArray.length; i++) {
            imageUploadCounter = i + 1;
            let imagePath = `${mockupFolderPath}/${photoFilesArray[i]}`;
            let imageFileData = await fsPromises.readFile(imagePath);
            // Prepare the form data
            let formData = new FormData();
            formData.append('image', imageFileData, photoFilesArray[i]);
            formData.append('rank', imageUploadCounter);
            formData.append('overwrite', 'true');
            let custom_headers = {
                'x-api-key': process.env.ETSY_CLIENT_ID,
                Authorization: `Bearer ${access_token}`,
                ...formData.getHeaders()
            }
            etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyListingId}/images`;
            const uploadImageResult = await apiCall('etsy', etsyApiUrl, 'POST', formData, 3, 5, access_token, refresh_token, custom_headers);
            // If apiCall does not throw an error, it means the update was successful.
            console.log(`Successfully uploaded image ${imageUploadCounter}`);
        }

    } catch (error) {
        errorsArray.push(`Error updating photos for row ${etsyRowCounter}: ${productType}. Error details: ${error.message}`);
    }

    // Upload the video
    try {
        let videoFile = row[`${productType} Video Mockup Folder`];
        let videoFileName = videoFile.split('/').pop();
        let videoFileData = await fsPromises.readFile(videoFile);
        // Prepare the form data
        let formData = new FormData();
        formData.append('video', videoFileData, videoFileName);
        formData.append('name', videoFileName);

        let custom_headers = {
            'x-api-key': process.env.ETSY_CLIENT_ID,
            Authorization: `Bearer ${access_token}`,
            ...formData.getHeaders()
        }
        etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyListingId}/videos`;
        const uploadVideoResult = await apiCall('etsy', etsyApiUrl, 'POST', formData, 3, 5, access_token, refresh_token, custom_headers);
        // If apiCall does not throw an error, it means the update was successful.
        console.log(`Successfully uploaded video`);

    } catch (error) {
        errorsArray.push(`Error updating video for row ${etsyRowCounter}: ${productType}. Error details: ${error.message}`);
    }

    return {
        errorsArray
    };
}

module.exports = updateEtsyListings;