document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded!');
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
});


async function onHashChange() {
    const hash = location.hash;
    let scriptPath = null;
    let htmlCode;

    switch(hash) {
        case '#hash1':
            htmlCode = await window.ipc.invoke('page:main');
            scriptPath = "../js/main.js";
            break;

        case '#portfolioShares':
            htmlCode = await window.ipc.invoke('page:portfolioShares');
            break;

        case '#portfolioBonds':
            htmlCode = await window.ipc.invoke('page:portfolioBonds');
            break;

        case '#hash2':
            htmlCode = await window.ipc.invoke('page:graph');
            break;

        default:
            htmlCode = await window.ipc.invoke('page:main');
            scriptPath = "../js/main.js";
    }

    const container = document.getElementById('appContent');
    container.innerHTML = htmlCode;

    if (scriptPath) {
        const script = document.createElement("script");
        script.src = scriptPath;
        container.appendChild(script);
    }
}
