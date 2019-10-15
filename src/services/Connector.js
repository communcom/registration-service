const core = require('cyberway-core-service');
const BasicConnector = core.services.Connector;

const env = require('../data/env');

const Registration = require('../controllers/Registration');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._registration = new Registration({ connector: this });

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
                        required: ['phone'],
                        properties: {
                            phone: {
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
                        required: ['phone', 'username'],
                        properties: {
                            phone: {
                                type: 'string',
                            },
                            username: {
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
                        required: ['phone', 'username', 'publicOwnerKey', 'publicActiveKey'],
                        properties: {
                            phone: {
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
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
                sms: env.GLS_SMS_CONNECT,
                prism: env.GLS_PRISM_CONNECT,
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
