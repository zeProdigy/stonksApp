let is_up = false;


function sortTable(table, col, type) {
	const index = col.cellIndex;	// номер столбца
    const tbody = table.tBodies[0];
    const thead = table.tHead;
    const arr = Array.from(tbody.rows);

    let compareUp, compareDown;

    switch(type) {
        case "number":
            compareUp = (rowA, rowB) => {
                return +rowA.cells[index].innerHTML > +rowB.cells[index].innerHTML ? 1 : -1;
            }

            compareDown = (rowA, rowB) => {
                return +rowA.cells[index].innerHTML < +rowB.cells[index].innerHTML ? 1 : -1;
            }
            break;

        default:
            compareUp = (rowA, rowB) => {
                return rowA.cells[index].innerHTML > rowB.cells[index].innerHTML ? 1 : -1;
            }

            compareDown = (rowA, rowB) => {
                return rowA.cells[index].innerHTML < rowB.cells[index].innerHTML ? 1 : -1;
            }
    }

    const compare = (is_up) ? compareUp : compareDown;
    is_up = !is_up;

    arr.sort(compare);
    tbody.append(...arr);
}