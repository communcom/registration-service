const sinon = require('sinon');
require('chai').should();
const { assert } = require('chai');

const ecc = require('eosjs-ecc');

const Registration = require('../src/controllers/Registration');
const User = require('../src/models/User');

const PhoneUtils = require('../src/utils/Phone');

describe('Registration', () => {
    let sandbox;
    let date;
    let registration;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // for JsSignatureProvider
        sandbox.stub(ecc.PrivateKey, 'fromString').returns({ toPublic: () => 'abc' });

        registration = new Registration({ connector: {} });

        date = Date;
        global.Date = class extends Date {
            constructor(date) {
                if (date) {
                    return super(date);
                }

                return new Date('2019-10-10');
            }
        };
    });

    afterEach(() => {
        global.Date = date;
        sandbox.verifyAndRestore();
    });

    describe('getState', () => {
        it('firstStep', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                });

            const state = await registration.getState({ phone: '+380000000000' });
            assert.deepEqual(state, { currentState: 'firstStep' });
        });

        it('verify', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ state: 'verify' });

            const state = await registration.getState({ phone: '+380000000000' });
            assert.deepEqual(state, { currentState: 'verify' });
        });

        it('setUsername', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ state: 'setUsername' });

            const state = await registration.getState({ phone: '+380000000000' });
            assert.deepEqual(state, { currentState: 'setUsername' });
        });

        it('toBlockChain', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ state: 'toBlockChain' });

            const state = await registration.getState({ phone: '+380000000000' });
            assert.deepEqual(state, { currentState: 'toBlockChain' });
        });

        it('registered', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ state: 'registered' });

            const state = await registration.getState({ phone: '+380000000000' });
            assert.deepEqual(state, { currentState: 'registered' });
        });
    });

    describe('firstStep', () => {
        it('wrong step', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ state: 'verify' });

            try {
                await registration.firstStep({ phone: '+380000000000' });
                assert.fail('should not be reached');
            } catch (err) {
                err.should.have.property('message', 'Invalid step taken');
                err.should.have.property('currentState', 'verify');
            }
        });

        it('account already registered', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ state: 'registered', isRegistered: true });

            try {
                await registration.firstStep({ phone: '+380000000000' });
                assert.fail('should not be reached');
            } catch (err) {
                (() => {
                    throw err;
                }).should.throw(/Account already registered/);
            }
        });

        it('throws if recaptcha check failed', async () => {
            sandbox
                .stub(registration, '_checkReCaptcha')
                .throws({ message: 'Recaptcha check failed' });

            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                });

            try {
                await registration.firstStep({ phone: '+380000000000', captcha: 'qwerty' });
            } catch (err) {
                (() => {
                    throw err;
                }).should.throw(/Recaptcha check failed/);
            }
        });

        it('new phone', async () => {
            sandbox.stub(registration, 'callService');
            sandbox.stub(registration, '_checkReCaptcha').resolves();

            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                });

            sandbox
                .mock(User)
                .expects('create')
                .withExactArgs({
                    phone: '+380000000000',
                    state: 'verify',
                });

            sandbox
                .mock(User)
                .expects('updateOne')
                .withExactArgs(
                    { phone: '+380000000000' },
                    {
                        smsCode: 1234,
                        smsCodeDate: new Date(), // important
                    }
                );

            sandbox
                .mock(PhoneUtils)
                .expects('makeSmsCode')
                .returns(1234);

            const result = await registration.firstStep({
                phone: '+380000000000',
                captcha: 'qwerty',
            });

            result.should.have.property('currentState', 'verify');
            result.should.have.property('nextSmsRetry');
        });

        it('new phone with skiped sms send', async () => {
            sandbox.stub(registration, 'callService');
            sandbox.stub(registration, '_checkReCaptcha').resolves();
            sandbox.stub(registration, 'isSmsSendCodeSkiped').resolves(true);

            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                });

            sandbox
                .mock(User)
                .expects('create')
                .withExactArgs({
                    phone: '+380000000000',
                    state: 'verify',
                });

            sandbox
                .mock(User)
                .expects('updateOne')
                .withExactArgs(
                    { phone: '+380000000000' },
                    {
                        smsCode: 1234,
                        smsCodeDate: new Date(), // important
                    }
                );

            const result = await registration.firstStep({
                phone: '+380000000000',
                captcha: 'qwerty',
            });

            result.should.have.property('currentState', 'verify');
            result.should.have.property('nextSmsRetry');
        });
    });

    describe('verify', () => {
        it('throw if verified', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ isPhoneVerified: true, state: 'verify' });

            try {
                await registration.verify({ phone: '+380000000000', code: '1234' });
                assert.fail('should not be reached');
            } catch (err) {
                (() => {
                    throw err;
                }).should.throw(/Wrong activation code/);
            }
        });

        it('throw if wrong code', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ smsCode: '1234', state: 'verify' });

            try {
                await registration.verify({ phone: '+380000000000', code: '4321' });
                assert.fail('should not be reached');
            } catch (err) {
                (() => {
                    throw err;
                }).should.throw(/Wrong activation code/);
            }
        });

        it('verify code', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({
                    phone: '+380000000000',
                    state: 'verify',
                    smsCode: '1234',
                    smsCodeDate: '2019-10-10',
                });

            sandbox
                .mock(User)
                .expects('updateOne')
                .withExactArgs(
                    { phone: '+380000000000' },
                    {
                        isPhoneVerified: true,
                        state: 'setUsername',
                    }
                );

            const result = await registration.verify({ phone: '+380000000000', code: '1234' });
            assert.deepEqual(result, { currentState: 'setUsername' });
        });
    });

    describe('setUsername', () => {
        it('throw if username is already in use', async () => {
            sandbox
                .stub(registration.blockchain, 'throwIfUsernameAlreadyTaken')
                .throws({ message: 'This username is already taken' });

            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({ state: 'setUsername' });

            try {
                await registration.setUsername({ phone: '+380000000000', username: 'zoyberg' });
                assert.fail('should not be reached');
            } catch (err) {
                err.should.have.property('message', 'This username is already taken');
            }
        });

        it('sets username', async () => {
            sandbox.stub(registration.blockchain, 'throwIfUsernameAlreadyTaken').resolves();

            sandbox.stub(registration.blockchain, 'generateNewUserId').resolves('tst5ywpbdkfd');

            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({
                    phone: '+380000000000',
                    state: 'setUsername',
                });

            sandbox
                .mock(User)
                .expects('updateOne')
                .withExactArgs(
                    { phone: '+380000000000' },
                    {
                        userId: 'tst5ywpbdkfd',
                        username: 'neo',
                        state: 'toBlockChain',
                    }
                );

            const result = await registration.setUsername({
                phone: '+380000000000',
                username: 'neo',
            });
            assert.deepEqual(result, { userId: 'tst5ywpbdkfd', currentState: 'toBlockChain' });
        });
    });

    describe('toBlockChain', () => {
        it('throw if new phone', async () => {
            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                });

            const result = await registration.toBlockChain({
                phone: '+380000000000',
            });

            assert.deepEqual(result, { currentState: 'firstStep' });
        });

        it('register in blockchain', async () => {
            sandbox
                .stub(registration.blockchain, 'registerInBlockChain')
                .resolves({ userId: 'tst5ywpbdkfd' });

            sandbox
                .mock(User)
                .expects('findOne')
                .withExactArgs({
                    $or: [
                        { phone: '+380000000000' },
                        {
                            phoneHash:
                                '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        },
                    ],
                })
                .resolves({
                    phone: '+380000000000',
                    state: 'toBlockChain',
                });

            sandbox
                .mock(User)
                .expects('updateOne')
                .withExactArgs(
                    { phone: '+380000000000' },
                    {
                        isRegistered: true,
                        phone: '+38********00',
                        phoneHash:
                            '0aa8201d9c960b80a7a452b16b012b06df8c35ce4ed8905e0e78ac2c101ed992',
                        userId: 'tst5ywpbdkfd',
                        username: 'neo',
                        state: 'registered',
                    }
                );

            const result = await registration.toBlockChain({
                phone: '+380000000000',
                username: 'neo',
                userId: 'tst5ywpbdkfd',
                publicOwnerKey: '1234',
                publicActiveKey: '1234',
            });

            assert.deepEqual(result, {
                userId: 'tst5ywpbdkfd',
                username: 'neo',
                currentState: 'registered',
            });
        });
    });
});