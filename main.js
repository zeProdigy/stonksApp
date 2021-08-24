const {app, BrowserWindow} = require('electron');
const ipcMain = require('electron').ipcMain;
const path = require('path');
const pug = require('pug');

const Controller = require('./backend/controller');
const Model = require('./backend/model/model');


let mainWindow = null;

const controller = new Controller();
controller.set(new Model(), null);


app.on('ready', () => {
    mainWindow = new BrowserWindow({
        webPreferences: {
            preload: path.join(app.getAppPath(), 'preload.js')
        },
        show: true
    });

    mainWindow.webContents.openDevTools();

    mainWindow.loadFile(path.join(app.getAppPath(), 'assets/pages/login.html'));
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});


ipcMain.handle('page:main', (event, data) => {
    const file = path.join(__dirname, 'assets/templates/portfolio.pug');
    const compiledFunction = pug.compileFile(file);
    const portfolio = Controller.take().getPortfolio();

    return compiledFunction({portfolio: portfolio});
});


ipcMain.handle('page:graph', (event, data) => {
    return '<h1>Page with beautifull graphs';
});


ipcMain.on('create-portfolio', (event, data) => {
    console.log('Input: ', data);
    Controller.take().newPortfolio(data.name, data.files);
    mainWindow.loadFile(path.join(app.getAppPath(), 'assets/pages/index.html'));
});


ipcMain.on('select-portfolio', async (event, data) => {
    console.log('Input: ', data);
    await controller.buildPortfolio(data.name);
    mainWindow.loadFile(path.join(app.getAppPath(), 'assets/pages/index.html'));
});


ipcMain.handle('get-login-page', (event, data) => {
    const portfolioList = controller.getPortfolioList();
    let template;
    let scriptPath = null;
    let templateData = null;

    if (portfolioList.length == 0) {
        template = path.join(__dirname, 'assets/templates/createPortfolio.pug');
        scriptPath = '../js/createPortfolio.js';
    } else {
        template = path.join(__dirname, 'assets/templates/selectPortfolio.pug');
        scriptPath = '../js/selectPortfolio.js';
        templateData = {list: portfolioList};
    }

    const compiledFunction = pug.compileFile(template);

    return {
        HTMLcode: compiledFunction(templateData),
        scriptPath: scriptPath,
    };
});
