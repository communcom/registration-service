const request = require('request-promise-native');

const core = require('cyberway-core-service');
const metrics = core.utils.metrics;
const Logger = core.utils.Logger;

const env = require('../data/env');

function getSecretByType(type) {
    switch (type) {
        case 'android':
            return env.ANDROID_CAPTCHA_SECRET;
        case 'ios':
            return env.IOS_CAPTCHA_SECRET;

        case 'web':
        default:
            return env.WEB_CAPTCHA_SECRET;
    }
}

async function checkCaptcha(captcha, type) {
    const rawResult = await request({
        method: 'POST',
        uri: 'https://www.google.com/recaptcha/api/siteverify',
        form: {
            secret: getSecretByType(type),
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
        throw { code: 1103, message: 'Recaptcha check failed' };
    }
}

module.exports = {
    checkCaptcha,
};
