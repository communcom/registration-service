const random = require('random');
const hash = require('eosjs-ecc/lib/hash');

const STATIC_SALT = 'COMMUN';

const generateRandomCode = (() => {
    const USABLE_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

    return length => {
        return new Array(length)
            .fill(null)
            .map(() => {
                return USABLE_CHARACTERS[Math.floor(Math.random() * USABLE_CHARACTERS.length)];
            })
            .join('');
    };
})();

class Email {
    static saltedHash(email) {
        return hash.sha256(`${STATIC_SALT}${email}`, 'hex');
    }

    static normalizeEmail(email) {
        return email.trim();
    }

    static validateEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    static maskBody(email) {
        const segments = email.split('@');

        segments[0] = segments[0].replace(/./g, '*');

        return segments.join('');
    }

    static makeEmailCode(length) {
        return generateRandomCode(length);
    }
}

module.exports = Email;
