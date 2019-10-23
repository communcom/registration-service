const core = require('cyberway-core-service');
const Basic = core.controllers.Basic;
const Logger = core.utils.Logger;

const env = require('../data/env');
const States = require('../data/states');

const PhoneUtils = require('../utils/Phone');
const Blockchain = require('../utils/Blockchain');
const { checkCaptcha } = require('../utils/captcha');

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

    async firstStep({ phone, captcha }) {
        const userModel = await this._getUserModel(phone);
        if (userModel) {
            this.throwIfRegistred(userModel.isRegistered);
            this.throwIfInvalidState(userModel.state, States.FIRST_STEP);
        }

        if (this._isReCaptchaEnabled()) {
            await this._checkReCaptcha(captcha);
        }

        try {
            const { code } = await this._sendSmsCode(phone);

            await User.create({
                phone,
                smsCode: code,
                smsCodeDate: new Date(),
                state: States.VERIFY,
            });
        } catch (err) {
            Logger.error('Send sms error:', phone, err);
            throw err;
        }

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
            throw { code: 1104, message: 'Wrong activation code' };
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

        const userId = await this.blockchain.generateNewUserId();

        await User.updateOne({ phone }, { userId, username, state: States.TO_BLOCK_CHAIN });

        return { userId, currentState: States.TO_BLOCK_CHAIN };
    }

    async toBlockChain({ phone, userId, username, publicOwnerKey, publicActiveKey }) {
        const userModel = await this._getUserModel(phone);

        if (!userModel) {
            return { currentState: States.FIRST_STEP };
        }

        this.throwIfRegistred(userModel.isRegistered);
        this.throwIfInvalidState(userModel.state, States.TO_BLOCK_CHAIN);

        try {
            const { transactionId } = await this.blockchain.registerInBlockChain(
                userId,
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
            Logger.error(err);
            throw { code: 500, message: 'Internal Service Error' };
        }
    }

    async resendSmsCode({ phone }) {
        const userModel = await this._getUserModel(phone);

        if (!userModel) {
            return { currentState: States.FIRST_STEP };
        }

        this.throwIfRegistred(userModel.isRegistered);
        this.throwIfInvalidState(userModel.state, States.VERIFY);

        if (
            Date.now() - new Date(userModel.smsCodeDate).getTime() <
            env.GLS_SMS_RESEND_CODE_TIMEOUT
        ) {
            throw {
                code: 1107,
                message: 'Try later',
                nextSmsRetry: userModel.smsCodeDate,
            };
        }

        if (userModel.smsCodeResendCount >= env.GLS_SMS_RESEND_CODE_MAX) {
            throw { code: 1108, message: 'Too many retries' };
        }

        try {
            const { code } = await this._sendSmsCode(phone);

            await User.updateOne(
                { phone },
                {
                    smsCodeResendCount: userModel.smsCodeResendCount + 1,
                    smsCode: code,
                    smsCodeDate: new Date(),
                }
            );
        } catch (err) {
            Logger.error('Send sms error:', phone, err);
            throw err;
        }

        return {
            nextSmsRetry: this._calcNextSmsRetry(userModel.smsCodeDate),
            currentState: States.VERIFY,
        };
    }

    _calcNextSmsRetry(smsCodeDate) {
        if (smsCodeDate) {
            return new Date(new Date(smsCodeDate).getTime() + env.GLS_SMS_RESEND_CODE_TIMEOUT);
        } else {
            return new Date(Date.now() + env.GLS_SMS_RESEND_CODE_TIMEOUT);
        }
    }

    async _sendSmsCode(phone) {
        if (this.isSmsSendCodeSkiped()) {
            return 1234; // test verification code
        }

        const code = PhoneUtils.makeSmsCode();
        const message = `Your Commun verification code is: ${code}`;

        await this.callService('sms', 'plainSms', { phone, message });

        return { code };
    }

    async _checkUsername(username) {
        return await this.blockchain.throwIfUsernameAlreadyTaken(username);
    }

    throwIfInvalidState(userState, state) {
        if (userState !== state) {
            throw { code: 1102, message: 'Invalid step taken', currentState: userState };
        }
    }

    throwIfRegistred(isRegistered) {
        if (isRegistered) {
            throw { code: 1101, message: 'Account already registered' };
        }
    }

    _isReCaptchaEnabled() {
        return env.GLS_CAPTCHA_ON;
    }

    async _checkReCaptcha(captcha) {
        await checkCaptcha(captcha);
    }

    isSmsSendCodeSkiped() {
        return env.SKIP_SMS_VERIFICATION_CODE_SEND;
    }
}

module.exports = Registration;
