async function onPageLoaded(event) {
    const req = await window.ipc.invoke('get-portfolio-list');

    const app = Vue.createApp({
        data() {
            return {list: req.list}
        }
    });

    const wm = app.mount('#appContainer');

    const forms = document.getElementsByClassName('needs-validation');

    Array.prototype.filter.call(forms, function(form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            event.stopPropagation();

            const select = document.getElementsByTagName("select");

            window.ipc.send('select-portfolio', {name: select[0].value});
        });
    });
}

document.addEventListener('DOMContentLoaded', onPageLoaded);
