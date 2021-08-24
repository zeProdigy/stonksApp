function onFileSelected(event) {
	const filename = this.files[0].name;
    this.labels[0].textContent = filename;
}


function onPageLoaded(event) {
    let inputFile1 = document.getElementById('inputFile1');
    inputFile1.addEventListener('change', onFileSelected);

    let inputFile2 = document.getElementById('inputFile2');
    inputFile2.addEventListener('change', onFileSelected);

    let inputFile3 = document.getElementById('inputFile3');
    inputFile3.addEventListener('change', onFileSelected);

    let nameField = document.getElementById('nameField');

    let forms = document.getElementsByClassName('needs-validation');

    Array.prototype.filter.call(forms, function(form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            event.stopPropagation();

            form.classList.add('was-validated');

            if (form.checkValidity() === true) {
                let data = {
                    name: nameField.value,
                    files: {}
                };

                data.files.operations = inputFile1.files[0].path;
                data.files.deals      = inputFile2.files[0].path;
                data.files.payments   = (inputFile3.files.length > 0) ? inputFile3.files[0].path : null;

                window.ipc.send('create-portfolio', data);
            }
        });
    });
}


document.addEventListener('DOMContentLoaded', onPageLoaded);
