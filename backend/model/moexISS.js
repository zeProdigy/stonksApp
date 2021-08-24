const fetch = require("node-fetch");


class MoexISS {
    constructor() {
        // empty
    }

    static async spec(secid) {
        let spec = {};

        if (secid in this.cache.spec) {
            spec = this.cache.spec[secid];
        } else {
            let url = makeUrl(null, null, null, null, secid, null);
            let res = await request(url);

            if (res.description.data.length === 0) {
                throw new Error(`Can't find security with SECID ${secid}`);
            }

            spec.description = {};
            spec.mainboard = {};

            res.description.data.forEach(item => {
                spec.description[item[0]] = item[2];
            });

            res.boards.columns.map((key, index) => {
                spec.mainboard[key] = res.boards.data[0][index];
            });

            this.cache.spec[secid] = spec;
        }

        return spec;
    }

    static async info(spec) {
        let info = {};

        if (spec.secid in this.cache.info) {
            info = this.cache.info[spec.secid];
        } else {
            let url = makeUrl(null,
                spec.engine,
                spec.market,
                spec.boardid,
                spec.secid,
                null);

            let res = await request(url);

            Object.keys(res).forEach(key => {
                info[key] = {};
                res[key].columns.map((name, index) => {
                    if (res[key].data.length) {
                        info[key][name] = res[key].data[0][index];
                    }
                });
            });

            this.cache.info[spec.secid] = info;
        }

        return info;
    }

    static async dividends(spec) {
        let url = makeUrl(null,
            null,
            null,
            null,
            spec.secid,
            "dividends");
        let res = await request(url);

        if (res.dividends.data.length === 0) {
            return {};
        }

        let divs = {
            currency: res.dividends.data[0][4],
            data: [],
        };

        res.dividends.data.forEach(item => {
            divs.data.push([item[2], item[3]]);
        });

        return divs;
    }

    static async coupons(spec) {
        let url = makeUrl("statistics",
            spec.engine,
            spec.market,
            null,
            null,
            `bondization/${spec.secid}`);
        let res = await request(url);

        let payout = {
            amortizations: [],
            coupons: [],
        };

        for (let data of res.amortizations.data) {
            let obj = {};
            res.amortizations.columns.map((key, index) => {
                obj[key] = data[index];
            });
            payout.amortizations.push(obj);
        }

        for (let data of res.coupons.data) {
            let obj = {};
            res.coupons.columns.map((key, index) => {
                obj[key] = data[index];
            });
            payout.coupons.push(obj);
        }

        return payout;
    }


    static historyCacheInit(secid, from, till) {
        let d1 = new Date(from);
        let d2 = new Date(till);

        let addDay = function(date) {
            date.setDate(date.getDate() + 1);
            return date;
        }

        if (!(secid in this.cache.history)) {
            this.cache.history[secid] = {};
        }

        d2 = addDay(d2); // увеличиваем верхнюю границу на день, что-бы работало до указаной даты включительно

        do {
            if (!(d1 in this.cache.history[secid])) {
                this.cache.history[secid][toDateString(d1)] = {};
            }
            d1 = addDay(d1);
        } while(d1.getTime() !== d2.getTime());
    }

    // http://iss.moex.com/iss/history/engines/stock/markets/shares/boards/TQBR/securities/LKOH.json?iss.meta=on&from=2020-06-1&till=2020-12-30&start=100
    static async history(spec, from, till) {
        let url = makeUrl("history",
            spec.engine,
            spec.market,
            spec.boardid,
            spec.secid,
            null);

        let processed = 0;
        let indexes = {};
        let history = {};
        let columns = ["CLOSE", "VOLUME", "VALUE"];

        this.historyCacheInit(spec.secid, from, till);

        while(true) {
            let query = makeQuery({
                from: `${from}`,
                till: `${till}`,
                start: processed,
            });

            let res = await request(url, query);

            if (res.history.data.length === 0) {
                break;
            } else {
                processed += res.history.data.length;
            }

            if (Object.keys(indexes).length === 0) {
                res.history.columns.forEach((item, index) => {
                    indexes[item] = index;
                });
            }

            res.history.data.forEach(item => {
                let date = item[1];
                history[date] = {};

                columns.forEach(colName => {
                    history[date][colName] = item[indexes[colName]];
                });

                Object.assign(this.cache.history[spec.secid][date], history[date]);
            });
        }

        return history;
    }

    static async onDate(spec, date) {
        let record = {};

        if ((spec.secid in this.cache.history) && (date in this.cache.history[spec.secid])) {
            // not implemented
        } else {
            let till = new Date(date);
            // Запрашиваем от текущей даты на 100 дней вперёд для формирования кэша котировок
            till.setDate(till.getDate() + 100);
            await this.history(spec, date, toDateString(till));
        }

        record = this.cache.history[spec.secid][date];

        return record;
    }
}

// nodejs < v12 не поддерживает статические свойства классов
MoexISS.cache = {
    "spec": {},
    "info": {},
    "history": {},
};


// https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization?from=2020-02-01&till=2020-02-20&start=0&limit=100&iss.only=amortizations,coupons
function makeUrl(opening, engine, market, board, security, ending) {
    let url = 'https://iss.moex.com/iss';

    if (opening) {
        url += `/${opening}`;
    }

    if (engine) {
        url += `/engines/${engine}`;
    }

    if (market) {
        url += `/markets/${market}`;
    }

    if (board) {
        url += `/boards/${board}`;
    }

    if (security) {
        url += `/securities/${security}`;
    }

    if (ending) {
        url += `/${ending}`;
    }

    return url + '.json?';
}


function makeQuery(params) {
    let query = new URLSearchParams({
        "iss.meta": "off",
    });

    if (params) {
        Object.keys(params).forEach(key => {
            query.append(key, params[key]);
        });
    }

    return query;
}


async function request(url, query) {
    query = query || makeQuery();

    console.log(url + query.toString());

    let res = await fetch(url + query.toString());
    if (!res.ok) {
        throw new Error(`${url} fetch error, status: ${res.statusText}`);
    }

    return await res.json();
}


function toDateString(date) {
    return date.getFullYear() + '-' + ("0"+ (date.getMonth() + 1)).slice(-2) + '-' + ("0" + date.getDate()).slice(-2);
}


module.exports = MoexISS;
