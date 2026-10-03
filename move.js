const fs = require('fs');
const p = './src/data/timetable_data.json';
let d = JSON.parse(fs.readFileSync(p, 'utf8'));

d.schedule.forEach(s => {
  if (s.slotText.includes('DSL1-A') || s.slotText.includes('DSL1-B')) {
    s.day = 'Sat';
  }
});

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Moved DSL to Saturday');
