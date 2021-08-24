async function onPageLoaded(event) {
    const data = await window.ipc.invoke('get-login-page');

    const container = document.getElementById('appContent');
    container.innerHTML = data.HTMLcode;

    if (data.scriptPath) {
        const script = document.createElement("script");
        script.src = data.scriptPath;
        container.appendChild(script);
    }
}

document.addEventListener('DOMContentLoaded', onPageLoaded);
