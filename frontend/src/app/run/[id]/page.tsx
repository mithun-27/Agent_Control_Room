"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CubeIcon, ComponentInstanceIcon, ClockIcon, TokensIcon, ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";

export default function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<any>(null);
  const [showFullResponse, setShowFullResponse] = useState(false);

  const fetchRun = async () => {
    try {
      const res = await fetch(`http://localhost:8000/runs/${id}`);
      const data = await res.json();
      setRun(data);
    } catch (err) {
      console.error("Failed to fetch run details", err);
    }
  };

  useEffect(() => {
    fetchRun();
    const interval = setInterval(fetchRun, 3000);
    return () => clearInterval(interval);
  }, [id]);

  if (!run) return <div className="text-white p-8">Loading...</div>;

  const truncate = (text: string, length: number) => {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/">
          <div className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8 cursor-pointer group">
            <ArrowLeftIcon className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </div>
        </Link>
        <header className="mb-12">
          <div className="flex gap-4 items-center mb-4">
            <h1 className="text-3xl font-bold">Run Explorer</h1>
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
              run.status === "success" ? "bg-green-500/10 text-green-400" : 
              run.status === "failure" ? "bg-red-500/10 text-red-400" : 
              "bg-blue-500/10 text-blue-400"
            }`}>
              {run.status}
            </span>
          </div>
          <div className="bg-[#161616] p-4 rounded border border-gray-800 font-mono text-sm shadow-inner">
            <span className="text-blue-400">{"> "}</span> {run.user_input}
          </div>
        </header>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ComponentInstanceIcon className="text-blue-500" /> Trace Timeline
            </h2>
            <div className="relative border-l-2 border-gray-800 ml-4 pl-8 space-y-12">
              {run.steps.map((step: any, index: number) => (
                <div key={step.id} className="relative group">
                  <div className="absolute -left-11 top-0 w-6 h-6 rounded-full bg-[#111] border-2 border-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-125 transition-transform"></div>
                  </div>
                  <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 group-hover:border-blue-500/30 transition-all hover:bg-[#1a1a1a]">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-2 items-center">
                        <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                          {step.step_type}
                        </span>
                        <h3 className="font-medium text-gray-200">
                          {step.step_type === "LLM" ? "Inference call" : "Tool invocation"}
                        </h3>
                      </div>
                      <span className="text-xs text-gray-500 font-mono italic">
                        {step.latency.toFixed(0)} ms
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm font-mono leading-relaxed">
                      <div className="bg-[#0a0a0a] p-4 rounded border border-gray-800/50">
                        <p className="text-gray-500 mb-2 uppercase text-[10px]">Input</p>
                        <pre className="text-blue-300 max-h-32 overflow-auto whitespace-pre-wrap">{JSON.stringify(step.input, null, 2)}</pre>
                      </div>
                      <div className="bg-[#0a0a0a] p-4 rounded border border-gray-800/50">
                        <p className="text-gray-500 mb-2 uppercase text-[10px]">Output</p>
                        <pre className="text-green-300 max-h-32 overflow-auto whitespace-pre-wrap">{JSON.stringify(step.output, null, 2)}</pre>
                      </div>
                    </div>
                    {step.step_type === "LLM" && (
                    <div className="flex gap-4 mt-4 pt-4 border-t border-gray-800 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <TokensIcon className="w-3" />
                            <span>{step.output.tokens} tokens</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-green-400/80">
                            <span>$ {step.cost.toFixed(4)}</span>
                        </div>
                    </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-xl p-8 mt-12 shadow-xl shadow-green-900/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-green-400 font-bold text-lg">Final Response</h3>
                    <button 
                        onClick={() => setShowFullResponse(!showFullResponse)}
                        className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors uppercase tracking-widest font-bold"
                    >
                        {showFullResponse ? <>Collapse <ChevronUpIcon/></> : <>Expand <ChevronDownIcon/></>}
                    </button>
                </div>
               <div className={`prose prose-invert max-w-none prose-sm font-sans leading-relaxed text-gray-300 ${!showFullResponse ? 'max-h-32 overflow-hidden relative' : ''}`}>
                  <ReactMarkdown>
                    {showFullResponse ? run.final_output : truncate(run.final_output, 300)}
                  </ReactMarkdown>
                  {!showFullResponse && run.final_output?.length > 300 && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d1610] to-transparent"></div>
                  )}
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CubeIcon className="text-purple-500" /> Run Analytics
            </h2>
            <div className="bg-[#161616] border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Cost</p>
                  <p className="text-3xl font-bold text-green-400">${run.total_cost.toFixed(6)}</p>
               </div>
               <div className="mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Steps</p>
                  <p className="text-3xl font-bold">{run.steps.length}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Run Started</p>
                  <p className="text-sm text-gray-400">{new Date(run.created_at).toLocaleString()}</p>
               </div>
            </div>

            <div className="bg-[#161616] border border-gray-800 rounded-xl p-6">
               <h4 className="text-sm font-semibold mb-4">Metadata</h4>
               <div className="space-y-4 font-mono text-[11px]">
                  <div>
                    <span className="text-gray-500 block mb-1">RUN ID</span>
                    <span className="text-blue-500">{run.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">MODEL_ID</span>
                    <span className="text-gray-300">nvidia/nemotron-3-super-120b-a12b</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">PLATFORM</span>
                    <span className="text-gray-300">OpenRouter (NVIDIA Compute)</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
