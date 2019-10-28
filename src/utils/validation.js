// https://cyberway.gitbook.io/ru/v/master-ru/developers/system_contracts/cyber.domain_contract#trebovaniya-predyavlyaemye-k-imenam-polzovatelei-username
function validateUsername(value) {
    let suffix;

    suffix = 'Username should ';

    if (!value) {
        return suffix + 'not be empty';
    }
    if (value.length < 5) {
        return suffix + 'be longer';
    }
    if (value.length > 32) {
        return suffix + 'be shorter';
    }

    if (/\./.test(value)) {
        suffix = 'Each username segment should ';
    }

    const segments = value.split('.');
    for (const segment of segments) {
        if (!/^[a-z]/.test(segment)) {
            return suffix + 'start with a letter';
        }
        if (!/^[a-z0-9-]*$/.test(segment)) {
            return suffix + 'have only letters, digits, or dashes';
        }
        if (/--/.test(segment)) {
            return suffix + 'have only one dash in a row';
        }
        if (!/[a-z0-9]$/.test(segment)) {
            return suffix + 'end with a letter or digit';
        }
        if (!(segment.length >= 5)) {
            return suffix + 'be longer';
        }
    }
    return null;
}

module.exports = {
    validateUsername,
};
