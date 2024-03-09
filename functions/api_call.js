const fetch = require("node-fetch");

async function apiCall(api, url, method = 'GET', body = null, retries = 3, delay = 5, etsy_access_token = null, etsy_refresh_token = null) {
    const delayExecution = (delay) => new Promise(resolve => setTimeout(resolve, delay * 1000));

    try {
        let options;
        if (api === 'printify') {
            options = {
                method: method,
                headers: {
                    'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            };
        } else if (api === 'etsy') {
            options = {
                method: method,
                headers: {
                    'x-api-key': process.env.ETSY_CLIENT_ID,
                    Authorization: `Bearer ${etsy_access_token}`,
                    'Accept': 'application/json',
                },
            };
        }
        // Add the body to the request if method is POST and body is not null
        if (method === 'POST' && body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Status Text: ${response.statusText}, Body: ${errorBody}`);
        }
        //console.log(`API call successful`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Failed to fetch from API: ${error}`);
        if (retries > 0) {
            console.log(`Retrying... (${retries} attempts left)...`);
            if (delay > 0) {
                console.log(`Waiting for ${delay} seconds before retrying...`);
                await delayExecution(delay);
            }
            return apiCall(api, url, method, body, retries - 1, delay, etsy_access_token, etsy_refresh_token);
        } else {
            console.error(`No more retries left`);
            throw error;
        }
    }
}

module.exports = apiCall;