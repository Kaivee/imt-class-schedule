const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = 'c:/Users/hikai/Desktop/visual studio/didi/1-Weekly Schedule of PGDM - II (205-27) Term - V during Oct. 05 - 11, 2026_3531933621505989921.pdf';

async function parse() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  console.log(result.text);
}

parse().catch(console.error);
