"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import baseData from "@/data/timetable_data.json";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type ScheduleSlot = {
  day: string;
  time: string;
  slotText: string;
};

type Enrolled = {
  courseCode: string;
  section: string;
  courseName: string;
};

type Student = {
  rollNo: string;
  name: string;
  major: string;
  minor: string;
  enrolled: Enrolled[];
};

type TimetableData = {
  excelCourseToAbb: Record<string, string>;
  mapping: { courseName: string; abb: string }[];
  students: Student[];
  schedule: ScheduleSlot[];
};

const daysOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseSlot(slotText: string) {
  // Extract course code, section, and session from the first token
  const tokens = slotText.trim().split(/\s+/);
  const first = tokens[0] || "";
  
  const codeMatch = first.match(/^([A-Z0-9]{2,5})-([A-Z])\((\d+)\)$/);
  let courseCode = "";
  let section = "";
  let session = "";
  if (codeMatch) {
    courseCode = codeMatch[1].replace(/-/g, "");
    section = codeMatch[2];
    session = codeMatch[3];
  }
  
  // Faculty and room are usually at the end or in subsequent tokens
  const rest = slotText;
  let faculty = "";
  let room = "";
  const facRoomMatch = rest.match(/([A-Z/]+)\{([^}]+)\}/);
  if (facRoomMatch) {
    faculty = facRoomMatch[1];
    room = facRoomMatch[2];
  }
  
  return { courseCode, section, session, faculty, room, raw: slotText };
}

