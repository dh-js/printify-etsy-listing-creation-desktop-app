const fetch = require("node-fetch");
const chalk = require('chalk');
const FormData = require('form-data');

async function apiCall(api, url, method = 'GET', body = null, retries = 3, delay = 5, etsy_access_token = null, etsy_refresh_token = null, custom_headers = null) {
    const delayExecution = (delay) => new Promise(resolve => setTimeout(resolve, delay * 1000));

    try {
        let options = { method: method };

        if (api === 'printify') {
            options.headers = {
                'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
                'Content-Type': 'application/json'
            };
        } else if (api === 'etsy' && !custom_headers) {
            options.headers = {
                'x-api-key': process.env.ETSY_CLIENT_ID,
                Authorization: `Bearer ${etsy_access_token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
        } else if (api === 'etsy' && custom_headers) {
            options.headers = custom_headers;
        }
        // Add the body to the request if method is POST or PATCH and body is not null
        if ((method === 'POST' || method === 'PATCH' || method === 'PUT') && body) {
            if (body instanceof FormData) {
                // If the body is FormData, assign it directly without stringification
                options.body = body;
            } else {
                // For other types of bodies, stringify
                options.body = JSON.stringify(body);
            }
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
        console.error(chalk.yellow(`Failed to fetch from API: ${error}`));
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