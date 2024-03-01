require('dotenv').config();
const path = require("path");
const express = require('express');
const hbs = require("hbs");
const fetch = require("node-fetch");
const crypto = require("crypto");

const app = express();
const { exec } = require('child_process');
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static('./assets'));

//OAUTH Values
const base64URLEncode = (str) =>
  str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest();

const oauthCodeVerifier = base64URLEncode(crypto.randomBytes(32));
const oauthCodeChallenge = base64URLEncode(sha256(oauthCodeVerifier));
const oauthState = Math.random().toString(36).substring(7);
const oauthRedirectUri = 'http://localhost:3003/oauth/redirect';

// Rendering the entry page
app.get('/', async (req, res) => {
    res.render("etsy_auth", {
        ETSY_CLIENT_ID: process.env.ETSY_CLIENT_ID,
        oauth_state: oauthState,
        oauth_code_challenge: oauthCodeChallenge,
        oauth_redirect_uri: oauthRedirectUri
    });
});

//ETSY AUTH PROCESS
app.get("/oauth/redirect", async (req, res) => {
    const state = req.query.state;
    // Check if the state parameter matches the set oauthState value from above
    if (state !== oauthState) {
        res.send("Error: state mismatch during Etsy auth");
    }

    // req.query object has query params that Etsy auth sends to this route.
    // -> Auth code is in `code` param
    const authCode = req.query.code;
    const requestOptions = {
        method: 'POST',
        body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: process.env.ETSY_CLIENT_ID,
            redirect_uri: oauthRedirectUri,
            code: authCode,
            code_verifier: oauthCodeVerifier,
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const response = await fetch(
        'https://api.etsy.com/v3/public/oauth/token',
        requestOptions
        );

    // Extract the access token from the response access_token data field
    if (response.ok) {
        const tokenData = await response.json();
        const access_token = tokenData.access_token;
        const refresh_token = tokenData.refresh_token;

        res.redirect(`/home?access_token=${access_token}&refresh_token=${refresh_token}`);

    } else {
        res.send("Etsy Auth Failed");
    }
});

// After OAUTH, render the welcome page if the 'physical' store was selected
app.get("/home", async (req, res) => {
    const { access_token, refresh_token } = req.query;
    const user_id = access_token.split('.')[0];

    const requestOptions = {
        headers: {
            'x-api-key': process.env.ETSY_CLIENT_ID,
            Authorization: `Bearer ${access_token}`,
            'Accept': 'application/json',
        }
    };

    //Get the user's name
    const responseUser = await fetch(
        `https://api.etsy.com/v3/application/users/${user_id}`,
        requestOptions
    );
    let firstName;
    if (responseUser.ok) {
        const userData = await responseUser.json();
        firstName = userData.first_name;
    } else {
        console.log(responseUser.status, responseUser.statusText);
        const errorData = await responseUser.json();
        console.log(errorData);
        res.send("Error getting user's name");
    }

    // Get the user's shop ID
    const responseMe = await fetch(
        "https://openapi.etsy.com/v3/application/users/me",
        requestOptions
    )
    let shopID;
    if (responseMe.ok) {
        const meData = await responseMe.json();
        shopID = meData.shop_id;
    } else {
        console.log(responseMe.status, responseMe.statusText);
        const errorDataMe = await responseMe.json();
        console.log(errorDataMe);
        res.send("Error getting shop ID")
    }


    res.render("home", {
        first_name_hbs: firstName,
        shop_id_hbs: shopID,
        access_token_hbs: access_token,
        refresh_token_hbs: refresh_token
    });
    
});

const port = 3003;
app.listen(port, () => {
    console.log(`Hi! Go to the following link in your browser to start the app: http://localhost:${port}`);
    exec(`start http://localhost:${port}`, (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            return;
        }
    });
});