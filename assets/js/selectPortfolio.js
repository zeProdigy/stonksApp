let forms = document.getElementsByClassName('needs-validation');

Array.prototype.filter.call(forms, function(form) {
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        event.stopPropagation();

        let select = document.getElementsByTagName("select");

        window.ipc.send('select-portfolio', {name: select[0].value});
    });
});
