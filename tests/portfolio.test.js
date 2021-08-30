const Portfolio = require('../backend/model/portfolio');
const parser = require('../backend/model/dataParser');
const path = require('path');
const { Share } = require('../backend/model/securities');


test('security indicators calc', async () => {
    const deals = parser.parse('deals', path.join(__dirname, 'data/deals_test_1.xlsx'));
    const operations = parser.parse('operations', path.join(__dirname, 'data/income_test_1.xlsx'));

    const share = new Share('LKOH', deals);
    await share.build('2021-08-27');

    expect(share.deals.length).toBe(10);
    expect(share.avgPrice).toBe(4892);
    expect(share.closedDealsReturn).toBe(-14816);
    expect(share.currPrice).toBe(6429.5);
    expect(share.currValue).toBe(12859);
    expect(share.exchangeGain).toBe(3075);
    expect(share.exchangeGainRelative).toBe(31.43);
    expect(share.totalCommissions).toBe(154.46);
    expect(share.quantity).toBe(2);
    expect(share.totalReturn).toBe(-11895.46);
});
