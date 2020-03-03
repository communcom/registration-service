const ERRORS = {
    IS_EMPTY: 'Username is empty',
    INVALID_SYMBOLS: 'Username may contain only lower case letters, digits, dots or dashes',
    START_WITH: 'Username should start with a letter',
    TOO_SHORT: 'Username should contain at least 3 symbols',
    TOO_LONG: 'Username is too long. 32 symbols are maximum',
    SEVERAL_DOTS: 'Username may contain only one dot in a row',
    SEVERAL_DASHES: 'Username may contain only one dash in a row',
    INVALID_SEQUENCES: 'Username may contain only one dot or one dash in a row',
    ENDS_WITH: 'Username should end with a letter or a digit',
};

// https://cyberway.gitbook.io/ru/v/master-ru/developers/system_contracts/cyber.domain_contract#trebovaniya-predyavlyaemye-k-imenam-polzovatelei-username
function validateUsername(value) {
    if (!value) {
        return ERRORS.IS_EMPTY;
    }

    if (!/^[a-z0-9.-]+$/.test(value)) {
        return ERRORS.INVALID_SYMBOLS;
    }

    if (!/^[a-z]/.test(value)) {
        return ERRORS.START_WITH;
    }

    if (value.length < 3) {
        return ERRORS.TOO_SHORT;
    }

    if (value.length > 32) {
        return ERRORS.TOO_LONG;
    }

    if (/\.\./.test(value)) {
        return ERRORS.SEVERAL_DOTS;
    }

    if (/--/.test(value)) {
        return ERRORS.SEVERAL_DASHES;
    }

    if (/\.-|-\./.test(value)) {
        return ERRORS.INVALID_SEQUENCES;
    }

    if (!/[a-z0-9]$/.test(value)) {
        return ERRORS.ENDS_WITH;
    }

    return null;
}

module.exports = {
    ERRORS,
    validateUsername,
};
