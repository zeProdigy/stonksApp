const Portfolio = require('../backend/model/portfolio');
const parser = require('../backend/model/dataParser');
const path = require('path');


// test('simple portfolio', async () => {

// });

async function main() {
    const deals = parser.parse('deals', path.join(__dirname, 'data/deals_test_1.xlsx'));
    const operations = parser.parse('operations', path.join(__dirname, 'data/income_test_1.xlsx'));

    const portfolio = new Portfolio(deals, operations, []);
    await portfolio.build();

    console.log(portfolio);
}

main();
