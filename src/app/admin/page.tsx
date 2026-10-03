"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [weekName, setWeekName] = useState("Week 2 (Oct 12-18)");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [weeks, setWeeks] = useState<any[]>([]);

  const fetchWeeks = () => {
    fetch("/api/list-weeks")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.blobs) {
          setWeeks(data.blobs);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setStatus("Please select a PDF file.");
      return;
    }

    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("weekName", weekName);
    formData.append("password", password);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setStatus("Upload successful!");
        fetchWeeks(); // Refresh list
      } else {
        setStatus("Error: " + data.error);
      }
    } catch (err) {
      setStatus("Upload failed.");
    }
  };

  const handleDelete = async (url: string) => {
    if (!password) {
      setStatus("Please enter the secret password above to delete.");
      return;
    }
    if (!confirm("Are you sure you want to delete this week's PDF?")) return;

    setStatus("Deleting...");
    try {
      const res = await fetch("/api/delete-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Deleted successfully.");
        fetchWeeks(); // Refresh list
      } else {
        setStatus("Error: " + data.error);
      }
    } catch (err) {
      setStatus("Delete failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Dashboard
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New Week</h3>
          <form className="space-y-6" onSubmit={handleUpload}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Secret Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Required for uploading AND deleting"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Week Label (e.g., Week 2)
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  value={weekName}
                  onChange={(e) => setWeekName(e.target.value)}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select PDF File
              </label>
              <div className="mt-1">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload Schedule
              </button>
            </div>
          </form>

          {status && (
            <div className="mt-4 text-center text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-md">
              {status}
            </div>
          )}
        </div>

        {weeks.length > 0 && (
          <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-10">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Uploaded Weeks</h3>
            <ul className="divide-y divide-gray-200">
              {weeks.map((w, i) => {
                const name = w.pathname.replace("schedules/", "").replace(".pdf", "");
                return (
                  <li key={i} className="py-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                    <button
                      onClick={() => handleDelete(w.url)}
                      className="text-xs text-red-600 hover:text-red-900 font-medium px-3 py-1 bg-red-50 hover:bg-red-100 rounded"
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
