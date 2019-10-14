const randomstring = require('randomstring');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');
const { JsonRpc, Api } = require('cyberwayjs');
const JsSignatureProvider = require('cyberwayjs/dist/eosjs-jssig').default;

const env = require('../data/env');

class Blockchain {
    constructor() {
        this.rpc = new JsonRpc(env.CYBERWAY_HTTP_URL, { fetch });

        this.api = new Api({
            rpc: this.rpc,
            signatureProvider: new JsSignatureProvider([
                env.GLS_REGISTRATION_KEY,
                env.GLS_DOMAIN_CREATOR_KEY,
            ]),
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });
    }

    async registerInBlockChain(userName, publicOwnerKey, publicActiveKey) {
        const newUserId = await this._generateNewUserId();

        const transaction = this._generateRegisterTransaction(
            newUserId,
            userName,
            publicOwnerKey,
            publicActiveKey
        );

        const trx = await this.api.transact(transaction, {
            providebw: true,
            broadcast: false,
            blocksBehind: 5,
            expireSeconds: 3600,
            keyProvider: [env.GLS_REGISTRATION_KEY],
        });

        const result = await this.api.pushSignedTransaction(trx);

        return {
            userId: newUserId,
            transactionId: result.transaction_id,
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
                            permission: 'active',
                        },
                    ],
                    data: {
                        creator: env.GLS_REGISTRATION_ACCOUNT,
                        name: userId,
                        owner: this._generateAuthorityObject(publicOwnerKey),
                        active: this._generateAuthorityObject(publicActiveKey),
                    },
                },
                {
                    account: 'cyber.domain',
                    name: 'newusername',
                    authorization: [
                        {
                            actor: env.GLS_DOMAIN_CREATOR_ACCOUNT,
                            permission: 'createuser',
                        },
                    ],
                    data: {
                        creator: env.GLS_DOMAIN_CREATOR_ACCOUNT,
                        name: userName,
                        owner: userId,
                    },
                },
            ],
        };
    }

    _generateAuthorityObject(key) {
        return { threshold: 1, keys: [{ key, weight: 1 }], accounts: [], waits: [] };
    }

    async _generateNewUserId() {
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
        } catch (err) {
            return await this._generateNewUserId();
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
            throw { code: 1105, message: `This username is already taken` };
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
