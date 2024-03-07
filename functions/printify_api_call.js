const fetch = require("node-fetch");

async function printifyApiCall(url, method = 'GET', body = null, retries = 3) {
    try {
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };
        // Add the body to the request if method is POST and body is not null
        if (method === 'POST' && body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Status Text: ${response.statusText}, Body: ${errorBody}`);
        }
        console.log(`Printify API call successful`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Failed to fetch from API: ${error}`);
        if (retries > 0) {
            console.log(`Retrying... (${retries} attempts left)...`);
            return printifyApiCall(url, method, body, retries - 1);
        } else {
            console.error(`No more retries left`);
            throw error;
        }
    }
}

module.exports = printifyApiCall;