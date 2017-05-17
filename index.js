'use strict';

let co = require('co');
let rp = require('request-promise');

module.exports = function(opts, app){

    if (!opts || !opts.sso_server || !opts.sso_client) {
        throw new Error('the opts is illegal.');
    }
    if (!app || typeof app.use !== 'function') {
        throw new Error('the app is illegal.');
    }

    let sso_server = opts['sso_server'];
    let sso_client = opts['sso_client'];

    let auth_callback_url = sso_client + '/api/getToken';
    auth_callback_url = encodeURIComponent(auth_callback_url);

    app.get('/api/getToken', getToken(sso_server, auth_callback_url));

    return auth(sso_server, auth_callback_url);
};

function auth(sso_server, auth_callback_url) {
    return function (req, res, next) {
        co(function *() {
            let token = req.session.token;
            let redirectUrl = sso_server + '?auth_callback='+ auth_callback_url;

            if (token) {
                let token_check_url = sso_server + '/api/token/check?token=' + token;
                let jsonStr = yield rp(token_check_url);
                let json = JSON.parse(jsonStr);
                if (json.status) {
                    next();
                    return;
                }
                console.log('Check token result: ' + jsonStr + ', redirect to ' + redirectUrl);
            }else {
                console.log('No token, redirect to ' + redirectUrl);
            }

            if (!req.header('x-requested-with') ||
                req.header('x-requested-with').toLowerCase() !== 'xmlhttprequest') {

                req.session.currentUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
                res.redirect(redirectUrl);
            }
        });
    }
}

function getToken(sso_server, auth_callback_url) {
    return function (req, res) {
        co(function *() {
            let code = req.query.code;
            console.log('Get token by code: ' + code);

            if (code) {
                let code_check_url = sso_server + '/api/code/check?code=' + code;
                let jsonStr = yield rp(code_check_url);
                let json = JSON.parse(jsonStr);

                if (json.status) {
                    let redirectUrl = req.session.currentUrl || '/';
                    req.session.token = json.result;

                    let jsonAccountStr = yield rp(sso_server + '/api/getUserInfo?token=' + json.result);
                    let jsonAccount = JSON.parse(jsonAccountStr);
                    if (!jsonAccount.status) {
                        console.warn('Get the account failed, because ' + jsonAccount.message);
                    } else {
                        req.session.account = JSON.parse(jsonAccount.result);
                    }

                    res.redirect(redirectUrl);
                    console.log('Get the token: ' + json.result + ', and redirect to ' + redirectUrl);
                } else {
                    let redirectUrl = sso_server + '?auth_callback='+ auth_callback_url;
                    res.redirect(redirectUrl);

                    console.warn('Get the token result:  ' + jsonStr + ', and redirect to ' + redirectUrl);
                }

            } else {
                res.send({ status: false, message: 'Not found code.' });
            }
        });
    }
}