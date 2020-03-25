const core = require('cyberway-core-service');
const { Basic } = core.controllers;
const { Logger } = core.utils;

const UserModel = require('../models/User');

class Referral extends Basic {
    async getReferralUsers({ offset, limit }, auth, clientInfo) {
        if (!auth.userId) {
            throw {
                code: 401,
                message: 'Unauthorized',
            };
        }

        const user = await UserModel.findOne(
            { userId: auth.userId },
            { _id: false, referrals: true },
            { lean: false }
        );

        let ids = null;

        if (user.referrals && user.referrals.length !== 0 && offset < user.referrals.length) {
            ids = user.referrals.slice(offset, offset + limit);
        }

        if (!ids || ids.length === 0) {
            return {
                items: [],
            };
        }

        return await this.callService(
            'prism',
            'getUsers',
            {
                userIds: user.referrals,
            },
            auth,
            clientInfo
        );
    }

    async getReferralParent({ userId }) {
        const user = await UserModel.findOne(
            {
                userId,
                isRegistered: true,
            },
            {
                _id: false,
                userId: true,
                username: true,
                referralId: true,
            },
            {
                lean: true,
            }
        );

        if (!user) {
            throw {
                code: 404,
                message: 'Requested user is not found',
            };
        }

        if (!user.referralId) {
            return {
                user,
                referralParent: null,
            };
        }

        const referralParent = await UserModel.findOne(
            {
                userId: user.referralId,
            },
            {
                _id: false,
                userId: true,
                username: true,
            },
            {
                lean: true,
            }
        );

        if (!referralParent) {
            throw {
                code: 500,
                message: 'Invalid database state',
            };
        }

        return {
            user,
            referralParent,
        };
    }
}

module.exports = Referral;
