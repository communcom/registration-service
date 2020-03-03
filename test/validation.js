const { assert } = require('chai');

const { validateUsername, ERRORS } = require('../src/utils/validation');

function okName(username) {
    assert.equal(validateUsername(username), null);
}

function badName(username, error) {
    assert.equal(validateUsername(username), error);
}

describe('validation', () => {
    describe('validateUsername', () => {
        it('negative scenarios', () => {
            badName('', ERRORS.IS_EMPTY);
            badName('ab', ERRORS.TOO_SHORT);
            badName('a'.repeat(33), ERRORS.TOO_LONG);

            badName('5bcdef', ERRORS.START_WITH);
            badName('.abcdef', ERRORS.START_WITH);

            badName('abcd$f', ERRORS.INVALID_SYMBOLS);
            badName('привет', ERRORS.INVALID_SYMBOLS);

            badName('abcd--adv', ERRORS.SEVERAL_DASHES);
            badName('abcd..adv', ERRORS.SEVERAL_DOTS);

            badName('abcd.-adv', ERRORS.INVALID_SEQUENCES);
            badName('abcd-.adv', ERRORS.INVALID_SEQUENCES);

            badName('abcdef-', ERRORS.ENDS_WITH);
            badName('abcdef.', ERRORS.ENDS_WITH);
        });

        it('positive scenarios', () => {
            okName('abc');
            okName('test');
            okName('test123');
            okName('test.123');
            okName('t.est.123');
            okName('t.est.12.3');
            okName('test-123');
            okName('t-est-123');
            okName('t-est-12-3');
            okName('t.e-s.t.12-3');
            okName('a'.repeat(32));
        });
    });
});
