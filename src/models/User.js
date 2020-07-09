const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports =
    MongoDB.mongoose.models.User || // for mocha watch
    MongoDB.makeModel(
        'User',
        {
            username: {
                type: String,
                minLength: 5,
                maxLength: 32,
            },
            userId: {
                type: String,
            },
            state: {
                type: String,
                default: 'firstStep',
            },
            isRegistered: {
                type: Boolean,
                default: false,
            },
            block: {
                type: Number,
            },
            phone: {
                type: String,
                minLength: 6,
                maxLength: 100,
            },
            phoneHash: {
                type: String,
            },
            isPhoneVerified: {
                type: Boolean,
                default: false,
            },
            smsCode: {
                type: String,
            },
            smsCodeDate: {
                type: Date,
            },
            smsCodeResendCount: {
                type: Number,
                default: 0,
            },
            email: {
                type: String,
            },
            emailHash: {
                type: String,
            },
            isEmailVerified: {
                type: Boolean,
                default: false,
            },
            emailCode: {
                type: String,
            },
            emailCodeDate: {
                type: Date,
            },
            emailCodeResendCount: {
                type: Number,
                default: 0,
            },
            referralId: String,
            referrals: {
                type: [String],
                default: [],
            },
            onboardingCommunitySubscriptions: {
                type: [String],
                default: [],
            },
            onboardingDeviceSwitched: {
                type: Boolean,
                default: false,
            },
            onboardingSharedLink: {
                type: Boolean,
                default: false,
            },
            devicesUsed: {
                type: [String],
                default: [],
            },
            provider: {
                type: String,
            },
            identity: {
                type: String,
            },
            finalStepDeviceInfo: {
                platform: String,
                clientType: String,
                deviceType: String,
            },
            // Tests
            isTestingSystem: {
                type: Boolean,
                default: false,
            },
        },
        {
            index: [
                {
                    fields: {
                        phone: 1,
                    },
                },
                {
                    fields: {
                        phoneHash: 1,
                    },
                },
            ],
        }
    );
