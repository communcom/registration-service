const core = require('cyberway-core-service');
const Basic = core.controllers.Basic;
const Logger = core.utils.Logger;

const env = require('../data/env');
const States = require('../data/states');
const SPECIAL_REFERRALS = require('../data/specialReferrals');

const PhoneUtils = require('../utils/Phone');
const EmailUtils = require('../utils/Email');
const Blockchain = require('../utils/Blockchain');
const { checkCaptcha } = require('../utils/captcha');
const { validateUsername } = require('../utils/validation');

const User = require('../models/User');

const COMMUNITIES_SUBSCRIPTIONS_COUNT = 3;
const ONBOARDING_TOKENS_AMOUNT = 10;

class Registration extends Basic {
    constructor({ connector }) {
        super({ connector });

        this.blockchain = new Blockchain();
    }

    async _getUserModel({ phone, identity, email }) {
        if (identity) {
            return await User.findOne({ identity });
        }

        if (email) {
            email = EmailUtils.normalizeEmail(email);
            const emailHash = EmailUtils.saltedHash(email);

            return await User.findOne({ $or: [{ email }, { emailHash }] });
        }

        phone = PhoneUtils.normalizePhone(phone);
        const phoneHash = PhoneUtils.saltedHash(phone);

        return await User.findOne({ $or: [{ phone }, { phoneHash }] });
    }

    async getState({ phone, identity, email }) {
        const userModel = await this._getUserModel({ phone, identity, email });

        if (!userModel) {
            if (identity) {
                return { currentState: States.CREATE_IDENTITY };
            }

            if (email) {
                return { currentState: States.FIRST_STEP_EMAIL };
            }

            return { currentState: States.FIRST_STEP };
        }

        if (userModel.state === States.TO_BLOCK_CHAIN) {
            return {
                currentState: userModel.state,
                data: {
                    userId: userModel.userId,
                    username: userModel.username,
                },
            };
        }

        return { currentState: userModel.state };
    }

