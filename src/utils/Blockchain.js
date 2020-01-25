const randomstring = require('randomstring');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');
const { JsonRpc, Api } = require('cyberwayjs');
const JsSignatureProvider = require('cyberwayjs/dist/eosjs-jssig').default;

const env = require('../data/env');

class Blockchain {
    constructor() {
        this.rpc = new JsonRpc(env.CYBERWAY_HTTP_URL, { fetch });
        const signatureProvider = new JsSignatureProvider([
            env.GLS_REGISTRATION_KEY,
            env.GLS_DOMAIN_CREATOR_KEY,
            env.GLS_PROVIDER_KEY,
            env.GLS_POINT_SENDER_KEY,
        ]);

        this.api = new Api({
            rpc: this.rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });
    }

    async registerInBlockChain(userId, userName, publicOwnerKey, publicActiveKey) {
        const transaction = this._generateRegisterTransaction(
            userId,
            userName,
            publicOwnerKey,
            publicActiveKey
        );

        const trx = await this.api.transact(transaction, {
            broadcast: false,
            blocksBehind: 5,
            expireSeconds: 3600,
            keyProvider: [env.GLS_REGISTRATION_KEY],
        });

        const result = await this.api.pushSignedTransaction(trx);

        return {
            userId,
            transactionId: result.transaction_id,
        };
    }

    async transferCommunityTokens({ userId, communityId, amount }) {
        const transaction = this._generateTokenTransferTransaction({ userId, communityId, amount });

        const trx = await this.api.transact(transaction, {
            broadcast: false,
            blocksBehind: 5,
            expireSeconds: 3600,
        });

        const result = await this.api.pushSignedTransaction(trx);

        return {
            userId,
            transactionId: result.transaction_id,
        };
    }

    _generateTokenTransferTransaction({ userId, communityId, amount }) {
        return {
            actions: [
                {
                    account: 'c.point',
                    name: 'transfer',
                    authorization: [
                        {
                            actor: env.GLS_POINT_SENDER,
                            permission: 'active',
                        },
                    ],
                    data: {
                        from: env.GLS_POINT_SENDER,
                        to: userId,
                        quantity: `${amount}.000 ${communityId}`,
                        memo: '',
                    },
                },
                {
                    account: 'cyber',
                    name: 'providebw',
                    authorization: [
                        {
                            actor: 'c',
                            permission: 'providebw',
                        },
                    ],
                    data: {
                        provider: 'c',
                        account: env.GLS_POINT_SENDER,
                    },
                },
            ],
        };
    }

    _generateRegisterTransaction(userId, userName, publicOwnerKey, publicActiveKey) {
        return {
            actions: [
                {
                    account: 'cyber',
                    name: 'newaccount',
                    authorization: [
                        {
                            actor: env.GLS_REGISTRATION_ACCOUNT,
                            permission: 'c.com',
                        },
                    ],
                    data: {
                        creator: env.GLS_REGISTRATION_ACCOUNT,
                        name: userId,
                        owner: this._generateAuthorityObject(publicOwnerKey, true),
                        active: this._generateAuthorityObject(publicActiveKey),
                    },
                },
                {
                    account: 'cyber.domain',
                    name: 'newusername',
                    authorization: [
                        {
                            actor: env.GLS_DOMAIN_CREATOR_ACCOUNT,
                            permission: env.GLS_DOMAIN_CREATOR_PERMISSION,
                        },
                    ],
                    data: {
                        creator: env.GLS_DOMAIN_CREATOR_ACCOUNT,
                        name: userName,
                        owner: userId,
                    },
                },
                {
                    account: 'cyber',
                    name: 'providebw',
                    authorization: [
                        {
                            actor: 'c',
                            permission: 'providebw',
                        },
                    ],
                    data: {
                        provider: 'c',
                        account: 'c.com',
                    },
                },
            ],
        };
    }

    _generateAuthorityObject(key, addRecoveryAccount = false) {
        return {
            threshold: 1,
            keys: [{ key, weight: 1 }],
            accounts: addRecoveryAccount
                ? [
                      {
                          permission: {
                              actor: 'c.recover',
                              permission: 'cyber.code',
                          },
                          weight: 1,
                      },
                  ]
                : [],
            waits: [],
        };
    }

    async generateNewUserId() {
        const prefix = env.GLS_ACCOUNT_NAME_PREFIX;

        const newUserId =
            prefix +
            randomstring.generate({
                length: 12 - prefix.length,
                charset: 'alphabetic',
                capitalization: 'lowercase',
            });

        try {
            await this.throwIfUserIdAlreadyExists(newUserId);
        } catch (error) {
            if (error.code === 1105) {
                return await this.generateNewUserId();
            }

            // Blockchain error
            throw error;
        }

        return newUserId;
    }

    // TODO use state reader
    async throwIfUserIdAlreadyExists(userId) {
        try {
            await this.rpc.get_account(userId);
            throw { code: 1105, message: 'This userId is already exists' };
        } catch (error) {
            const errObject = error.json || error;

            if (errObject.code === 500) {
                return;
            }

            const code = errObject.code || 500;
            const message = errObject.message || 'Unhandled blockchain error';

            throw { code, message };
        }
    }

    // TODO use state reader
    async throwIfUsernameAlreadyTaken(username) {
        try {
            await this.rpc.fetch('/v1/chain/resolve_names', [`${username}@commun`]);
            throw { code: 1106, message: `This username is already taken` };
        } catch (error) {
            const errObject = error.json || error;

            if (errObject.code === 500) {
                return;
            }

            const code = errObject.code || 500;
            const message = errObject.message || 'Unhandled blockchain error';

            throw { code, message };
        }
    }
}

module.exports = Blockchain;
