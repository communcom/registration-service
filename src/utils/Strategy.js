const core = require('cyberway-core-service');
const env = require('../data/env');

const STRATEGY_LIST = ['smsToUser'];

class Strategy {
    constructor() {
        this._strategyChoicer = env.GLS_DEFAULT_STRATEGY_CHOICER;
        this._strategyChoicerData = null;
        this._randomSmsStrategyInc = 0;

        const defaultData = env.GLS_DEFAULT_STRATEGY_CHOICER_DATA;

        if (defaultData && typeof defaultData === 'string') {
            this._strategyChoicerData = JSON.parse(defaultData);
        }
    }

    getStrategyChoicer() {
        return {
            choicer: this._strategyChoicer,
            data: this._strategyChoicerData,
        };
    }

    setStrategyChoicer(choicer, data = null) {
        if (!['directStrategy'].includes(choicer)) {
            throw { code: 400, message: 'Bad strategy name' };
        }

        this._strategyChoicer = choicer;
        this._strategyChoicerData = data;
    }

    async choiceStrategy() {
        switch (this._strategyChoicer) {
            // FIXME
            case 'randomSmsStrategy':
                return 'smsToUser';
            default:
                return 'smsToUser';
        }
    }
}

module.exports = Strategy;