    async firstStep(
        { phone, captcha, captchaType, referralId, testingPass = null },
        {},
        { deviceType }
    ) {
        const isPhoneValid = PhoneUtils.validatePhone(phone);
        if (!isPhoneValid) {
            throw {
                code: 1104,
                message: 'Phone is not valid for E.164 standard',
            };
        }

        const userModel = await this._getUserModel({ phone });
        if (userModel) {
            this.throwIfRegistred(userModel.isRegistered);
            this.throwIfInvalidState(userModel.state, States.FIRST_STEP);
        }

        if ((referralId || !env.GLS_ALLOW_NON_REFERRALS) && deviceType === 'desktop') {
            await this.checkReferredUserExists({ referralId });
        }

        const isTestingSystem = this._isTestingSystem(testingPass);

        if (this._isReCaptchaEnabled() && !isTestingSystem) {
            await this._checkReCaptcha(captcha, captchaType);
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
                referralId,
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
        const userModel = await this._getUserModel({ phone });

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

    async firstStepEmail({ email, captcha, captchaType, referralId, testingPass = null }) {
        const isEmailValid = EmailUtils.validateEmail(email);
        if (!isEmailValid) {
            throw {
                code: 1104,
                message: 'Email address is not valid',
            };
        }

        const userModel = await this._getUserModel({ email });
        if (userModel) {
            this.throwIfRegistred(userModel.isRegistered);
            this.throwIfInvalidState(userModel.state, States.FIRST_STEP_EMAIL);
        }

        if (referralId || !env.GLS_ALLOW_NON_REFERRALS) {
            await this.checkReferredUserExists({ referralId });
        }

        const isTestingSystem = this._isTestingSystem(testingPass);
        if (this._isReCaptchaEnabled() && !isTestingSystem) {
            await this._checkReCaptcha(captcha, captchaType);
        }

        const result = {};
        try {
            const { code } = await this._sendEmail(email, isTestingSystem);
            if (isTestingSystem) {
                result.code = code;
            }

            await User.create({
                email,
                emailCode: code,
                emailCodeDate: new Date(),
                state: States.VERIFY_EMAIL,
                isTestingSystem,
                referralId,
            });
        } catch (err) {
            Logger.error('Send email error:', email, err);
            throw err;
        }

        result.nextEmailRetry = this._calcNextEmailRetry();
        result.currentState = States.VERIFY_EMAIL;

        return result;
    }

    async verifyEmail({ email, code }) {
        const userModel = await this._getUserModel({ email });

        if (!userModel) {
            return { currentState: States.FIRST_STEP_EMAIL };
        }

        this.throwIfRegistred(userModel.isRegistered);
        this.throwIfInvalidState(userModel.state, States.VERIFY_EMAIL);

        if (userModel.emailCode !== String(code)) {
            throw { code: 1104, message: 'Wrong activation code' };
        }

        await User.updateOne({ email }, { isEmailVerified: true, state: States.SET_USERNAME });

        return { currentState: States.SET_USERNAME };
    }

    async setUsername({ phone, identity, email, username, referralId }) {
        const userModel = await this._getUserModel({ phone, identity, email });

        if (!userModel) {
            if (identity) {
                return { currentState: States.CREATE_IDENTITY };
            }

            if (email) {
                return { currentState: States.FIRST_STEP_EMAIL };
            }

            return { currentState: States.FIRST_STEP };
        }

        this.throwIfRegistred(userModel.isRegistered);

        if (userModel.state !== States.TO_BLOCK_CHAIN) {
            this.throwIfInvalidState(userModel.state, States.SET_USERNAME);
        }

        await this._checkUsername(username);

        const userId = await this.blockchain.generateNewUserId();

        const query = this._makeQuery({ phone, identity, email });

        const userObj = {
            userId,
            username,
            state: States.TO_BLOCK_CHAIN,
        };

        if (referralId || !env.GLS_ALLOW_NON_REFERRALS) {
            await this.checkReferredUserExists({ referralId });

            userObj.referralId = referralId;
        }

        await User.updateOne(query, userObj);

        return { userId, currentState: States.TO_BLOCK_CHAIN };
    }

    async toBlockChain(
        { phone, identity, email, userId, username, publicOwnerKey, publicActiveKey },
        {},
        { platform, clientType, deviceType }
    ) {
        const userModel = await this._getUserModel({ phone, identity, email });

        if (!userModel) {
            if (identity) {
                return { currentState: States.CREATE_IDENTITY };
            }

            if (email) {
                return { currentState: States.FIRST_STEP_EMAIL };
            }

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

            if (userModel.referralId && env.GLS_REFERRAL_BONUS) {
                const referralId = userModel.referralId;

                this.callService('payment', 'sendPayment', {
                    apiKey: env.GLS_PAYMENT_API_KEY,
                    userId: referralId,
                    quantity: env.GLS_REFERRAL_BONUS,
                    memo: `referral registration bonus from: ${userModel.username} (${userModel.userId})`,
                }).catch(err => {
                    Logger.error(
                        `Error while sending referral bonus to ${referralId} ` +
                            `per registration ${userModel.userId}:`,
                        err
                    );
                });
            }

            // TODO waitForTransaction

            const query = this._makeQuery({ phone, identity, email });

            const userObj = {
                isRegistered: true,
                userId,
                state: States.REGISTERED,
                finalStepDeviceInfo: { platform, clientType, deviceType },
            };

            if (phone) {
                userObj.phone = PhoneUtils.maskBody(phone);
                userObj.phoneHash = PhoneUtils.saltedHash(phone);
            }

            if (email) {
                userObj.email = EmailUtils.maskBody(email);
                userObj.emailHash = EmailUtils.saltedHash(email);
            }

            await User.updateOne(query, userObj);

            if (userModel.referralId && !SPECIAL_REFERRALS.includes(userModel.referralId)) {
                await User.updateOne(
                    { userId: userModel.referralId },
                    { $addToSet: { referrals: userId } }
                );
            }

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

    async onboardingCommunitySubscriptions({ userId, communityIds }) {
        const user = await User.findOne(
            { userId },
            {
                onboardingCommunitySubscriptions: true,
            },
            { lean: true }
        );

        if (user && user.onboardingCommunitySubscriptions.length === 0) {
            for (let i = 0; i < COMMUNITIES_SUBSCRIPTIONS_COUNT; i++) {
                const communityId = communityIds[i];

                await this.blockchain.transferCommunityTokens({
                    userId,
                    communityId,
                    amount: ONBOARDING_TOKENS_AMOUNT,
                });

                await User.update(
                    { userId },
                    {
                        $addToSet: {
                            onboardingCommunitySubscriptions: communityId,
                        },
                    }
                );
            }
        }
    }

    async onboardingDeviceSwitched({}, { userId }, { deviceType }) {
        const user = await User.findOne(
            { userId },
            {
                onboardingDeviceSwitched: true,
                onboardingCommunitySubscriptions: true,
                devicesUsed: true,
            },
            { lean: true }
        );

        if (!user) {
            return;
        }

        if (
            user.devicesUsed.length > 0 &&
            user.onboardingDeviceSwitched === false &&
            !user.devicesUsed.includes(deviceType)
        ) {
            for (const communityId of user.onboardingCommunitySubscriptions) {
                await this.blockchain.transferCommunityTokens({
                    userId,
                    communityId,
                    amount: ONBOARDING_TOKENS_AMOUNT,
                });

                await User.update(
                    { userId },
                    {
                        $set: { onboardingDeviceSwitched: true },
                    }
                );
            }
        }

        await User.update({ userId }, { $addToSet: { devicesUsed: deviceType } });
    }

    async onboardingSharedLink({ userId }) {
        const user = await User.findOne(
            { userId },
            {
                onboardingSharedLink: true,
                onboardingCommunitySubscriptions: true,
            },
            { lean: true }
        );

        // can be undefined -> strict inequality
        if (user && user.onboardingSharedLink === false) {
            for (const communityId of user.onboardingCommunitySubscriptions) {
                await this.blockchain.transferCommunityTokens({
                    userId,
                    communityId,
                    amount: ONBOARDING_TOKENS_AMOUNT,
                });

                await User.update(
                    { userId },
                    {
                        $set: { onboardingSharedLink: true },
                    }
                );
            }
        }
    }

    async createIdentity({ identity, provider, secureKey }) {
        if (secureKey !== env.GLS_OAUTH_SECURE_KEY) {
            throw { code: 1108, message: 'Wrong secure key' };
        }

        const userModel = await this._getUserModel({ identity });

        if (userModel) {
            this.throwIfRegistred(userModel.isRegistered);
            if (userModel.state !== States.CREATE_IDENTITY) {
                throw {
                    code: 1102,
                    message: 'Invalid step taken',
                    currentState: userModel.state,
                    identity: userModel.identity,
                    provider: userModel.provider,
                };
            }
        }

        const userObj = {
            identity,
            provider,
            state: States.SET_USERNAME,
        };
        const isTestingSystem = env.GLS_IS_TEST_IDENTITY;

        if (isTestingSystem) {
            userObj.isTestingSystem = isTestingSystem;
        }

        await User.create(userObj);

        return {
            success: true,
            currentState: States.SET_USERNAME,
            identity,
            provider,
        };
    }

    async resendSmsCode({ phone }) {
        const userModel = await this._getUserModel({ phone });

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

        let smsCodeDate;
        try {
            const { code } = await this._sendSmsCode(phone);

            smsCodeDate = new Date();

            await User.updateOne(
                { phone },
                {
                    smsCodeResendCount: userModel.smsCodeResendCount + 1,
                    smsCode: code,
                    smsCodeDate,
                }
            );
        } catch (err) {
            Logger.error('Send sms error:', phone, err);
            throw err;
        }

        return {
            nextSmsRetry: this._calcNextSmsRetry(smsCodeDate),
            currentState: States.VERIFY,
        };
    }

    async resendEmailCode({ email }) {
        const userModel = await this._getUserModel({ email });

        if (!userModel) {
            return { currentState: States.FIRST_STEP_EMAIL };
        }

        this.throwIfRegistred(userModel.isRegistered);
        this.throwIfInvalidState(userModel.state, States.VERIFY_EMAIL);

        if (
            Date.now() - new Date(userModel.emailCodeDate).getTime() <
            env.GLS_EMAIL_RESEND_CODE_TIMEOUT
        ) {
            throw {
                code: 1107,
                message: 'Try later',
                nextEmailRetry: userModel.emailCodeDate,
            };
        }

        if (userModel.emailCodeResendCount >= env.GLS_EMAIL_RESEND_CODE_MAX) {
            throw { code: 1108, message: 'Too many retries' };
        }

        let emailCodeDate;
        try {
            const { code } = await this._sendEmail(email);

            emailCodeDate = new Date();

            await User.updateOne(
                { email },
                {
                    emailCodeResendCount: userModel.emailCodeResendCount + 1,
                    emailCode: code,
                    emailCodeDate,
                }
            );
        } catch (err) {
            Logger.error('Send email error:', email, err);
            throw err;
        }

        return {
            nextEmailRetry: this._calcNextEmailRetry(emailCodeDate),
            currentState: States.VERIFY_EMAIL,
        };
    }

    _calcNextRetryCodeSend(codeDate, timeout) {
        if (codeDate) {
            return new Date(new Date(codeDate).getTime() + timeout);
        } else {
            return new Date(Date.now() + timeout);
        }
    }

    _calcNextSmsRetry(smsCodeDate) {
        return this._calcNextRetryCodeSend(smsCodeDate, env.GLS_SMS_RESEND_CODE_TIMEOUT);
    }

    _calcNextEmailRetry(emailCodeDate) {
        return this._calcNextRetryCodeSend(emailCodeDate, env.GLS_EMAIL_RESEND_CODE_TIMEOUT);
    }

    async _sendSmsCode(phone, isTestingSystem = false) {
        if (this._isSmsSendCodeSkiped()) {
            return { code: 1234 }; // test verification code
        }

        const code = PhoneUtils.makeSmsCode();
        const message = `Your Commun verification code is: ${code}`;

        if (isTestingSystem) {
            return { code };
        }

        try {
            await this.callService('sms', 'plainSms', { phone, message });
        } catch (error) {
            throw {
                code: 1113,
                message: 'Cannot send sms code',
                data: error,
            };
        }

        return { code };
    }

    async _sendEmail(email, isTestingSystem) {
        if (this._isEmailSendCodeSkiped()) {
            return { code: '123456' }; // test verification code
        }

        const code = EmailUtils.makeEmailCode(env.GLS_EMAIL_CODE_LENGTH);

        if (isTestingSystem) {
            return { code };
        }

        try {
            await this.callService('email', 'sendVerificationEmail', { email, code });
        } catch (error) {
            throw {
                code: 1113,
                message: 'Cannot send email code',
                data: error,
            };
        }

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

    async checkReferredUserExists({ referralId }) {
        if (SPECIAL_REFERRALS.includes(referralId)) {
            return true;
        }

        const user = await User.findOne(
            { userId: referralId },
            { _id: false, userId: true },
            { lean: true }
        );
        if (!user || !user.userId) {
            throw { code: 1103, message: 'Invalid referralId' };
        }

        return true;
    }

    async appendReferralParent({ referralId, phone, identity, email, userId }) {
        if (!(phone || identity || userId || email)) {
            throw {
                code: 1005,
                message: 'One of phone, identity or userId params are required',
            };
        }

        await this.checkReferredUserExists({ referralId });

        let resolveUserQuery = {};

        if (userId) {
            resolveUserQuery = { userId };
        } else if (identity) {
            resolveUserQuery = { identity };
        } else if (email) {
            email = EmailUtils.normalizeEmail(email);
            const emailHash = EmailUtils.saltedHash(email);

            resolveUserQuery = { $or: [{ email }, { emailHash }] };
        } else {
            phone = PhoneUtils.normalizePhone(phone);
            const phoneHash = PhoneUtils.saltedHash(phone);

            resolveUserQuery = { $or: [{ phone }, { phoneHash }] };
        }

        const user = await User.findOneAndUpdate(
            { $and: [resolveUserQuery, { referralId: { $exists: false } }] },
            { $set: { referralId } }
        );

        if (user) {
            await User.updateOne({ userId: referralId }, { $addToSet: { referrals: user.userId } });

            if (user && env.GLS_REFERRAL_BONUS) {
                this.callService('payment', 'sendPayment', {
                    apiKey: env.GLS_PAYMENT_API_KEY,
                    userId: referralId,
                    quantity: env.GLS_REFERRAL_BONUS,
                    memo: `referral registration bonus from: ${user.username} (${user.userId})`,
                }).catch(err => {
                    Logger.error(
                        `Error while sending referral bonus to ${referralId} ` +
                            `per registration ${user.userId}:`,
                        err
                    );
                });
            }
        }
    }

    _makeQuery({ phone, identity, email }) {
        if (identity) {
            return { identity };
        }

        if (email) {
            return { email };
        }

        return { phone };
    }

    _isTestingSystem(testingPass) {
        return testingPass === env.GLS_TESTING_PASS;
    }

    _isReCaptchaEnabled() {
        return env.GLS_CAPTCHA_ON;
    }

    async _checkReCaptcha(captcha, type) {
        await checkCaptcha(captcha, type);
    }

    _isSmsSendCodeSkiped() {
        return env.SKIP_SMS_VERIFICATION_CODE_SEND;
    }

    _isEmailSendCodeSkiped() {
        return env.SKIP_EMAIL_VERIFICATION_CODE_SEND;
    }
}

module.exports = Registration;
