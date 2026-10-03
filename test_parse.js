const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'c:/Users/hikai/Desktop/visual studio/didi/1-Weekly Schedule of PGDM - II (205-27) Term - V during Oct. 05 - 11, 2026_3531933621505989921.pdf';

async function parse() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  console.log(data.text);
}

parse().catch(console.error);
