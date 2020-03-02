const ERRORS = {
    IS_EMPTY: "Username can't be empty",
    INVALID_SYMBOLS: 'Username should have only letters, digits, dots or dashes',
    START_WITH: 'Username should start with letter',
    TOO_SHORT: 'Username is too short. Minimal required length is 3 symbols',
    TOO_LONG: 'Username is too long. Maximum length is 32 symbols',
    SEVERAL_DOTS: "Username can't contain several dots in a row",
    SEVERAL_DASHES: "Username can't contain several dashes in a row",
    INVALID_SEQUENCES: `Username can't contain ".-" and "-." sequences`,
    ENDS_WITH: 'Username should end with a letter or digit',
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
