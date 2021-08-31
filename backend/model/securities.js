const fetch = require("node-fetch");
const moexISS = require('./moexISS');
const xirr = require('xirr');


class Security {
    constructor(secid, deals, payments=[]) {
        this.secid = secid;
        this.deals = deals;
        this.payments = payments;

        // количество открытых позиций
        this.quantity = 0;

        // средняя цена открытых позиций (без учёта комиссий)
        this.avgPrice = 0;

        // текущая биржевая цена
        this.currPrice = 0;

        // стоимость открытых позиций по текущей цене
        this.currValue = 0;

        // курсовая прибыль по открытым позициям
        this.exchangeGain = 0;
        this.exchangeGainRelative = 0;

        // прибыль от закрытых сделок (без учёта комиссий)
        this.closedDealsReturn = 0;

        // суммарная прибыль по инструменту за время существования портфеля
        // включает в себя: прибыль от закрытых сделок, курсовую прибыль, дивиденды, купоны, НКД, комиссии
        this.totalReturn = 0;

        // доходность % относительно вложений
        this.totalReturnRate = 0;

        // суммарные дивиденды/купоны
        this.totalPayments = 0;

        // сумарные комиссии
        this.totalCommissions = 0;

        // объём покупок/продаж по инструменту
        this.totalVolumeBuy = 0;
        this.totalVolumeSell = 0;

        // выплаченный НКД (для облигаций, для акций просто будет равен нулю)
        this.paidAccruedInterest = 0;

        // текущий НКД (для облигаций, для акций просто будет равен нулю)
        this.accruedInterest = 0;

        // доходность в процентах годовых. Рассчитана по алгоритму XIRR
        this.xirr = 0;

        // очередь для учёта открытых позиций по принципу FIFO. Первыми закрываются позиции, открытые первыми
        this.fifo = [];

        // общая информация об инструменте с MOEX ISS
        this.name = '';
        this.shortName = '';
        this.isin = '';
        this.faceUnit = '';
        this.type = '';
        this.spec = {};
    }

    async build() {
        let spec = await moexISS.spec(this.secid);

        this.name = spec.description['NAME'];
        this.shortName = spec.description['SHORTNAME'];
        this.isin = spec.description['ISIN'];
        this.faceUnit = spec.description['FACEUNIT'];
        this.type = spec.description['TYPE'];
        this.spec = spec;

        if (this.spec.mainboard.decimals < 2) {
            this.spec.mainboard.decimals = 2;
        }
    }

    processDeals(deals) {
        deals.forEach(deal => {
            this.quantity += deal.quantity;
            this.paidAccruedInterest += deal.accruedInterest;
            this.update(deal);
        });
    }

    update(deal) {
        switch (deal.operation) {
            case "Покупка":
                let record = {
                    "quantity": deal.quantity,
                    "price": deal.price,
                };
                this.fifo.push(record);
                break;

            case "Продажа":
                let reminder = Math.abs(deal.quantity);

                while(reminder > 0) {
                    if (this.fifo[0].quantity <= reminder) {
                        this.updateClosedDealsReturn(this.fifo[0].quantity, this.fifo[0].price, deal.price);
                        reminder -= this.fifo[0].quantity;
                        this.fifo.shift();
                    } else {
                        this.updateClosedDealsReturn(reminder, this.fifo[0].price, deal.price);
                        this.fifo[0].quantity -= reminder;
                        reminder = 0;
                    }
                }
                break;

            default:
                throw new Error(`Unhandled deal operation: ${deal.operation}`);
        }
    }

    updateClosedDealsReturn(quantity, openPrice, closePrice) {
        this.closedDealsReturn += Number(
            (quantity * (closePrice - openPrice))
            .toFixed(this.spec.mainboard.decimals));
    }

    calcAvgPrice() {
        let quantity = 0;
        let volume = 0;

        this.fifo.forEach(item => {
            quantity += item.quantity;
            volume += item.price * item.quantity;
        });

        if (this.quantity > 0) {
            this.avgPrice = Number((volume / quantity).toFixed(this.spec.mainboard.decimals));
        }
    }

    calcExchangeGain() {
        if (this.quantity > 0) {
            this.exchangeGain = Number(
                ((this.currPrice - this.avgPrice) * this.quantity)
                .toFixed(this.spec.mainboard.decimals));

            this.exchangeGainRelative = Number(
                ((this.currPrice / this.avgPrice - 1) * 100)
                .toFixed(this.spec.mainboard.decimals));
        }
    }

