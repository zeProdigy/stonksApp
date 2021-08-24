const XLSX = require('xlsx');
const utils = require('./utils');


class DataParser {
    static parse(type, file) {
        let ext = file.split('.').pop();
        let parser;

        switch(ext) {
            case 'xlsx':
                parser = new XLSXParser();
                break;
            default:
                throw new Error(`Unsupported file type *.${ext}`);
        }

        switch(type) {
            case 'deals':
                return parser.deals(file);
            case 'operations':
                return parser.operations(file);
            case 'payments':
                return parser.payments(file);
            default:
                throw new Error(`Unsupported file content type: ${type}`);
        }
    }
}


class XLSXParser {
    constructor() {

    }

    deals(file) {
        let workbook = XLSX.readFile(file);
        let table = workbook.Sheets['Сделки'];
        let rowObjects = XLSX.utils.sheet_to_row_object_array(table,
            {raw: false, dateNF:'dd/mm/yyyy HH:MM'});

        let deals = [];

        for (let row of rowObjects) {
            deals.push(new DealRecord(row));
        }

        // в таблице записи идут от новых к старым, нам удобнее наоборот
        return deals.reverse();
    }

    operations(file) {
        let workbook = XLSX.readFile(file);
        let table = workbook.Sheets['Движение ДС'];
        let rowObjects = XLSX.utils.sheet_to_row_object_array(table,
            {raw: false, dateNF:'dd/mm/yyyy HH:MM'});

        let operations = [];

        for (let row of rowObjects) {
            operations.push(new OperationRecord(row));
        }

        // в таблице записи идут от новых к старым, нам удобнее наоборот
        return operations.reverse();
    }

    payments(file) {
        let workbook = XLSX.readFile(file);
        let table = workbook.Sheets['Лист1'];
        let rowObjects = XLSX.utils.sheet_to_row_object_array(table,
            {raw: false, dateNF:'dd.mm.yyyy'});

        let payments = [];

        for (let row of rowObjects) {
            payments.push(new PaymentRecord(row));
        }

        // в таблице записи идут от новых к старым, нам удобнее наоборот
        return payments.reverse();
    }
}


class DealRecord {
    constructor(tableRow) {
        this.contract = tableRow['Номер договора'];
        this.dealId = tableRow['Номер сделки'];
        this.date = utils.toMoexDateFormat(tableRow['Дата заключения']);
        this.settlementDate = utils.toMoexDateFormat(tableRow['Дата расчётов']);
        this.secid = tableRow['Код финансового инструмента'];
        this.securityType = tableRow['Тип финансового инструмента'];
        this.market = tableRow['Тип рынка'];
        this.operation = tableRow['Операция'];
        this.quantity = Number(tableRow['Количество']);
        this.price = Number(tableRow['Цена']);
        this.accruedInterest = Number(tableRow['НКД']);
        this.volume = Number(tableRow['Объём сделки']);
        this.currency = tableRow['Валюта'];
        this.rate = Number(tableRow['Курс']);
        this.tradingSystemCommission = Number(tableRow['Комиссия торговой системы']);
        this.brokerCommission = Number(tableRow['Комиссия банка']);
        this.income = Number(tableRow['Сумма зачисления/списания']);
        this.dealType = tableRow['Тип сделки'];

        if (this.operation === 'Продажа') {
            this.quantity *= -1;
        } else if (this.operation === 'Покупка') {
            // empty
        } else {
            throw new Error(`Unsupported deal operation: ${deal.operation}`);
        }
    }
}


class OperationRecord {
    constructor(tableRow) {
        this.contract = tableRow['Номер договора'];
        this.date = utils.toMoexDateFormat(tableRow['Дата исполнения поручения']);
        this.operation = tableRow['Операция'];
        this.volume = Number(tableRow['Сумма']);
        this.currency = tableRow['Валюта операции'];
        this.desc = tableRow['Содержание операции'];
        this.from_contract = tableRow['Номер договора списания'];
        this.to_contract = tableRow['Номер договора зачисления'];
    }
}


class PaymentRecord {
    constructor (tableRow) {
        this.secid = tableRow['Код инструмента'];
        this.date = utils.toMoexDateFormat(tableRow['Дата']);
        this.quantity = tableRow['Кол-во'];
        this.payment = Number(tableRow['Купон/дивиденд']);
        this.actually = Number(tableRow['Фактически']);
    }
}


module.exports = DataParser;
