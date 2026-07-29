import React, { useState } from 'react';
import { POSTGRES_DDL_SCHEMA, PRISMA_SCHEMA, SQL_QUERY_EXAMPLES } from '../../data/sqlSchemaData';
import { Database, Code2, Copy, Check, Terminal, Layers, ArrowRight, Play } from 'lucide-react';

export const SqlSchemaView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'postgres' | 'prisma' | 'queries'>('postgres');
  const [copied, setCopied] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState(SQL_QUERY_EXAMPLES[0].id);

  const currentQuery = SQL_QUERY_EXAMPLES.find((q) => q.id === selectedQueryId) || SQL_QUERY_EXAMPLES[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="view-sql-workbench" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Database Schema & SQL Workbench
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete PostgreSQL DDL, Prisma Schema, Foreign Keys, Indexes, and Operational SQL Queries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              handleCopy(
                activeTab === 'postgres'
                  ? POSTGRES_DDL_SCHEMA
                  : activeTab === 'prisma'
                  ? PRISMA_SCHEMA
                  : currentQuery.code
              )
            }
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Schema Code'}
          </button>
        </div>
      </div>

      {/* Database Entity Relationship Diagram Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Relational Schema Architecture (Foreign Keys Map)
          </h3>
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
            PostgreSQL 16 Compatible
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
          <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300">users</div>
            <div className="text-[10px] text-slate-400">PK: user_id</div>
            <div className="text-[10px] text-slate-400">FK: site_id</div>
            <div className="text-[10px] text-amber-400">role ENUM</div>
          </div>

          <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300">sites</div>
            <div className="text-[10px] text-slate-400">PK: site_id</div>
            <div className="text-[10px] text-slate-400">FK: supervisor_id</div>
            <div className="text-[10px] text-emerald-400">Groups/Sites</div>
          </div>

          <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300">attendance</div>
            <div className="text-[10px] text-slate-400">PK: attendance_id</div>
            <div className="text-[10px] text-slate-400">FK: user_id, site_id</div>
            <div className="text-[10px] text-indigo-400">UNIQUE(user, date)</div>
          </div>

          <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300">payroll</div>
            <div className="text-[10px] text-slate-400">PK: payroll_id</div>
            <div className="text-[10px] text-slate-400">FK: user_id</div>
            <div className="text-[10px] text-emerald-400">GENERATED net_salary</div>
          </div>

          <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300">complaints</div>
            <div className="text-[10px] text-slate-400">PK: complaint_id</div>
            <div className="text-[10px] text-slate-400">FK: user_id, site_id</div>
            <div className="text-[10px] text-red-400">TRIGGER: 3/day MAX</div>
          </div>

          <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300">notices</div>
            <div className="text-[10px] text-slate-400">PK: notice_id</div>
            <div className="text-[10px] text-slate-400">FK: posted_by</div>
            <div className="text-[10px] text-blue-400">target_group</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Schema View */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('postgres')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'postgres'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" /> PostgreSQL SQL DDL
        </button>

        <button
          onClick={() => setActiveTab('prisma')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'prisma'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" /> Prisma Schema File
        </button>

        <button
          onClick={() => setActiveTab('queries')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'queries'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" /> SQL Queries & Aggregations
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'postgres' && (
        <div className="bg-slate-950 rounded-2xl p-4 sm:p-6 text-slate-200 font-mono text-xs shadow-inner overflow-x-auto border border-slate-800 relative">
          <div className="absolute top-3 right-4 text-[10px] text-slate-500 uppercase font-sans">
            CREATE TABLE & TRIGGER STATEMENTS
          </div>
          <pre className="whitespace-pre text-slate-300 leading-relaxed font-mono">
            {POSTGRES_DDL_SCHEMA}
          </pre>
        </div>
      )}

      {activeTab === 'prisma' && (
        <div className="bg-slate-950 rounded-2xl p-4 sm:p-6 text-emerald-400 font-mono text-xs shadow-inner overflow-x-auto border border-slate-800 relative">
          <div className="absolute top-3 right-4 text-[10px] text-slate-500 uppercase font-sans">
            PRISMA SCHEMA (prisma/schema.prisma)
          </div>
          <pre className="whitespace-pre text-emerald-300 leading-relaxed font-mono">
            {PRISMA_SCHEMA}
          </pre>
        </div>
      )}

      {activeTab === 'queries' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {SQL_QUERY_EXAMPLES.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQueryId(q.id)}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  selectedQueryId === q.id
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-[10px] font-bold text-indigo-600 uppercase block">{q.category}</span>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{q.title}</h4>
              </button>
            ))}
          </div>

          <div className="bg-slate-950 rounded-2xl p-5 text-slate-200 font-mono text-xs shadow-inner border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-sans font-sans">
              <div>
                <h4 className="text-sm font-bold text-white">{currentQuery.title}</h4>
                <p className="text-xs text-slate-400">{currentQuery.description}</p>
              </div>

              <button
                onClick={() => handleCopy(currentQuery.code)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Query
              </button>
            </div>

            <pre className="whitespace-pre text-amber-300 leading-relaxed font-mono overflow-x-auto p-2">
              {currentQuery.code}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
