const core = require('cyberway-core-service');
const Basic = core.controllers.Basic;
const Logger = core.utils.Logger;

const env = require('../data/env');
const States = require('../data/states');

const PhoneUtils = require('../utils/Phone');
const Blockchain = require('../utils/Blockchain');

const User = require('../models/User');

class Registration extends Basic {
    constructor({ connector }) {
        super({ connector });

        this.blockchain = new Blockchain();
    }

    async _getUserModel(phone) {
        phone = PhoneUtils.normalizePhone(phone);
        const phoneHash = PhoneUtils.saltedHash(phone);

        return await User.findOne({ $or: [{ phone }, { phoneHash }] });
    }

    async getState({ phone }) {
        const userModel = await this._getUserModel(phone);

        if (!userModel) {
            return { currentState: States.FIRST_STEP };
        }

        return { currentState: userModel.state };
    }

    async firstStep({ phone }) {
        const userModel = await this._getUserModel(phone);
        if (userModel) {
            this.throwIfRegistred(userModel.isRegistered);
            this.throwIfInvalidState(userModel.state, States.FIRST_STEP);
        }

        await User.create({
            phone,
            state: States.VERIFY,
        });

        setImmediate(() => {
            this._sendSmsCode(phone).catch(error => {
                Logger.error('Send sms code error', error);
            });
        });

        return { nextSmsRetry: this._calcNextSmsRetry(), currentState: States.VERIFY };
    }

    async verify({ phone, code }) {
        const userModel = await this._getUserModel(phone);

        if (!userModel) {
            return { currentState: States.FIRST_STEP };
        }

        this.throwIfRegistred(userModel.isRegistered);
        this.throwIfInvalidState(userModel.state, States.VERIFY);

        if (userModel.smsCode !== String(code)) {
            throw { code: 409, message: 'Wrong activation code' };
        }

        await User.updateOne({ phone }, { isPhoneVerified: true, state: States.SET_USERNAME });

        return { currentState: States.SET_USERNAME };
    }

    async setUsername({ phone, username }) {
        const userModel = await this._getUserModel(phone);

        if (!userModel) {
            return { currentState: States.FIRST_STEP };
        }

        this.throwIfRegistred(userModel.isRegistered);
        this.throwIfInvalidState(userModel.state, States.SET_USERNAME);
        await this.blockchain.throwIfUsernameAlreadyTaken(username);

        await User.updateOne({ phone }, { username, state: States.TO_BLOCK_CHAIN });

        return { currentState: States.TO_BLOCK_CHAIN };
    }

    async toBlockChain({ phone, username, publicOwnerKey, publicActiveKey }) {
        const userModel = await this._getUserModel(phone);

        if (!userModel) {
            return { currentState: States.FIRST_STEP };
        }

        this.throwIfRegistred(userModel.isRegistered);
        this.throwIfInvalidState(userModel.state, States.TO_BLOCK_CHAIN);

        try {
            const { userId, transactionId } = await this.blockchain.registerInBlockChain(
                username,
                publicOwnerKey,
                publicActiveKey
            );

            // TODO waitForTransaction

            await User.updateOne(
                { phone },
                {
                    isRegistered: true,
                    phone: PhoneUtils.maskBody(phone),
                    phoneHash: PhoneUtils.saltedHash(phone),
                    userId,
                    username,
                    state: States.REGISTERED,
                }
            );

            return {
                userId,
                username,
                currentState: States.REGISTERED,
            };
        } catch (err) {
            Logger.warn(err);
        }
    }

    _calcNextSmsRetry(smsCodeDate) {
        if (smsCodeDate) {
            return new Date(Number(smsCodeDate) + env.GLS_SMS_RESEND_CODE_TIMEOUT);
        } else {
            return new Date(Date.now() + env.GLS_SMS_RESEND_CODE_TIMEOUT);
        }
    }

    async _sendSmsCode(phone) {
        const code = PhoneUtils.makeSmsCode();
        const message = `Your Commun verification code is ${code}`;

        await User.updateOne(
            { phone },
            {
                smsCode: code,
                smsCodeDate: new Date(),
            }
        );

        await this.callService('sms', 'plainSms', { phone, message, langl: 'en' });
    }

    async _checkUsername(username) {
        return await this.blockchain.throwIfUsernameAlreadyTaken(username);
    }

    throwIfInvalidState(userState, state) {
        if (userState !== state) {
            throw { code: 400, message: 'Invalid step taken', currentState: userState };
        }
    }

    throwIfRegistred(isRegistered) {
        if (isRegistered) {
            throw { code: 409, message: 'Account already registered' };
        }
    }
}

module.exports = Registration;
