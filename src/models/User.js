const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports =
    MongoDB.mongoose.models.User || // for mocha watch
    MongoDB.makeModel(
        'User',
        {
            user: {
                type: String,
                minLength: 2,
                maxLength: 100,
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
