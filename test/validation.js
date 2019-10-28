const { assert } = require('chai');

const { validateUsername } = require('../src/utils/validation');

describe('validation', () => {
    it('validateUsername', () => {
        assert.equal(validateUsername(), 'Username should not be empty');
        assert.equal(validateUsername('abcd'), 'Username should be longer');
        assert.equal(validateUsername('abcdef.abcd'), 'Each username segment should be longer');
        assert.equal(
            validateUsername('abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz'),
            'Username should be shorter'
        );
        assert.equal(validateUsername('5bcdef'), 'Username should start with a letter');
        assert.equal(
            validateUsername('.abcdef'),
            'Each username segment should start with a letter'
        );
        assert.equal(
            validateUsername('abcd$f'),
            'Username should have only letters, digits, or dashes'
        );

        assert.equal(validateUsername('abcd--adv'), 'Username should have only one dash in a row');

        assert.equal(validateUsername('abcdef-'), 'Username should end with a letter or digit');
    });
});
