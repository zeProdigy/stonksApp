const app = require('electron').app;
const path = require('path');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(path.join(app.getAppPath(), 'temp/db.json'));
const db = lowdb(adapter);

db.defaults({portfolio: []}).write();

class Db {
    constructor() {
    }

    get db() {
        return db;
    }

    print() {
        console.log(db.getState());
    }

    addPortfolio(name, deals, operations, payments) {
        let portfolio = {
            name: name,
            deals: deals,
            operations: operations,
            payments: payments ? payments : []
        };

        this.db.get('portfolio').push(portfolio).write();
    }

    getPortfolioList() {
        let portfolio = db.get('portfolio').value();
        return portfolio.map(item => item.name);
    }

    getPortfolioByName(name) {
        return db.get('portfolio').find({name: name}).value();
    }

    reset(selector) {
        db.set(selector, []).write();
    }

    addDeal(dealRecord) {
        db.get('deals').push(dealRecord).write();
    }

    deleteDeal(dealID) {
        db.get('deals').remove({dealId: dealID}).write();
    }

    getDeal(dealID) {
        return db.get('deals').find({dealId: dealID}).value();
    }

    getDealsToDate(date) {
        let till = new Date(date);
        return db.get('deals').
            filter(item => {
                return item.date <= till
            }).
            value();
    }

    getDealsByTicker(secid) {
        return db.get('deals').
            filter(item => {
                return item.secid === secid
            }).
            value();
    }
}

module.exports = Db;
