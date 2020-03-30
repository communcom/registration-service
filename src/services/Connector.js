const core = require('cyberway-core-service');
const BasicConnector = core.services.Connector;

const env = require('../data/env');

const Registration = require('../controllers/Registration');
const Referral = require('../controllers/Referral');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._registration = new Registration({ connector: this });
        this._referral = new Referral({ connector: this });

        this._isEnabled = env.GLS_IS_REG_ENABLED_ON_START;
    }

    async start() {
        await super.start({
            serverRoutes: {
                getState: {
                    handler: this._registration.getState,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        properties: {
                            phone: {
                                type: 'string',
                            },
                            identity: {
                                type: 'string',
                            },
                            email: {
                                type: 'string',
                            },
                        },
                    },
                },
                firstStep: {
                    handler: this._registration.firstStep,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['phone', 'captcha'],
                        properties: {
                            phone: {
                                type: 'string',
                            },
                            captcha: {
                                type: 'string',
                            },
                            captchaType: {
                                type: 'string',
                                enum: ['web', 'android', 'ios'],
                                default: 'web',
                            },
                            referralId: {
                                type: 'string',
                            },
                            testingPass: {
                                type: 'string',
                            },
                        },
                    },
                },
                firstStepEmail: {
                    handler: this._registration.firstStepEmail,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['email', 'captcha'],
                        properties: {
                            email: {
                                type: 'string',
                            },
                            captcha: {
                                type: 'string',
                            },
                            captchaType: {
                                type: 'string',
                                enum: ['web', 'android', 'ios'],
                                default: 'web',
                            },
                            referralId: {
                                type: 'string',
                            },
                            testingPass: {
                                type: 'string',
                            },
                        },
                    },
                },
                verify: {
                    handler: this._registration.verify,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['phone', 'code'],
                        properties: {
                            phone: {
                                type: 'string',
                            },
                            code: {
                                type: 'number',
                            },
                        },
                    },
                },
                verifyEmail: {
                    handler: this._registration.verifyEmail,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['email', 'code'],
                        properties: {
                            email: {
                                type: 'string',
                            },
                            code: {
                                type: 'string',
                            },
                        },
                    },
                },
                setUsername: {
                    handler: this._registration.setUsername,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['username'],
                        properties: {
                            phone: {
                                type: 'string',
                            },
                            identity: {
                                type: 'string',
                            },
                            email: {
                                type: 'string',
                            },
                            username: {
                                type: 'string',
                            },
                            referralId: {
                                type: 'string',
                            },
                        },
                    },
                },
                toBlockChain: {
                    handler: this._registration.toBlockChain,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['username', 'publicOwnerKey', 'publicActiveKey'],
                        properties: {
                            phone: {
                                type: 'string',
                            },
                            identity: {
                                type: 'string',
                            },
                            email: {
                                type: 'string',
                            },
                            username: {
                                type: 'string',
                            },
                            publicOwnerKey: {
                                type: 'string',
                            },
                            publicActiveKey: {
                                type: 'string',
                            },
                        },
                        additionalProperties: true,
                    },
                },
                resendSmsCode: {
                    handler: this._registration.resendSmsCode,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['phone'],
                        properties: {
                            phone: {
                                type: 'string',
                            },
                        },
                    },
                },
                resendEmailCode: {
                    handler: this._registration.resendEmailCode,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['email'],
                        properties: {
                            email: {
                                type: 'string',
                            },
                        },
                    },
                },
                deleteAccount: {
                    handler: this._registration.deleteAccount,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['testingPass'],
                        properties: {
                            testingPass: {
                                type: 'string',
                            },
                            targetUser: {
                                type: 'string',
                            },
                            targetPhone: {
                                type: 'string',
                            },
                        },
                    },
                },
                onboardingCommunitySubscriptions: {
                    handler: this._registration.onboardingCommunitySubscriptions,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            communityIds: {
                                type: 'array',
                                minItems: 3,
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
                onboardingDeviceSwitched: {
                    handler: this._registration.onboardingDeviceSwitched,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                },
                onboardingSharedLink: {
                    handler: this._registration.onboardingSharedLink,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
                createIdentity: {
                    handler: this._registration.createIdentity,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['identity', 'provider', 'secureKey'],
                        properties: {
                            identity: {
                                type: 'string',
                            },
                            provider: {
                                type: 'string',
                            },
                            secureKey: {
                                type: 'string',
                            },
                        },
                    },
                },
                appendReferralParent: {
                    handler: this._registration.appendReferralParent,
                    scope: this._registration,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['referralId'],
                        properties: {
                            identity: {
                                type: 'string',
                            },
                            phone: {
                                type: 'string',
                            },
                            userId: {
                                type: 'string',
                            },
                            referralId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getReferralUsers: {
                    handler: this._referral.getReferralUsers,
                    scope: this._referral,
                    validation: {
                        properties: {
                            offset: {
                                type: 'number',
                                default: 0,
                            },
                            limit: {
                                type: 'number',
                                default: 20,
                            },
                        },
                    },
                },
                getReferralParent: {
                    handler: this._referral.getReferralParent,
                    scope: this._referral,
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
                sms: env.GLS_SMS_CONNECT,
                prism: env.GLS_PRISM_CONNECT,
                payment: env.GLS_PAYMENT_CONNECT,
                email: env.GLS_EMAIL_CONNECT,
            },
        });
    }

    enableRegistration() {
        this._isEnabled = true;
    }

    disableRegistration() {
        this._isEnabled = false;
    }

    isRegistrationEnabled() {
        return this._isEnabled;
    }

    _checkEnable(params) {
        if (this._isEnabled) {
            return params;
        }

        throw { code: 423, message: 'Registration disabled' };
    }

    async _enableRegistrationByApi() {
        this.enableRegistration();
        this.emit('enableRegistrationByApi');
    }

    async _disableRegistrationByApi() {
        this.disableRegistration();
        this.emit('disableRegistrationByApi');
    }

    async _isRegistrationEnabledByApi() {
        return { enabled: this.isRegistrationEnabled() };
    }
}

module.exports = Connector;
