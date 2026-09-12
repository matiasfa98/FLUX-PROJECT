// src/features/workspace/components/CreateRoomModal.jsx
import React, { useState } from 'react';
import { X, Lock, Globe, Sparkles } from 'lucide-react';

export const CreateRoomModal = ({ isOpen, onClose, onCreate }) => {
  const [roomName, setRoomName] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    const roomId =
      roomName.toLowerCase().replace(/[^a-z0-9]/g, '-') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

    onCreate({
      id: roomId,
      title: roomName.trim(),
      language,
      isPrivate,
      passcode: isPrivate ? passcode : null,
      membersCount: 1,
      createdAt: 'Just now',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="w-full max-w-md bg-[#0d1117] border border-[#1e2538] rounded-lg shadow-2xl p-5 flex flex-col gap-4 text-[#e2e8f0]">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2538]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#6366f1]" />
            <h3 className="font-semibold text-xs tracking-wider uppercase text-white">Initialize Collab Cockpit</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#64748b] hover:text-white rounded transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-[#94a3b8]">ROOM IDENTIFIER / NAME</label>
            <input
              type="text"
              placeholder="e.g. Distributed Consensus Engine"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#07090e] border border-[#1e2538] focus:border-[#6366f1] rounded-md px-3 py-2 text-xs text-[#e2e8f0] outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-[#94a3b8]">CORE RUNTIME</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#07090e] border border-[#1e2538] focus:border-[#6366f1] rounded-md px-2.5 py-2 text-xs text-[#e2e8f0] outline-none cursor-pointer"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-[#94a3b8]">ACCESS LEVEL</label>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-mono border transition-colors cursor-pointer ${
                  isPrivate
                    ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
                    : 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                }`}
              >
                {isPrivate ? <><Lock size={12} /> Private</> : <><Globe size={12} /> Public</>}
              </button>
            </div>
          </div>

          {isPrivate && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-[#94a3b8]">PASSKEY</label>
              <input
                type="password"
                placeholder="Required to enter"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required={isPrivate}
                className="w-full bg-[#07090e] border border-[#1e2538] focus:border-[#6366f1] rounded-md px-3 py-2 text-xs text-[#e2e8f0] outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e2538]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md hover:bg-[#141923] text-xs text-[#94a3b8] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium transition-colors shadow-[0_0_10px_rgba(99,102,241,0.25)] cursor-pointer"
            >
              Deploy Cockpit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};