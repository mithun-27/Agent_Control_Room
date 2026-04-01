"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon, PlayIcon, ReloadIcon, RocketIcon } from "@radix-ui/react-icons";

export default function Dashboard() {
  const [runs, setRuns] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRuns = async () => {
    try {
      const res = await fetch("http://localhost:8000/runs");
      const data = await res.json();
      setRuns(data);
    } catch (err) {
      console.error("Failed to fetch runs", err);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  const createRun = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/runs?user_input=${encodeURIComponent(input)}`, {
        method: "POST",
      });
      const data = await res.json();
      await fetch(`http://localhost:8000/runs/${data.id}/execute`, { method: "POST" });
      setInput("");
      fetchRuns();
    } catch (err) {
      console.error("Failed to create run", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Agent Control Room
            </h1>
            <p className="text-gray-400 mt-2">Chrome DevTools for AI Agents</p>
          </div>
          <div className="flex gap-4">
             <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-widest">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-green-400">Operational</span>
                </div>
             </div>
          </div>
        </header>

        {/* Input Section */}
        <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 mb-12 shadow-2xl">
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your agent something..."
              className="flex-1 bg-[#222] border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
            />
            <button
              onClick={createRun}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
              {loading ? <ReloadIcon className="animate-spin" /> : <PlayIcon />}
              {loading ? "Launching..." : "Run Agent"}
            </button>
          </div>
        </div>

        {/* Runs List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {runs.map((run) => (
            <Link key={run.id} href={`/run/${run.id}`}>
              <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-blue-500/5 backdrop-blur-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    run.status === "success" ? "bg-green-500/10 text-green-400" : 
                    run.status === "failure" ? "bg-red-500/10 text-red-400" : 
                    "bg-blue-500/10 text-blue-400"
                  }`}>
                    {run.status}
                  </span>
                  <span className="text-gray-500 text-xs font-mono">
                    {new Date(run.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-blue-400 transition-colors">
                  {run.user_input}
                </h3>
                <p className="text-gray-400 text-sm mt-2 line-clamp-2 min-h-[40px]">
                  {run.final_output || "Awaiting execution..."}
                </p>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Latency</p>
                      <p className="text-xs font-medium">{run.total_latency?.toFixed(0) || 0} ms</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Cost</p>
                      <p className="text-xs font-medium text-green-400">${run.total_cost.toFixed(4)}</p>
                    </div>
                  </div>
                  <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <RocketIcon />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