const areaColor: Record<string, string> = {
  CM: "bg-blue-100 text-blue-800 border-blue-200",
  CWB: "bg-indigo-100 text-indigo-800 border-indigo-200",
  CTM: "bg-cyan-100 text-cyan-800 border-cyan-200",
  CRM: "bg-sky-100 text-sky-800 border-sky-200",
  DSL: "bg-teal-100 text-teal-800 border-teal-200",
  "DSL-1": "bg-teal-100 text-teal-800 border-teal-200",
  DSL1: "bg-teal-100 text-teal-800 border-teal-200",
  PDRM: "bg-purple-100 text-purple-800 border-purple-200",
  BF: "bg-amber-100 text-amber-800 border-amber-200",
  CRA: "bg-orange-100 text-orange-800 border-orange-200",
  FIS: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PAF: "bg-lime-100 text-lime-800 border-lime-200",
  VCPE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ALCM: "bg-rose-100 text-rose-800 border-rose-200",
  CSIW: "bg-pink-100 text-pink-800 border-pink-200",
  LEX: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  DSCS: "bg-green-100 text-green-800 border-green-200",
  LDM: "bg-emerald-100 text-emerald-800 border-emerald-200",
  BAM: "bg-violet-100 text-violet-800 border-violet-200",
  FTBA: "bg-blue-100 text-blue-800 border-blue-200",
  BIBC: "bg-slate-100 text-slate-800 border-slate-200",
  ITC: "bg-gray-100 text-gray-800 border-gray-200",
  MDP: "bg-cyan-100 text-cyan-800 border-cyan-200",
  CL2: "bg-stone-100 text-stone-800 border-stone-200",
  CCR: "bg-red-100 text-red-800 border-red-200",
  EF: "bg-amber-100 text-amber-800 border-amber-200",
  HRST: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

export default function Home() {
  const [rollNo, setRollNo] = useState("");
  const [view, setView] = useState<"grid" | "agenda" | "pdf">("grid");
  const [data, setData] = useState<TimetableData>(baseData as TimetableData);
  const [scheduleJson, setScheduleJson] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeekUrl, setSelectedWeekUrl] = useState<string>("base");
  const [exporting, setExporting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const students = data.students as Student[];
  const schedule = data.schedule as ScheduleSlot[];

  // Removed localStorage logic so the grid reliably loads baseData
  useEffect(() => {
    localStorage.removeItem("timetable_data");
    // Fetch uploaded weeks
    fetch("/api/list-weeks", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.blobs) {
          setWeeks(data.blobs);
        }
      })
      .catch(console.error);
  }, []);

  const student = useMemo(() => {
    if (!rollNo) return null;
    const normalized = rollNo.trim();
    return students.find((s) => s.rollNo === normalized) || null;
  }, [rollNo, students]);

  const enrolledKeys = useMemo(() => {
    if (!student) return new Set<string>();
    const keys = new Set<string>();
    for (const e of student.enrolled) {
      const code = e.courseCode.replace(/-/g, "");
      keys.add(`${code}-${e.section}`);
    }
    return keys;
  }, [student]);

  const enrolledMap = useMemo(() => {
    if (!student) return new Map<string, Enrolled>();
    const m = new Map<string, Enrolled>();
    for (const e of student.enrolled) {
      m.set(e.courseCode.replace(/-/g, ""), e);
    }
    return m;
  }, [student]);

  const filteredSchedule = useMemo(() => {
    if (!student) return [];
    return schedule
      .map((s) => ({ ...s, parsed: parseSlot(s.slotText) }))
      .filter((s) => enrolledKeys.has(`${s.parsed.courseCode}-${s.parsed.section}`))
  }, [student, schedule, enrolledKeys]);

  const uniqueTimes = useMemo(() => {
    const times = new Set<string>();
    for (const s of schedule) times.add(s.time);
    
    // Sort times
    const parseTime = (tStr: string) => {
      const match = tStr.match(/(\d{2}):(\d{2})\s*(am|pm)?/i);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      
      let ampm = match[3];
      if (!ampm) {
        // Look ahead for am/pm at the end of the string
        const endMatch = tStr.match(/(am|pm)/i);
        if (endMatch) ampm = endMatch[1];
      }
      
      if (ampm && ampm.toLowerCase() === "pm" && h < 12) h += 12;
      if (ampm && ampm.toLowerCase() === "am" && h === 12) h = 0;
      
      return h * 60 + m;
    };
    
    return Array.from(times).sort((a, b) => parseTime(a) - parseTime(b));
  }, [schedule]);

  const scheduleByDay = useMemo(() => {
    const grouped: Record<string, typeof filteredSchedule> = {};
    for (const d of daysOrder) grouped[d] = [];
    for (const s of filteredSchedule) {
      if (grouped[s.day]) grouped[s.day].push(s);
    }
    return grouped;
  }, [filteredSchedule]);

  const getCourseName = (code: string) => {
    const e = enrolledMap.get(code.replace(/-/g, ""));
    if (e?.courseName) return e.courseName;
    return code;
  };

  const exportPDF = async () => {
    if (!gridRef.current || !student) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(gridRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`Timetable_${student.rollNo}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
      alert("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <main className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
            Personalized Student Timetable
          </h1>
          <p className="mt-2 text-gray-600">
            Enter your Roll Number to view your weekly class schedule
          </p>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label
                htmlFor="rollNo"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Roll Number
              </label>
              <input
                type="text"
                id="rollNo"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g., 250101004"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col">
                <label className="mb-2 block text-sm font-medium text-gray-700">Select Week</label>
                <select 
                  className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedWeekUrl}
                  onChange={(e) => setSelectedWeekUrl(e.target.value)}
                >
                  <option value="base">Base Week (Personalized Grid)</option>
                  {weeks.map((w, i) => {
                    const name = w.pathname.replace('schedules/', '').replace('.pdf', '');
                    return (
                      <option key={i} value={w.url}>{name}</option>
                    )
                  })}
                </select>
              </div>
              
              {selectedWeekUrl === "base" && student && filteredSchedule.length > 0 && (
                <button
                  onClick={exportPDF}
                  disabled={exporting}
                  className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {exporting ? "Saving..." : "Save as PDF"}
                </button>
              )}
            </div>
          </div>

          {selectedWeekUrl === "base" && rollNo && !student && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
              Roll number not found. Please check and try again.
            </div>
          )}



          {student && (
            <div className="mt-6 rounded-lg bg-blue-50 p-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {student.name}
              </h2>
              <p className="mt-1 text-gray-600">
                Roll No: <span className="font-medium">{student.rollNo}</span>
              </p>
              {student.major && (
                <p className="text-gray-600">Major: {student.major}</p>
              )}
              {student.minor && (
                <p className="text-gray-600">Minor: {student.minor}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {student.enrolled.map((e, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                  >
                    {e.courseCode}-{e.section} • {e.courseName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedWeekUrl !== "base" && (
          <div className="rounded-lg bg-white p-4 shadow-sm h-[800px]">
            <iframe src={selectedWeekUrl} className="w-full h-full rounded border-0" />
          </div>
        )}

        {selectedWeekUrl === "base" && student && filteredSchedule.length === 0 && (
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <p className="text-gray-600">
              No classes found for your enrolled courses in the current
              schedule.
            </p>
          </div>
        )}

        {selectedWeekUrl === "base" && student && filteredSchedule.length > 0 && (
          <div ref={gridRef} className="overflow-x-auto rounded-lg bg-white shadow-sm border border-gray-200">
            <div className="p-4 bg-white border-b border-gray-200 block md:hidden">
              <h3 className="text-lg font-bold">{student.name} ({student.rollNo})</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200 table-fixed bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-r border-gray-200">
                    Time
                  </th>
                  {daysOrder.map((day) => (
                    <th key={day} className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 border-r border-gray-200 last:border-0">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {uniqueTimes.map((time) => (
                  <tr key={time} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-gray-700 border-r border-gray-200 align-top">
                      {time}
                    </td>
                    {daysOrder.map((day) => {
                      const classes = filteredSchedule.filter(s => s.day === day && s.time === time);
                      return (
                        <td key={day} className="px-2 py-2 border-r border-gray-200 last:border-0 align-top min-w-[150px]">
                          {classes.map((s, idx) => {
                            const p = s.parsed;
                            const color = areaColor[p.courseCode] || "bg-gray-100 text-gray-800 border-gray-200";
                            return (
                              <div key={idx} className={`mb-2 last:mb-0 rounded-lg border p-2 ${color} shadow-sm`}>
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between items-start">
                                    <span className="font-bold text-xs">{p.courseCode}-{p.section}</span>
                                    {p.session && (
                                      <span className="rounded bg-white/60 px-1 py-0.5 text-[10px] font-medium leading-none">
                                        S{p.session}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] leading-tight opacity-90 truncate" title={getCourseName(p.courseCode)}>
                                    {getCourseName(p.courseCode)}
                                  </span>
                                  <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] font-medium opacity-75">
                                    {p.room && <span>{p.room}</span>}
                                    {p.faculty && <span>{p.faculty}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        

      </main>
    </div>
  );
}
