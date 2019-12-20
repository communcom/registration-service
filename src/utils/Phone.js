const random = require('random');
const hash = require('eosjs-ecc/lib/hash');

const STATIC_SALT = 'COMMUN';

class Phone {
    static plainHash(phone) {
        return hash.sha256(phone, 'hex');
    }

    static saltedHash(phone) {
        return hash.sha256(`${STATIC_SALT}${phone}`, 'hex');
    }

    static comparePlain(phone, hash) {
        return this.plainHash(phone) === hash;
    }

    static compareSalted(phone, hash) {
        return this.saltedHash(phone) === hash;
    }

    static maskBody(phone) {
        const segments = /^(...)(.*)(..)$/g.exec(phone).slice(1, 4);

        segments[1] = segments[1].replace(/./g, '*');

        return segments.join('');
    }

    static normalizePhone(phone) {
        return phone.startsWith('+') ? phone : `+${phone}`;
    }

    static validatePhone(phone) {
        phone = Phone.normalizePhone(phone);
        const regExp = /^\+[1-9]\d{1,14}$/;

        return regExp.test(phone);
    }

    static makeSmsCode() {
        return random.int(1000, 9999);
    }
}

module.exports = Phone;
