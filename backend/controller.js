let instance = null;


class Controller {
    constructor(model, view) {
        if (!instance) {
            instance = this;
        }

        return instance;
    }

    static take() {
        return instance;
    }

    set(model, view) {
        this.model = model;
        this.view = view;
        console.log('Controller inited');
    }

    onHashChanged(hash) {

    }

    getPortfolioList() {
        return this.model.getPortfolioList();
    }

    getPortfolio() {
        return this.model.getPortfolio();
    }

    async newPortfolio(name, files) {
        this.model.addToDb(name, files.deals, files.operations, files.payments);
    }

    async buildPortfolio(name) {
        await this.model.buildPortfolio(name);
    }

    addDeal(deal) {

    }
}

module.exports = Controller;
