const request = require('request-promise-native');

const core = require('cyberway-core-service');
const metrics = core.utils.metrics;
const Logger = core.utils.Logger;

const env = require('../data/env');

async function checkCaptcha(captcha) {
    const rawResult = await request({
        method: 'POST',
        uri: 'https://www.google.com/recaptcha/api/siteverify',
        form: {
            secret: env.GLS_GOOGLE_CAPTCHA_SECRET,
            response: captcha,
        },
    });

    let result;
    try {
        result = JSON.parse(rawResult);
    } catch (err) {
        Logger.error('Google invalid response');
        metrics.inc('google_invalid_response');
        throw err;
    }
    
    if (!result.success) {
        throw { code: 410, message: 'Recaptcha check failed' };
    }
}

module.exports = {
    checkCaptcha,
};
