const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const Logger = core.utils.Logger;

const env = require('./data/env');

const Connector = require('./services/Connector');

class Main extends BasicMain {
    constructor() {
        super(env);

        const connector = new Connector();
        this._mongoDb = new MongoDB();

        this.addNested(connector);
    }

    async start() {
        Logger.info('Start MongoDb...');
        await this._mongoDb.start();
        Logger.info('The MongoDb done!');

        await super.start();
        this.addNested(this._mongoDb);
    }
}

module.exports = Main;
