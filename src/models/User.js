const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
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
        strategy: {
            type: String,
            enum: ['smsToUser'],
            required: true,
        },
        state: {
            type: String,
            default: 'firstStep',
        },
        registered: {
            type: Boolean,
            default: false,
        },
        publicKeys: {
            owner: {
                type: String,
                minLength: 53,
                maxLength: 53,
            },
            active: {
                type: String,
                minLength: 53,
                maxLength: 53,
            },
        },
        block: {
            type: Number,
        },

        // Phone section
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
            // Search and identify
            {
                fields: {
                    user: 1,
                },
            },
            {
                fields: {
                    phone: 1,
                },
            },
        ],
    }
);
