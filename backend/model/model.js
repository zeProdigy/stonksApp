const parser = require('./dataParser');
const Db = require('./db');
const Portfolio = require('./portfolio');


class Model {
    constructor() {
        console.log('Model inited');
        this.db = new Db();
    }

    addToDb(name, dealsFile, operationsFile, paymentsFile) {
        console.log(`Model: create DB record. Portfolio ${name}: ${dealsFile}, ${operationsFile}, ${paymentsFile}`);

        try {
            let deals = parser.parse('deals', dealsFile);
            let operations = parser.parse('operations', operationsFile);
            let payments = (paymentsFile) ? parser.parse('payments', paymentsFile) : null;

            this.db.addPortfolio(name, deals, operations, payments);
        } catch(err) {
            console.log('Error: ', err);
        }
    }

    getPortfolioList() {
        return this.db.getPortfolioList();
    }

    getPortfolio() {
        return this.portfolio;
    }

    async buildPortfolio(name) {
        try {
            let db = this.db.getPortfolioByName(name);
            this.portfolio = new Portfolio(db.deals, db.operations, db.payments);
            await this.portfolio.build();
        } catch(err) {
            console.log(`Model error: ${err}`);
        }
    }
}

module.exports = Model;
