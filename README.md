# Etsy-Printify Listing creation automation - Node.js desktop app

The client had a very specific workflow for creating a .csv and image files containing listing data for their print on demand business.

The task was to take this data and automate the creation of Etsy listings that were linked to Printify so that the order fulfillment process would be fully automated by Printify.

Because the client lists a large number of listings at once it was very important that if there were any interruptions to their internet connection, API server issues, mistakes in their starting data, that the app would keep a record of what had already been done. So that they can they resume the listing process from the point that the interruption occured, or re-attempt the listing process only for the sections that had a failure. This is managed through the use of backup .csv files which are created by the app and keep a record of the listing progress/successes/failures. These .csv files can then be fed back into the automation.

It was also very important to the client that the automation ran with no intervention needed from them, so after authenticating (OAuth2) with Etsy, there is a single button for the user to press to start the automation and the entire process runs from start to finish without any user action needed. Equally, the app handles whether this is a new set of listings or whether this is resuming from one of the 'backup .csv' files without any additional input needed by the user.

## Features

- **One-click listing creation**: The user just needs to add their .csv file to the .csv/ directory and their image files to the files/ directory as per their existing workflow, then there is a single button to click and the automation handles all logic/options, creating/updating listings via both the Printify & Etsy APIs.

- **Image files accessible via URL**: Printify recommends image files over 5mb be uploaded via URL rather than binary, so use of an NGrok tunnel has been implemented to make the app's files/ directory accessible via a public internet URL. The URL for specific graphics is then passed to the Printify API.

- **Progress Tracking**: The app keeps a thorough regular record of successes/failure/progress and records this in a .csv file in the backups/ directory. This .csv can then be ran by the app and it will take care of anything that was not previously completed.

- **Thorough Error Handling & Clear Messaging**: The error handling logic catches & logs errors and if they aren't critical to the next stage of the process then the app will continue. As well as being logged to the console in red, any errors will be rendered to the browser UI once the process has completed.

- **Image & Video uploading via Etsy API**: The client has their own mockup/video files they would like on their Etsy listings. So once the listings are published from Printify to Etsy, they are located & have the custom Image/video files uploaded as binary, as well as adding some other custom Etsy info to the listings.

- **Client control over products/colors/sizes/pricing**: Via their .csv file the client can control which specific variations of a Printify product they would like to include in their listing, and in the price_settings/ directory they can set their own pricing based on size.

## Running the App

For the client, the app is packaged into a single portable executable file using PKG. This allows the client to run the app on their PC simply by double-clicking a .exe file. The UI of the app will automatically open in the default web browser when the app is started.

## Note

No confidential information has been added to Github, all private information is stored in a .env file.
