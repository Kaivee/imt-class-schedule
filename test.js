const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('c:/Users/hikai/Desktop/visual studio/didi/1-Weekly Schedule of PGDM - II (205-27) Term - V during Oct. 05 - 11, 2026_3531933621505989921.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => {
    console.error(err);
});
