function toISODateFormat(date) {
	let a = date.split(/\/| |:/);
    return a[2] + '-' + a[1] + '-' + a[0] + 'T' + a[3] + ':' + a[4] + ':00';
}

function toMoexDateFormat(date) {
    let a = date.split(/[.,:\/ -]/);
    return new Date(a[2], a[1] - 1, a[0]);
}

module.exports.toISODateFormat = toISODateFormat;
module.exports.toMoexDateFormat = toMoexDateFormat;