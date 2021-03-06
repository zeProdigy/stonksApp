const fetch = require("node-fetch");
const securities = require('./securities');
const xirr = require('xirr');


class Assets {
    constructor(list) {
        let assets = {};

        list.forEach(type => {
            assets[type] = {
                "type": type,
                "currValue": 0,
                "gain": 0,
                "share": 0,
            };
        });

        return assets;
    }
}


class Portfolio {
    constructor(deals, operations, payments, onDate=null) {
        this.shares = {};
        this.bonds = {};

        if (onDate === null) {
            this.deals      = deals;
            this.operations = operations;
            this.payments   = payments;
        } else {
            const date = new Date(onDate);
            this.deals      = deals.filter(deal => deal.date <= date);
            this.operations = operations.filter(op => op.date <= date);
            this.payments   = payments.filter(payment => payment.date <= date);
        }

        this.onDate = onDate;

        this.cash = {
            "in": 0,
            "out": 0,
            "val": 0,
        };

        this.commission = {
            "broker": 0,
            "tradingSystem": 0,
            "depository": 0,
            "val": 0,
        };

        // Врямя существования портфеля
        this.lifetime = 0;

        // Активы
        this.assets = new Assets(["cash", "shares", "bonds", "all"]);

        // прибыль
        this.return = {
            "closedDeals": 0,
            "exchangeGain": 0,
            "dividends": 0,
            "coupons": 0,
            "total": 0,
        };

        // объёмы торгов
        this.volume = {
            "shares": 0,
            "bonds": 0,
            "etfs": 0,
            "overall": 0
        };

        // доходность XIRR
        this.xirr = 0;
    }

    async build() {
        let securitiesList = {};

        for (let deal of this.deals) {
            if (!(deal.secid in securitiesList)) {
                securitiesList[deal.secid] = deal.securityType;
            }
        }

        let promises = Object.entries(securitiesList).map(([secid, type]) =>
            this.buildSecurity(secid, type, this.onDate)
        );

        await Promise.all(promises);

        this.calcCash();
        this.calcLifetime();
        this.calcMarketValue();
        this.calcReturn();
        this.calcVolumes();
        this.calcXirr();
    }

    async buildSecurity(secid, type, onDate) {
        let deals = this.deals.filter(deals => deals.secid === secid);
        let payments = this.payments.filter(payment => payment.secid === secid);

        switch(type) {
            case 'Акция':
            case 'Пай':
            case 'Депозитарная расписка':
                this.shares[secid] = new securities.Share(secid, deals, payments);
                await this.shares[secid].build(onDate);
                break;

            case 'Облигация':
                this.bonds[secid] = new securities.Bond(secid, deals, payments);
                await this.bonds[secid].build(onDate);
                break;

            default:
                throw new Error(`Unhandled type of security: ${secid}:${type}`);
        }
    }

    calcCash() {
        this.operations.forEach(op => {
            switch(op.operation) {
                case "Ввод ДС":
                    this.cash.in += op.volume;
                    break;

                case "Вывод ДС":
                    this.cash.out += op.volume;
                    break;

                case "Перевод ДС":
                    if (op.contract === op.to_contract) {
                        this.cash.in += op.volume;
                    } else {
                        this.cash.out += op.volume;
                    }
                    break;

                case "Списание комиссии":
                    switch(op.desc) {
                        case "Списание комиссии ТС":
                            this.commission.tradingSystem += op.volume;
                            break;

                        case "Списание комиссии брокера":
                            this.commission.broker += op.volume;
                            break;

                        case "Оплата депозитарных услуг":
                            this.commission.depository += op.volume;
                            break;

                        default:
                            throw new Error(`Unhandled type of commission: ${op.operation.desc}`);

                    }
                    break;

                case "Зачисление дивидендов":
                case "Зачисление купона":
                case "Зачисление суммы от погашения ЦБ":
                    // Дивиденды и купоны могут выводиться на внешний счёт,
                    // поэтому не учитываем их при рассчёте остатка. Дивиденды
                    // беруться из таблицы с выплатами, купоны и погашение
                    // облигаций рассчитываются на основании информации с биржи.
                    break;

                default:
                    throw new Error(`Unhandled type of operation: ${op.operation}`);
            }
        });

        this.cash.val = this.cash.in - this.cash.out;

        // Начальное значение средств на счёте, доступное для операций
        this.assets.cash.currValue = this.cash.val;

        this.deals.forEach(deal => {
            switch (deal.operation) {
                case "Покупка":
                    this.assets.cash.currValue -= deal.income;
                    break;

                case "Продажа":
                    this.assets.cash.currValue += deal.income;
                    break;

                default:
                    throw new Error(`Unhandled type of operation: ${deal.operation}`);
            }
        });

        Object.values(this.shares).forEach(share => {
            this.assets.cash.currValue += share.dividends;
        });

        Object.values(this.bonds).forEach(bond => {
            this.assets.cash.currValue += bond.coupons;
            this.assets.cash.currValue += bond.repaid;
        });

        this.assets.cash.currValue =
            Number(this.assets.cash.currValue.toFixed(2));

        this.commission.broker = Number(this.commission.broker.toFixed(2));
        this.commission.tradingSystem =
            Number(this.commission.tradingSystem.toFixed(2));
        this.commission.val =
            Number((
                this.commission.broker +
                this.commission.tradingSystem)
                .toFixed(2));
    }

