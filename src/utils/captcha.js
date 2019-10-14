const request = require('request-promise-native');

const core = require('cyberway-core-service');
const metrics = core.utils.metrics;
const Logger = core.utils.Logger;

const env = require('../data/env');

// TODO
async function checkCaptha(captcha) {
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
        throw { code: 122, message: 'Captha error' };
    }

    if (!result.success) {
        throw { code: 123, message: 'Captha error' };
    }
}

module.exports = {
    checkCaptha,
};
