const fs = require('fs');
const p = './src/data/timetable_data.json';
let d = JSON.parse(fs.readFileSync(p, 'utf8'));

// We already removed hyphens from enrolled courses earlier, but let's be sure
d.students.forEach(s => s.enrolled.forEach(e => {
  e.courseCode = e.courseCode.replace(/-/g, '');
}));

// We already removed hyphens from schedule slots earlier, but let's be sure
d.schedule.forEach(s => {
  s.slotText = s.slotText.replace(/^([A-Z0-9]+)-([A-Z])\(/, (m, c, sec) => c.replace(/-/g, '') + '-' + sec + '(');
});

// Now add DSL1-A and DSL1-B to Thursday since they were missing!
d.schedule.push({day:'Thu', time:'08:45 -10:00 am', slotText:'DSL1-A(1)\nNK/LD{C -201}'});
d.schedule.push({day:'Thu', time:'10:15 -11:30 am', slotText:'DSL1-A(2)\nNK/LD{C -201}'});
d.schedule.push({day:'Thu', time:'11:45 am -01:00 pm', slotText:'DSL1-B(1)\nNK/LD{C -201}'});
d.schedule.push({day:'Thu', time:'02:00 -03:15 pm', slotText:'DSL1-B(2)\nNK/LD{C -201}'});

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Added DSL classes to timetable_data.json');
