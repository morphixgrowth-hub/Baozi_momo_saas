import React, { useState } from 'react';
import { sound } from '../utils/audio';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Code,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const RawSandboxView: React.FC = () => {
  const [prompt, setPrompt] = useState<string>(
    `[Table: 5] I would like to order 1 Kurkure Chicken Momos and 1 Cold Coffee. Please confirm order.`
  );
  const [response, setResponse] = useState<string>('');
  const [detectedMode, setDetectedMode] = useState<string>('MODE_1_CUSTOMER');
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const presets = [
    {
      title: 'Mode 1: Table 5 Confirm Order',
      tag: 'Mode 1 (Order)',
      prompt: `[Table: 5] I would like to order 1 Kurkure Chicken Momos and 1 Cold Coffee. Please confirm order.`,
    },
    {
      title: 'Mode 1: Table 5 Bill Please',
      tag: 'Mode 1 (Bill & 5% GST)',
      prompt: `[Table: 5] Bill please.`,
    },
    {
      title: 'Mode 2: Staff Auth & Options',
      tag: 'Mode 2 (Auth)',
      prompt: `[Staff: Chef Vikram] Connect to dashboard options.`,
    },
    {
      title: 'Mode 2: Mark Table 3 Served',
      tag: 'Mode 2 (KOT Status)',
      prompt: `[Staff: Chef Vikram] Mark Table 3 as Served`,
    },
    {
      title: 'Mode 2: Settle Table 7',
      tag: 'Mode 2 (Clear Table)',
      prompt: `[Staff: Manager Rajesh] Settle Table 7`,
    },
  ];

  const handleRunPrompt = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    sound.playTap();
    setResponse('');
    setParsedJson(null);

    try {
      const res = await fetch('/api/ai/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      setResponse(data.response || '');
      setDetectedMode(data.mode || 'UNKNOWN');
      setParsedJson(data.parsedJson || null);
      sound.playKitchenChime();
    } catch (e) {
      console.error(e);
      setResponse('Error communicating with AI Engine endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMode1 = prompt.trim().startsWith('[Table:');
  const isMode2 = prompt.trim().startsWith('[Staff:');

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 p-4 sm:p-6 overflow-y-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-2xs">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Restaurant SaaS Central AI Engine Sandbox
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify <code className="text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded font-mono text-[11px] border border-blue-200 font-semibold">[Table: X]</code> (Customer) & <code className="text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded font-mono text-[11px] border border-blue-200 font-semibold">[Staff: &lt;User&gt;]</code> (Staff) triggers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 font-medium">Engine:</span>
          <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold">
            gemini-3.8-flash
          </span>
        </div>
      </div>

      {/* Preset Trigger Buttons */}
      <div className="mt-4">
        <label className="block text-xs font-mono uppercase font-bold text-slate-500 mb-2">
          Trigger Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(p.prompt);
                sound.playTap();
              }}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs flex items-center gap-2 transition-all hover:border-blue-400 shadow-2xs font-medium"
            >
              <span className="text-blue-700 font-mono font-bold text-[11px]">{p.tag}</span>
              <span className="text-slate-800">{p.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Prompt Input & AI Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5 flex-1">
        {/* Left Column: Prompt Input */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 font-mono">
              <span>RAW SYSTEM PROMPT INPUT</span>
              {isMode1 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold">
                  Mode 1: [Table: X]
                </span>
              )}
              {isMode2 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 font-mono font-bold">
                  Mode 2: [Staff: &lt;Name&gt;]
                </span>
              )}
            </label>
          </div>

          <textarea
            rows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed transition-all"
          />

          <div className="pt-2 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-mono">
              Strict menu items only • JSON schema validated
            </div>

            <button
              onClick={handleRunPrompt}
              disabled={isLoading || !prompt.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-40 shadow-xs"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Execute Trigger</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Output & Schema Validator */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AI ENGINE RESPONSE</span>
              {detectedMode && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold">
                  {detectedMode}
                </span>
              )}
            </label>

            {response && (
              <button
                onClick={handleCopy}
                className="text-xs text-slate-600 hover:text-blue-700 flex items-center gap-1 font-semibold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div className="w-full flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed min-h-48 shadow-2xs">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-500 space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Central AI Engine generating response...</span>
              </div>
            ) : response ? (
              response
            ) : (
              <span className="text-slate-400">
                Execute a prompt to test the Central AI Engine.
              </span>
            )}
          </div>

          {/* Parsed JSON Block Inspection */}
          {parsedJson && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Backend JSON Synced</span>
                </span>
                <span className="text-amber-300">Role: {parsedJson.role}</span>
              </div>
              <pre className="text-[10px] text-slate-200 overflow-x-auto">
                {JSON.stringify(parsedJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
