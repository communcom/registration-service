const core = require('cyberway-core-service');
const Basic = core.controllers.Basic;
const Logger = core.utils.Logger;

const env = require('../data/env');
const States = require('../data/states');

const PhoneUtils = require('../utils/Phone');
const Blockchain = require('../utils/Blockchain');
const { checkCaptcha } = require('../utils/captcha');
const { validateUsername } = require('../utils/validation');

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

    async firstStep({ phone, captcha, testingPass = null }) {
        const userModel = await this._getUserModel(phone);
        if (userModel) {
            this.throwIfRegistred(userModel.isRegistered);
            this.throwIfInvalidState(userModel.state, States.FIRST_STEP);
        }

        const isTestingSystem = this._isTestingSystem(testingPass);

        if (this._isReCaptchaEnabled() && !isTestingSystem) {
            await this._checkReCaptcha(captcha);
        }

        const result = {};

        try {
            const { code } = await this._sendSmsCode(phone, isTestingSystem);

            if (isTestingSystem) {
                result.code = code;
            }

            await User.create({
                phone,
                smsCode: code,
                smsCodeDate: new Date(),
                state: States.VERIFY,
                isTestingSystem,
            });
        } catch (err) {
            Logger.error('Send sms error:', phone, err);
            throw err;
        }

        result.nextSmsRetry = this._calcNextSmsRetry();
        result.currentState = States.VERIFY;

        return result;
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

        await this._checkUsername(username);

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

        if (userModel.username !== username) {
            throw { code: 1110, message: 'Username mismatch' };
        }

        if (userModel.userId !== userId) {
            throw { code: 1111, message: 'User id mismatch' };
        }

        try {
            const { transactionId } = await this.blockchain.registerInBlockChain(
                userModel.userId,
                userModel.username,
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
            throw { code: 500, message: 'Internal Service Error', data: { err } };
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

    async _sendSmsCode(phone, isTestingSystem = false) {
        if (this.isSmsSendCodeSkiped()) {
            return { code: 1234 }; // test verification code
        }

        const code = PhoneUtils.makeSmsCode();
        const message = `Your Commun verification code is: ${code}`;

        if (isTestingSystem) {
            return { code };
        }

        await this.callService('sms', 'plainSms', { phone, message });

        return { code };
    }

    async _checkUsername(username) {
        const validationError = validateUsername(username);
        if (validationError) {
            throw { code: 1109, message: validationError };
        }

        return await this.blockchain.throwIfUsernameAlreadyTaken(username);
    }

    // TODO tests
    async deleteAccount({ targetUser, targetPhone, testingPass = null }) {
        if (!this._isTestingSystem(testingPass)) {
            throw { code: 403, message: 'Access denied' };
        }

        if (targetUser) {
            await User.deleteOne({ username: targetUser, isTestingSystem: true });
        }

        if (targetPhone) {
            const findPhone = { phone: targetPhone };

            if (targetPhone !== '+70000000001') {
                findPhone.isTestingSystem = true;
            }

            await User.deleteOne(findPhone);

            const phoneHash = PhoneUtils.saltedHash(targetPhone);
            const findHash = { phoneHash };

            if (targetPhone !== '+70000000001') {
                findHash.isTestingSystem = true;
            }
            await User.deleteOne(findHash);
        }
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

    _isTestingSystem(testingPass) {
        return testingPass === env.GLS_TESTING_PASS;
    }

    _isReCaptchaEnabled() {
        return env.GLS_CAPTCHA_ON;
    }

    async _checkReCaptcha(captcha) {
        await checkCaptcha(captcha);
    }

    isSmsSendCodeSkiped() {
        console.log(env.SKIP_SMS_VERIFICATION_CODE_SEND);
        return env.SKIP_SMS_VERIFICATION_CODE_SEND;
    }
}

module.exports = Registration;