    calcTotalReturn() {
        this.payments.forEach(payment => {
            this.totalPayments += payment.actually;
        });

        this.totalReturn = Number(
            (this.closedDealsReturn + this.exchangeGain + this.totalPayments - this.totalCommissions)
            .toFixed(this.spec.mainboard.decimals));
    }

    calcXirr() {
        let transactions = [];

        this.deals.forEach(deal => {
            let volume = (deal.operation === 'Покупка') ? -deal.volume : deal.volume;

            transactions.push({
                "amount": volume,
                "when": new Date(deal.date)
            });
        });

        this.payments.forEach(payment => {
            transactions.push({
                "amount": payment.actually,
                "when": new Date(payment.date)
            });
        });

        // если позиция по инструменту не закрыта, то как-бы продаём по текущей рыночной цене
        if (this.quantity > 0) {
            transactions.push({
                "amount": this.quantity * (this.currPrice + this.accruedInterest),
                "when": Date.now()
            });
        }

        transactions.forEach(t => {
            if (t.amount > 0) {
                this.totalVolumeSell += t.amount;
            }  else {
                this.totalVolumeBuy += -t.amount;
            }
        });

        this.totalReturnRate = Number(((this.totalVolumeSell / this.totalVolumeBuy - 1) * 100).toFixed(2));

        try {
            this.xirr = Number((xirr(transactions) * 100).toFixed(2));
            console.log(`Success XIRR calc: ${this.secid}`);
        } catch(err) {
            this.xirr = NaN;
            console.log(`Failed to calc XIRR for ${this.secid}: ${err}`);
        }
    }

    calcTotalValue() {
        this.currValue = Number((this.quantity * this.currPrice).toFixed(2));
    }

    calcTotalCommission() {
        this.deals.forEach(deal => {
            this.totalCommissions += deal.brokerCommission + deal.tradingSystemCommission;
        });

        this.totalCommissions = Number(this.totalCommissions.toFixed(2));
    }

    calcAll() {
       this.calcAvgPrice();
       this.calcTotalCommission();
       this.calcExchangeGain();
       this.calcTotalReturn();
       this.calcTotalValue();
       this.calcXirr();
    }
}


class Share extends Security {
    constructor(secid, deals, payments=[]) {
        super(secid, deals, payments);
    }

    async build(onDate=null) {
        try {
            await super.build();
        } catch(err) {
            console.log(err);
            return;
        }

        if (onDate === null) {
            let info = await moexISS.info(this.spec.mainboard);

            this.lotSize = info.securities['LOTSIZE'];
            this.currPrice = info.marketdata['LAST'];

            super.processDeals(this.deals);
            super.calcAll();
        } else {
            try {
                let info = await moexISS.onDate(this.spec.mainboard, onDate);

                this.currPrice = info["CLOSE"];

                super.processDeals(this.deals);

                this.calcAvgPrice();
                this.calcTotalCommission();
                this.calcExchangeGain();
                this.calcTotalReturn();
                this.calcTotalValue();
            } catch(err) {
                console.log(err);
            }
        }
    }
}


class Bond extends Security {
    constructor(secid, deals, payments=[]) {
        super(secid, deals, payments);
    }

    async build() {
        await super.build();

        this.lotValue = this.spec.description['FACEVALUE'];

        /*
            в отчёте сбербанка цена облигации указана в %, это не удобно для рассчётов, так
            как тогда придётся практически для всех рассчётов по облигациям делать отдельные формулы,
            а не брать реализованные в родительском классе
        */
        this.fixSberbankReportPrice();

        if (this.spec.mainboard.is_traded) {
            let info = await moexISS.info(this.spec.mainboard);

            this.currPrice = info.marketdata['LCURRENTPRICE'] * this.lotValue / 100;
            this.accruedInterest = info.securities['ACCRUEDINT'];

            super.processDeals(this.deals);
            super.calcAll();
        } else {
            super.processDeals(this.deals);
            super.calcAll();
            console.log(`The ${this.secid} bond is repaid`);
        }
    }

    fixSberbankReportPrice() {
        this.deals.forEach(deal => {
            deal.price *= this.lotValue / 100;
        });
    }

    calcTotalValue() {
        this.currValue = Number(
            ((this.currPrice + this.accruedInterest) * this.quantity)
            .toFixed(2));
    }

    calcTotalReturn() {
        this.payments.forEach(payment => {
            this.totalPayments += payment.actually;
        });

        this.totalReturn = Number(
            (this.closedDealsReturn +
             this.exchangeGain +
             this.totalPayments +
             this.accruedInterest * this.quantity -
             this.paidAccruedInterest -
             this.totalCommissions)
            .toFixed(this.spec.mainboard.decimals));
    }
}


module.exports = {
    Security,
    Share,
    Bond,
};