    calcLifetime() {
        const now = (this.onDate === null) ? Date.now() : new Date(this.onDate);
        const firstOperation = new Date(this.operations[0].date);   // считаем от времени первой сделки
        this.lifetime = Math.round((now - firstOperation.valueOf()) / (1000 * 60 * 60 * 24));
    }

    calcMarketValue() {
        Object.values(this.shares).forEach(share => {
            this.assets.shares.currValue += share.currValue;
            this.assets.shares.gain += share.exchangeGain;
        });

        this.assets.shares.currValue = Number(
            this.assets.shares.currValue.toFixed(2));

        Object.values(this.bonds).forEach(bond => {
            this.assets.bonds.currValue += bond.currValue;
            this.assets.bonds.gain += bond.exchangeGain;
        });

        this.assets.bonds.currValue = Number(
            this.assets.bonds.currValue.toFixed(2));

        this.assets.all.currValue =
            Number((this.assets.shares.currValue +
                    this.assets.bonds.currValue +
                    this.assets.cash.currValue)
                    .toFixed(2));

        this.assets.all.gain =
            Number((this.assets.shares.gain +
                    this.assets.bonds.gain +
                    this.assets.cash.gain)
                    .toFixed(2));

        this.assets.cash.share = Number((this.assets.cash.currValue / this.assets.all.currValue * 100).toFixed(2));
        this.assets.shares.share = Number((this.assets.shares.currValue / this.assets.all.currValue * 100).toFixed(2));
        this.assets.bonds.share = Number((this.assets.bonds.currValue / this.assets.all.currValue * 100).toFixed(2));
    }

    calcReturn() {
        Object.values(this.shares).forEach(share => {
            this.return.closedDeals += share.closedDealsReturn;
            this.return.exchangeGain += share.exchangeGain;
            this.return.dividends += share.dividends;
        });

        Object.values(this.bonds).forEach(bond => {
            this.return.closedDeals += bond.closedDealsReturn;
            this.return.exchangeGain += bond.exchangeGain;
            this.return.coupons += bond.coupons;
        });

        this.return.closedDeals  = Number(this.return.closedDeals.toFixed(2));
        this.return.exchangeGain = Number(this.return.exchangeGain.toFixed(2));
        this.return.dividends    = Number(this.return.dividends.toFixed(2));
        this.return.coupons      = Number(this.return.coupons.toFixed(2));

        this.return.total =
            Number(
                (this.return.closedDeals +
                 this.return.exchangeGain +
                 this.return.dividends +
                 this.return.coupons)
                 .toFixed(2));
    }

    calcXirr() {
        let transactions = [];

        this.operations.forEach(op => {
            let volume = 0;

            switch (op.operation) {
                case "Ввод ДС":
                    volume = -op.volume;
                    break;

                case "Вывод ДС":
                    volume = op.volume;
                    break;

                case "Списание комиссии":
                    // volume = op.volume;
                    break;

                case "Зачисление дивидендов":
                    volume = op.volume;
                    break;

                case "Зачисление купона":
                    volume = op.volume;
                    break;

                case "Зачисление суммы от погашения ЦБ":
                    // Погашение облигации. Не влияет
                    break;

                case "Перевод ДС":
                    if (op.contract === op.to_contract) {
                        volume = -op.volume;
                    } else {
                        volume = op.volume;
                    }
                    break;

                default:
                    throw new Error(`Unhandled type of operation: ${op.operation}`);
            }

            if (volume != 0) {
                transactions.push({
                    "amount": volume,
                    "when": new Date(op.date)
                });
            }
        });

        this.payments.forEach(payment => {
            transactions.push({
                "amount": -payment.actually,
                "when": new Date(payment.date)
            });
        });

        transactions.push({
            "amount": this.assets.all.currValue + this.return.dividends + this.return.coupons,
            "when": Date.now()
        });

        try {
            this.xirr = Number((xirr(transactions) * 100).toFixed(2));
        } catch(err) {
            this.xirr = NaN;
            console.log(`Failed to calc XIRR for Portfolio`);
        }
    }

    calcVolumes() {
        this.deals.forEach(deal => {
            switch(deal.securityType) {
                case "Акция":
                case "Депозитарная расписка":
                    this.volume.shares += deal.volume;
                    break;

                case "Облигация":
                    this.volume.bonds += deal.volume;
                    break;

                case "Пай":
                    this.volume.etfs += deal.volume;
                    break;

                default:
                    console.log(`Unhandled type of security: ${deal.securityType}`);
                    break;
            }
        });

        this.volume.overall = this.volume.shares +
                              this.volume.bonds +
                              this.volume.etfs;

        this.volume.shares  = Number((this.volume.shares).toFixed(2));
        this.volume.bonds   = Number((this.volume.bonds).toFixed(2));
        this.volume.etfs    = Number((this.volume.etfs).toFixed(2));
        this.volume.overall = Number((this.volume.overall).toFixed(2));
    }
}


module.exports = Portfolio;
