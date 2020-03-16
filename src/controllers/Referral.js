const core = require('cyberway-core-service');
const { Basic } = core.controllers;
const { Logger } = core.utils;

const User = require('../models/User');

class Referral extends Basic {
    async getReferralUsers({ offset, limit }, auth, clientInfo) {
        if (!auth.userId) {
            throw {
                code: 401,
                message: 'Unauthorized',
            };
        }

        const user = await User.findOne(
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

        const items = await this.callService(
            'prism',
            'getUsers',
            {
                userIds: user.referrals,
            },
            auth,
            clientInfo
        );

        return {
            items,
        };
    }
}

module.exports = Referral;
