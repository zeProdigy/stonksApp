const moexISS = require('../backend/model/moexISS');


test('req security spec', async () => {
    const spec = await moexISS.spec('PLZL');
    expect(spec.description).toBeDefined();
    expect(spec.mainboard).toBeDefined();
    expect(spec.description["SECID"]).toBe('PLZL');
});


test('req security spec with invalid SECID', async () => {
    const f = async () => {
        await moexISS.spec('LOLKEK');
    };
    await expect(f).rejects.toThrow(Error);
});


test('req security info', async () => {
    const spec = await moexISS.spec('PLZL');
    const info = await moexISS.info(spec.mainboard);
    expect(info.securities).toBeDefined();
    expect(info.marketdata).toBeDefined();
    expect(info.securities["SECID"]).toBe('PLZL');
    expect(info.marketdata["SECID"]).toBe('PLZL');
});


test('req bonds coupons list', async () => {
    const ref = {
        amortizations: [
          {
            isin: 'RU000A100D63',
            name: 'Республика Беларусь 04',
            issuevalue: 5000000000,
            amortdate: '2022-08-03',
            facevalue: 1000,
            initialfacevalue: 1000,
            faceunit: 'RUB',
            valueprc: 100,
            value: 1000,
            value_rub: 1000,
            data_source: 'maturity'
          }
        ],
        coupons: [
          {
            isin: 'RU000A100D63',
            name: 'Республика Беларусь 04',
            issuevalue: 5000000000,
            coupondate: '2020-02-05',
            recorddate: '2020-02-04',
            startdate: '2019-08-07',
            initialfacevalue: 1000,
            facevalue: 1000,
            faceunit: 'RUB',
            value: 43.13,
            valueprc: 8.65,
            value_rub: 43.13
          },
          {
            isin: 'RU000A100D63',
            name: 'Республика Беларусь 04',
            issuevalue: 5000000000,
            coupondate: '2020-08-05',
            recorddate: '2020-08-04',
            startdate: '2020-02-05',
            initialfacevalue: 1000,
            facevalue: 1000,
            faceunit: 'RUB',
            value: 43.13,
            valueprc: 8.65,
            value_rub: 43.13
          },
          {
            isin: 'RU000A100D63',
            name: 'Республика Беларусь 04',
            issuevalue: 5000000000,
            coupondate: '2021-02-03',
            recorddate: '2021-02-02',
            startdate: '2020-08-05',
            initialfacevalue: 1000,
            facevalue: 1000,
            faceunit: 'RUB',
            value: 43.13,
            valueprc: 8.65,
            value_rub: 43.13
          },
          {
            isin: 'RU000A100D63',
            name: 'Республика Беларусь 04',
            issuevalue: 5000000000,
            coupondate: '2021-08-04',
            recorddate: '2021-08-03',
            startdate: '2021-02-03',
            initialfacevalue: 1000,
            facevalue: 1000,
            faceunit: 'RUB',
            value: 43.13,
            valueprc: 8.65,
            value_rub: 43.13
          },
          {
            isin: 'RU000A100D63',
            name: 'Республика Беларусь 04',
            issuevalue: 5000000000,
            coupondate: '2022-02-02',
            recorddate: '2022-02-01',
            startdate: '2021-08-04',
            initialfacevalue: 1000,
            facevalue: 1000,
            faceunit: 'RUB',
            value: 43.13,
            valueprc: 8.65,
            value_rub: 43.13
          },
          {
            isin: 'RU000A100D63',
            name: 'Республика Беларусь 04',
            issuevalue: 5000000000,
            coupondate: '2022-08-03',
            recorddate: '2022-08-02',
            startdate: '2022-02-02',
            initialfacevalue: 1000,
            facevalue: 1000,
            faceunit: 'RUB',
            value: 43.13,
            valueprc: 8.65,
            value_rub: 43.13
          }
        ]
    };
    const spec = await moexISS.spec('RU000A100D63');
    const coupons = await moexISS.coupons(spec.mainboard);
    expect(coupons).toEqual(ref);
});


test('req history of security', async () => {
    const ref = {
        '2021-02-01': { CLOSE: 14793, VOLUME: 236030, VALUE: 3467028932 },
        '2021-02-02': { CLOSE: 14893, VOLUME: 255826, VALUE: 3812223225.5 },
        '2021-02-03': { CLOSE: 14599.5, VOLUME: 153541, VALUE: 2258859485.5 },
        '2021-02-04': { CLOSE: 14454, VOLUME: 157213, VALUE: 2267960205.5 },
        '2021-02-05': { CLOSE: 14600, VOLUME: 126219, VALUE: 1834597929.5 }
    };
    const spec = await moexISS.spec('PLZL');
    const history = await moexISS.history(spec.mainboard, '2021-02-01', '2021-02-07');
    expect(history).toEqual(ref);
});


test('req security price on date', async () => {
    const ref = {
        CLOSE: 330.75, VOLUME: 1452140, VALUE: 479302581
    };
    const spec = await moexISS.spec('MTSS');
    const price = await moexISS.onDate(spec.mainboard, '2021-02-01');
    expect(price).toEqual(ref);
});


test('security history caching', async () => {
    const spec = await moexISS.spec('AFKS');
    const _ = await moexISS.onDate(spec.mainboard, '2021-02-01');
    expect(Object.keys(moexISS.cache.history['AFKS']).length).toBe(101);
});
