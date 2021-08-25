console.log('main.js script is work!');

let table = document.getElementsByClassName("sortable-table");

// TODO! Перенести на страницу с табличками
// table[0].querySelectorAll('th').forEach(th => {
//   	th.addEventListener('click', onColHeaderClick);
// });

function onColHeaderClick(event) {
    let th = event.currentTarget;
    let table = th.closest('table');
    const type = th.dataset.type;

    console.log(`${th.innerHTML} data-type ${th.dataset.type}`);

    sortTable(table, th, type);
}