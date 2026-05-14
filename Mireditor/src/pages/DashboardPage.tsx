import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import { API_URL } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';

const ipcRenderer = typeof window !== 'undefined' && (window as any).require
  ? (window as any).require('electron').ipcRenderer
  : null;

export interface ProjectConfig {
  title: string;
  width: number;
  height: number;
  background: 'white' | 'transparent' | 'custom';
  customColor?: string;
}

interface DashboardPageProps {
  onOpenEditor: (config?: ProjectConfig) => void;
}

interface ProjectItem {
  id: number;
  title: string;
  file_path: string;
  file_size_kb: number;
  last_modified: string;
  is_cloud_synced: boolean;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── SVG Icons ───
const Icons = {
  newFile: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  folder: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  ),
  template: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  cloud: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  video: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ─── Settings Modal ───
function SettingsModal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={modalRef} className="relative w-[520px] max-h-[70vh] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <h2 className="text-white text-sm font-semibold tracking-wide">Ayarlar</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">{Icons.close}</button>
        </div>
        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[55vh]">
          <SettingGroup title="Görünüm">
            <SettingRow label="Tema" value="Koyu" />
            <SettingRow label="Dil" value="Türkçe" />
            <SettingRow label="Font Boyutu" value="14px" />
          </SettingGroup>
          <SettingGroup title="Dışa Aktarma">
            <SettingRow label="Varsayılan Format" value="PNG" />
            <SettingRow label="Kalite" value="Yüksek" />
          </SettingGroup>
          <SettingGroup title="Gelişmiş">
            <SettingRow label="GPU Hızlandırma" value="Açık" />
            <SettingRow label="Otomatik Kayıt" value="30 saniye" />
          </SettingGroup>
        </div>
      </div>
    </div>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[#666] text-[10px] font-bold uppercase tracking-[2px] mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
      <span className="text-[#ccc] text-xs">{label}</span>
      <span className="text-[#555] text-xs">{value}</span>
    </div>
  );
}

// ─── Profile Modal ───
function ProfileModal({ onClose, user }: { onClose: () => void; user: any }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={modalRef} className="relative w-[420px] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <h2 className="text-white text-sm font-semibold tracking-wide">Profil</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">{Icons.close}</button>
        </div>
        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-xl font-bold uppercase">
              {user?.username?.[0] ?? 'U'}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{user?.username ?? 'Kullanıcı'}</p>
              <p className="text-[#555] text-xs mt-0.5">{user?.email ?? 'email@mireditor.com'}</p>
              <p className="text-[#3b82f6] text-[10px] mt-1 font-medium uppercase tracking-wider">
                {user?.role === 'poweruser' ? 'Power User' : 'Standart Kullanıcı'}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              <span className="text-[#ccc] text-xs">Hesap Oluşturma</span>
              <span className="text-[#555] text-xs">Mart 2026</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              <span className="text-[#ccc] text-xs">Toplam Proje</span>
              <span className="text-[#555] text-xs">0</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              <span className="text-[#ccc] text-xs">Kullanılan Alan</span>
              <span className="text-[#555] text-xs">0 MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Templates ───
interface Template {
  id: string;
  name: string;
  category: 'web' | 'sosyal' | 'baski';
  desc: string;
  width: number;
  height: number;
  background: 'white' | 'transparent' | 'custom';
  customColor?: string;
  preview: React.ReactNode;
}

const TemplatePreviews: Record<string, React.ReactNode> = {
  landing: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#f8fafc"/>
      <rect width="160" height="11" fill="#fff" opacity="0.9"/>
      <rect x="6" y="3.5" width="16" height="4" rx="1" fill="#3b82f6"/>
      <rect x="96" y="3.5" width="10" height="4" rx="1.5" fill="#cbd5e1"/>
      <rect x="110" y="3.5" width="10" height="4" rx="1.5" fill="#cbd5e1"/>
      <rect x="124" y="3.5" width="10" height="4" rx="1.5" fill="#cbd5e1"/>
      <rect x="138" y="2.5" width="16" height="6" rx="3" fill="#3b82f6"/>
      <rect x="10" y="22" width="52" height="7" rx="2" fill="#1e293b"/>
      <rect x="10" y="33" width="44" height="3.5" rx="1" fill="#94a3b8"/>
      <rect x="10" y="39" width="38" height="3.5" rx="1" fill="#94a3b8"/>
      <rect x="10" y="49" width="24" height="8" rx="4" fill="#3b82f6"/>
      <rect x="38" y="49" width="18" height="8" rx="4" fill="none" stroke="#cbd5e1" strokeWidth="0.8"/>
      <rect x="82" y="16" width="70" height="62" rx="5" fill="#e2e8f0"/>
      <rect x="88" y="22" width="58" height="40" rx="3" fill="#bfdbfe"/>
      <rect x="100" y="34" width="34" height="16" rx="2" fill="#93c5fd"/>
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#0f172a"/>
      <rect width="32" height="90" fill="#1e293b"/>
      <rect x="6" y="8" width="20" height="5" rx="1" fill="#3b82f6"/>
      <rect x="6" y="20" width="14" height="3" rx="1" fill="#475569"/>
      <rect x="6" y="26" width="18" height="3" rx="1" fill="#64748b"/>
      <rect x="6" y="32" width="16" height="3" rx="1" fill="#475569"/>
      <rect x="6" y="38" width="18" height="3" rx="1" fill="#64748b"/>
      <rect x="6" y="44" width="14" height="3" rx="1" fill="#475569"/>
      <rect x="40" y="8" width="45" height="3" rx="1" fill="#334155"/>
      <rect x="40" y="15" width="28" height="18" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="0.5"/>
      <rect x="44" y="19" width="14" height="3" rx="1" fill="#60a5fa"/>
      <rect x="44" y="24" width="8" height="5" rx="1" fill="#3b82f6"/>
      <rect x="72" y="15" width="28" height="18" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="0.5"/>
      <rect x="76" y="19" width="14" height="3" rx="1" fill="#34d399"/>
      <rect x="76" y="24" width="8" height="5" rx="1" fill="#10b981"/>
      <rect x="100" y="15" width="52" height="18" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="0.5"/>
      <rect x="104" y="19" width="20" height="2" rx="1" fill="#94a3b8"/>
      <rect x="104" y="23" width="40" height="6" rx="1" fill="#334155"/>
      <rect x="104" y="23" width="22" height="6" rx="1" fill="#3b82f6" opacity="0.6"/>
      <rect x="40" y="38" width="112" height="30" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="0.5"/>
      <rect x="44" y="42" width="20" height="2" rx="1" fill="#94a3b8"/>
      <rect x="44" y="48" width="100" height="1.5" rx="0.5" fill="#334155"/>
      <rect x="44" y="52" width="100" height="1.5" rx="0.5" fill="#334155"/>
      <rect x="44" y="56" width="100" height="1.5" rx="0.5" fill="#334155"/>
      <rect x="44" y="60" width="100" height="1.5" rx="0.5" fill="#334155"/>
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#ffffff"/>
      <rect width="160" height="11" fill="#fff"/>
      <rect x="6" y="3.5" width="14" height="4" rx="1" fill="#111"/>
      <rect x="110" y="3.5" width="10" height="4" rx="1.5" fill="#e2e8f0"/>
      <rect x="124" y="3.5" width="10" height="4" rx="1.5" fill="#e2e8f0"/>
      <rect x="138" y="3.5" width="10" height="4" rx="1.5" fill="#e2e8f0"/>
      <rect x="10" y="16" width="140" height="30" rx="4" fill="#f1f5f9"/>
      <rect x="55" y="22" width="50" height="6" rx="2" fill="#1e293b"/>
      <rect x="45" y="31" width="70" height="3" rx="1" fill="#94a3b8"/>
      <rect x="10" y="52" width="44" height="30" rx="3" fill="#e2e8f0"/>
      <rect x="58" y="52" width="44" height="30" rx="3" fill="#bfdbfe"/>
      <rect x="106" y="52" width="44" height="30" rx="3" fill="#bbf7d0"/>
      <rect x="14" y="72" width="24" height="3" rx="1" fill="#94a3b8"/>
      <rect x="62" y="72" width="28" height="3" rx="1" fill="#94a3b8"/>
      <rect x="110" y="72" width="22" height="3" rx="1" fill="#94a3b8"/>
    </svg>
  ),
  blog: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#ffffff"/>
      <rect width="160" height="11" fill="#fff"/>
      <rect x="6" y="3.5" width="18" height="4" rx="1" fill="#111"/>
      <rect x="116" y="3.5" width="10" height="4" rx="1.5" fill="#e2e8f0"/>
      <rect x="130" y="3.5" width="10" height="4" rx="1.5" fill="#e2e8f0"/>
      <rect x="144" y="3.5" width="10" height="4" rx="1.5" fill="#e2e8f0"/>
      <rect x="10" y="15" width="100" height="40" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="14" y="19" width="60" height="5" rx="1.5" fill="#1e293b"/>
      <rect x="14" y="27" width="88" height="2.5" rx="1" fill="#cbd5e1"/>
      <rect x="14" y="32" width="80" height="2.5" rx="1" fill="#cbd5e1"/>
      <rect x="14" y="37" width="84" height="2.5" rx="1" fill="#cbd5e1"/>
      <rect x="14" y="42" width="70" height="2.5" rx="1" fill="#cbd5e1"/>
      <rect x="14" y="48" width="14" height="4" rx="2" fill="#3b82f6" opacity="0.7"/>
      <rect x="114" y="15" width="38" height="52" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="118" y="19" width="30" height="3" rx="1" fill="#94a3b8"/>
      <rect x="118" y="25" width="30" height="14" rx="2" fill="#e2e8f0"/>
      <rect x="118" y="42" width="20" height="2.5" rx="1" fill="#cbd5e1"/>
      <rect x="118" y="47" width="24" height="2.5" rx="1" fill="#cbd5e1"/>
      <rect x="118" y="52" width="20" height="2.5" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="60" width="48" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="62" y="60" width="48" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="14" y="64" width="32" height="3.5" rx="1" fill="#1e293b"/>
      <rect x="14" y="70" width="38" height="2" rx="1" fill="#cbd5e1"/>
      <rect x="14" y="74" width="34" height="2" rx="1" fill="#cbd5e1"/>
      <rect x="66" y="64" width="32" height="3.5" rx="1" fill="#1e293b"/>
      <rect x="66" y="70" width="38" height="2" rx="1" fill="#cbd5e1"/>
      <rect x="66" y="74" width="34" height="2" rx="1" fill="#cbd5e1"/>
    </svg>
  ),
  ecommerce: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#ffffff"/>
      <rect width="160" height="11" fill="#fff"/>
      <rect x="6" y="3.5" width="16" height="4" rx="1" fill="#111"/>
      <rect x="64" y="3" width="32" height="5" rx="2.5" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="138" y="2" width="8" height="7" rx="1.5" fill="none" stroke="#94a3b8" strokeWidth="0.8"/>
      <rect x="144" y="1.5" width="4" height="4" rx="2" fill="#ef4444"/>
      <rect x="10" y="15" width="44" height="56" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="10" y="15" width="44" height="32" rx="3" fill="#dbeafe"/>
      <rect x="14" y="51" width="28" height="4" rx="1" fill="#1e293b"/>
      <rect x="14" y="58" width="16" height="3" rx="1" fill="#3b82f6"/>
      <rect x="14" y="64" width="20" height="5" rx="2.5" fill="#111"/>
      <rect x="58" y="15" width="44" height="56" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="58" y="15" width="44" height="32" rx="3" fill="#d1fae5"/>
      <rect x="62" y="51" width="28" height="4" rx="1" fill="#1e293b"/>
      <rect x="62" y="58" width="16" height="3" rx="1" fill="#3b82f6"/>
      <rect x="62" y="64" width="20" height="5" rx="2.5" fill="#111"/>
      <rect x="106" y="15" width="44" height="56" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="106" y="15" width="44" height="32" rx="3" fill="#fce7f3"/>
      <rect x="110" y="51" width="28" height="4" rx="1" fill="#1e293b"/>
      <rect x="110" y="58" width="16" height="3" rx="1" fill="#3b82f6"/>
      <rect x="110" y="64" width="20" height="5" rx="2.5" fill="#111"/>
    </svg>
  ),
  about: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#0f172a"/>
      <rect width="160" height="11" fill="#1e293b"/>
      <rect x="6" y="3.5" width="16" height="4" rx="1" fill="#60a5fa"/>
      <rect x="126" y="3.5" width="10" height="4" rx="1.5" fill="#334155"/>
      <rect x="140" y="3.5" width="14" height="4" rx="1.5" fill="#3b82f6"/>
      <circle cx="42" cy="50" r="18" fill="#1e293b" stroke="#334155" strokeWidth="0.5"/>
      <circle cx="42" cy="46" r="8" fill="#334155"/>
      <ellipse cx="42" cy="62" rx="12" ry="6" fill="#334155"/>
      <rect x="72" y="24" width="76" height="6" rx="2" fill="#f1f5f9"/>
      <rect x="72" y="34" width="70" height="3" rx="1" fill="#475569"/>
      <rect x="72" y="40" width="74" height="3" rx="1" fill="#475569"/>
      <rect x="72" y="46" width="66" height="3" rx="1" fill="#475569"/>
      <rect x="72" y="54" width="28" height="8" rx="4" fill="#3b82f6"/>
      <rect x="104" y="54" width="28" height="8" rx="4" fill="none" stroke="#475569" strokeWidth="0.8"/>
      <rect x="0" y="76" width="160" height="14" fill="#1e293b"/>
      <rect x="10" y="80" width="30" height="2.5" rx="1" fill="#334155"/>
      <rect x="65" y="80" width="30" height="2.5" rx="1" fill="#334155"/>
      <rect x="120" y="80" width="30" height="2.5" rx="1" fill="#334155"/>
    </svg>
  ),
  ig_post: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#09090b"/>
      <rect x="45" y="2" width="70" height="86" rx="6" fill="#18181b" stroke="#27272a" strokeWidth="0.5"/>
      <rect x="49" y="7" width="62" height="62" rx="3" fill="#27272a"/>
      <circle cx="80" cy="38" r="14" fill="#3b82f6" opacity="0.4"/>
      <circle cx="80" cy="38" r="8" fill="#3b82f6" opacity="0.7"/>
      <rect x="49" y="73" width="14" height="4" rx="1" fill="#3f3f46"/>
      <rect x="67" y="74" width="10" height="3" rx="1" fill="#3f3f46"/>
      <rect x="120" y="74" width="10" height="3" rx="1" fill="#3f3f46"/>
    </svg>
  ),
  ig_story: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#09090b"/>
      <rect x="58" y="2" width="44" height="86" rx="6" fill="#18181b" stroke="#27272a" strokeWidth="0.5"/>
      <rect x="62" y="7" width="36" height="70" rx="3" fill="#27272a"/>
      <circle cx="80" cy="42" r="10" fill="#a855f7" opacity="0.5"/>
      <circle cx="80" cy="42" r="6" fill="#a855f7" opacity="0.8"/>
      <rect x="62" y="80" width="36" height="4" rx="1" fill="#3f3f46"/>
    </svg>
  ),
  yt_thumb: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#09090b"/>
      <rect x="10" y="10" width="140" height="70" rx="5" fill="#1c1c1e"/>
      <rect x="10" y="10" width="140" height="70" rx="5" fill="#1a1a2e"/>
      <circle cx="80" cy="45" r="16" fill="#ff0000" opacity="0.8"/>
      <polygon points="75,38 75,52 90,45" fill="white"/>
      <rect x="14" y="66" width="60" height="4" rx="1" fill="#3f3f46"/>
      <rect x="14" y="72" width="40" height="3" rx="1" fill="#27272a"/>
    </svg>
  ),
  twitter_banner: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#09090b"/>
      <rect x="4" y="8" width="152" height="54" rx="4" fill="#1a1a2e"/>
      <rect x="4" y="8" width="152" height="54" rx="4" fill="url(#twitter_grad)" opacity="0.6"/>
      <defs>
        <linearGradient id="twitter_grad" x1="0" y1="0" x2="160" y2="54">
          <stop offset="0%" stopColor="#1d4ed8"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <circle cx="24" cy="74" r="14" fill="#27272a" stroke="#3f3f46" strokeWidth="1"/>
      <rect x="42" y="68" width="50" height="4" rx="1" fill="#f4f4f5"/>
      <rect x="42" y="75" width="36" height="3" rx="1" fill="#71717a"/>
    </svg>
  ),
  a4: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#1e293b"/>
      <rect x="50" y="4" width="60" height="82" rx="2" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5"/>
      <rect x="58" y="14" width="44" height="5" rx="1" fill="#1e293b"/>
      <rect x="58" y="23" width="40" height="2.5" rx="0.8" fill="#94a3b8"/>
      <rect x="58" y="28" width="44" height="2.5" rx="0.8" fill="#cbd5e1"/>
      <rect x="58" y="33" width="38" height="2.5" rx="0.8" fill="#cbd5e1"/>
      <rect x="58" y="38" width="42" height="2.5" rx="0.8" fill="#cbd5e1"/>
      <rect x="58" y="45" width="44" height="18" rx="2" fill="#f1f5f9"/>
      <rect x="58" y="67" width="40" height="2.5" rx="0.8" fill="#cbd5e1"/>
      <rect x="58" y="72" width="36" height="2.5" rx="0.8" fill="#cbd5e1"/>
      <rect x="58" y="77" width="30" height="2.5" rx="0.8" fill="#e2e8f0"/>
    </svg>
  ),
  business_card: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#09090b"/>
      <rect x="14" y="20" width="132" height="50" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="0.5"/>
      <rect x="14" y="20" width="50" height="50" rx="5" fill="#1d4ed8"/>
      <rect x="22" y="30" width="30" height="4" rx="1.5" fill="white" opacity="0.9"/>
      <rect x="22" y="37" width="20" height="3" rx="1" fill="white" opacity="0.6"/>
      <circle cx="52" cy="55" r="8" fill="white" opacity="0.15"/>
      <rect x="74" y="28" width="50" height="4" rx="1.5" fill="#f1f5f9"/>
      <rect x="74" y="36" width="34" height="2.5" rx="1" fill="#64748b"/>
      <rect x="74" y="46" width="40" height="2" rx="1" fill="#475569"/>
      <rect x="74" y="51" width="36" height="2" rx="1" fill="#475569"/>
      <rect x="74" y="56" width="42" height="2" rx="1" fill="#475569"/>
    </svg>
  ),
  poster: (
    <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="160" height="90" fill="#1e293b"/>
      <rect x="44" y="4" width="72" height="82" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="0.5"/>
      <rect x="44" y="4" width="72" height="40" rx="3" fill="url(#poster_grad)"/>
      <defs>
        <linearGradient id="poster_grad" x1="44" y1="4" x2="116" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#db2777"/>
        </linearGradient>
      </defs>
      <rect x="54" y="48" width="52" height="5" rx="1.5" fill="#f1f5f9"/>
      <rect x="60" y="57" width="40" height="3" rx="1" fill="#64748b"/>
      <rect x="56" y="64" width="48" height="3" rx="1" fill="#475569"/>
      <rect x="64" y="72" width="32" height="7" rx="3.5" fill="#7c3aed"/>
    </svg>
  ),
};

const TEMPLATES: Template[] = [
  { id: 'landing', name: 'Landing Page', category: 'web', desc: 'Ürün veya hizmet tanıtım sayfası', width: 1920, height: 1080, background: 'white', preview: TemplatePreviews.landing },
  { id: 'dashboard', name: 'Dashboard', category: 'web', desc: 'Admin paneli ve analitik arayüzü', width: 1920, height: 1080, background: 'custom', customColor: '#0f172a', preview: TemplatePreviews.dashboard },
  { id: 'portfolio', name: 'Portfolio', category: 'web', desc: 'Kişisel çalışma ve proje vitrini', width: 1920, height: 1080, background: 'white', preview: TemplatePreviews.portfolio },
  { id: 'blog', name: 'Blog', category: 'web', desc: 'Makale ve içerik yayını sayfası', width: 1280, height: 900, background: 'white', preview: TemplatePreviews.blog },
  { id: 'ecommerce', name: 'E-Ticaret', category: 'web', desc: 'Online mağaza ürün listesi', width: 1920, height: 1080, background: 'white', preview: TemplatePreviews.ecommerce },
  { id: 'about', name: 'Hakkımda', category: 'web', desc: 'Kişisel veya kurumsal tanıtım', width: 1920, height: 1080, background: 'custom', customColor: '#0f172a', preview: TemplatePreviews.about },
  { id: 'ig_post', name: 'Instagram Post', category: 'sosyal', desc: 'Kare format gönderi (1080×1080)', width: 1080, height: 1080, background: 'white', preview: TemplatePreviews.ig_post },
  { id: 'ig_story', name: 'Instagram Story', category: 'sosyal', desc: 'Dikey format hikaye (1080×1920)', width: 1080, height: 1920, background: 'white', preview: TemplatePreviews.ig_story },
  { id: 'yt_thumb', name: 'YouTube Thumbnail', category: 'sosyal', desc: 'Video kapak görseli (1280×720)', width: 1280, height: 720, background: 'custom', customColor: '#09090b', preview: TemplatePreviews.yt_thumb },
  { id: 'twitter_banner', name: 'Twitter Banner', category: 'sosyal', desc: 'Profil başlık görseli (1500×500)', width: 1500, height: 500, background: 'custom', customColor: '#1a1a2e', preview: TemplatePreviews.twitter_banner },
  { id: 'a4', name: 'A4 Belge', category: 'baski', desc: 'Standart baskı sayfası (300dpi)', width: 2480, height: 3508, background: 'white', preview: TemplatePreviews.a4 },
  { id: 'business_card', name: 'Kartvizit', category: 'baski', desc: 'Standart kartvizit boyutu', width: 1050, height: 600, background: 'custom', customColor: '#1e293b', preview: TemplatePreviews.business_card },
  { id: 'poster', name: 'Afiş / Poster', category: 'baski', desc: 'Dikey etkinlik afişi', width: 2480, height: 3508, background: 'custom', customColor: '#0f172a', preview: TemplatePreviews.poster },
];

// ─── Şablon Kategorileri ───
// Kullanıcının "Yeni Proje" oluştururken seçebileceği şablonların sınıflandırması.
const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'Tümü' },
  { id: 'web', label: 'Web & UI' },
  { id: 'sosyal', label: 'Sosyal Medya' },
  { id: 'baski', label: 'Baskı' },
];

// ─── Şablonlar Modalı ───
// Kullanıcının önceden tanımlanmış boyutlarda (A4, Instagram Post vb.) yeni proje oluşturmasını sağlayan pencere.
function TemplatesModal({ onClose, onCreate }: { onClose: () => void; onCreate: (config: ProjectConfig) => void }) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [hovered, setHovered] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = activeCategory === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div ref={modalRef} className="relative w-[820px] max-h-[90vh] flex flex-col bg-[#0d0d0f] border border-[#222] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-modal-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#1e1e1e] flex-shrink-0">
          <div>
            <h2 className="text-white text-base font-bold tracking-wide">Şablonlar</h2>
            <p className="text-[#555] text-xs mt-0.5">Hazır bir şablonla tasarıma hızlı başlayın</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">{Icons.close}</button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 px-7 pt-4 pb-0 flex-shrink-0">
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#3b82f6] text-white'
                  : 'text-[#666] hover:text-[#aaa] hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-7 pt-4">
          <div className="grid grid-cols-3 gap-5">
            {filtered.map(t => (
              <button
                key={t.id}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  onCreate({
                    title: t.name,
                    width: t.width,
                    height: t.height,
                    background: t.background,
                    customColor: t.customColor,
                  });
                }}
                className={`group text-left rounded-xl border transition-all duration-200 overflow-hidden ${
                  hovered === t.id
                    ? 'border-[#3b82f6]/70 shadow-lg shadow-[#3b82f6]/10 -translate-y-0.5'
                    : 'border-[#222] hover:border-[#333]'
                }`}
              >
                {/* Preview area */}
                <div className={`w-full aspect-video overflow-hidden transition-all duration-200 ${hovered === t.id ? 'opacity-100' : 'opacity-85'}`}>
                  {t.preview}
                </div>

                {/* Info */}
                <div className="p-4 bg-[#111] border-t border-[#1e1e1e]">
                  <p className={`text-sm font-bold transition-colors ${hovered === t.id ? 'text-white' : 'text-[#ddd]'}`}>{t.name}</p>
                  <p className="text-[#555] text-[11px] mt-0.5">{t.desc}</p>
                  <p className="text-[#444] text-[10px] mt-2 font-mono">{t.width} × {t.height} px</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ───
// ─── Proje Silme Onay Modalı ───
// Kullanıcının bir projeyi silmek istediğinde yanlışlıkla silmeyi önlemek için çıkan onay penceresi.
function ConfirmDeleteModal({ project, onConfirm, onCancel }: {
  project: ProjectItem;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[400px] bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-modal-scale">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <div>
              <h3 className="text-white text-sm font-bold">Projeyi Sil</h3>
              <p className="text-[#666] text-xs mt-1">Bu işlem geri alınamaz.</p>
            </div>
          </div>
          <p className="text-[#aaa] text-sm mb-6 leading-relaxed">
            <span className="text-white font-semibold">"{project.title}"</span> adlı proje kalıcı olarak silinecek. Devam etmek istiyor musunuz?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[#aaa] hover:text-white text-sm font-medium transition-all"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium transition-all"
            >
              Evet, Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pro Upgrade Modal ───
const PRO_FEATURES = [
  { icon: '∞', label: 'Sınırsız proje', desc: 'Ücretsiz planda 5 proje limiti vardır' },
  { icon: '🤖', label: 'AI Proje Asistanı', desc: 'Yapay zeka destekli tasarım önerileri' },
  { icon: '☁', label: '100 GB Bulut Depolama', desc: 'Projelerinizi güvenle saklayın' },
  { icon: '👥', label: 'Gerçek Zamanlı İşbirliği', desc: 'Ekibinizle aynı anda çalışın' },
  { icon: '⚡', label: 'Öncelikli Destek', desc: '7/24 hızlı müşteri desteği' },
  { icon: '🎨', label: 'Premium Şablonlar', desc: 'Özel tasarım şablonları koleksiyonu' },
];

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div ref={modalRef} className="relative w-[480px] bg-[#0d0d10] border border-[#1e1e28] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-modal-scale">

        {/* Glow bg */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-violet-600/15 via-blue-600/8 to-transparent pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#666] hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500/20 to-blue-500/20 border border-violet-500/30 rounded-full px-4 py-1.5 mb-4">
            <svg className="w-3.5 h-3.5 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-violet-300 text-[11px] font-bold uppercase tracking-widest">Pro Plan</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2 tracking-tight">Sınırsız yaratıcılık.</h2>
          <p className="text-[#666] text-sm leading-relaxed">Mireditor Pro ile tüm güçlü özelliklerin kilidini açın.</p>
        </div>

        {/* Features */}
        <div className="px-6 pb-6 space-y-2">
          {PRO_FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center text-base flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="text-[#ddd] text-sm font-semibold">{f.label}</p>
                <p className="text-[#555] text-[11px] mt-0.5">{f.desc}</p>
              </div>
              <div className="ml-auto">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing + CTA */}
        <div className="px-6 pb-6 pt-2">
          <div className="bg-gradient-to-br from-violet-600/10 to-blue-600/10 border border-violet-500/20 rounded-xl p-4 mb-4 text-center">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-white text-3xl font-bold">9.99</span>
              <span className="text-[#aaa] text-sm font-medium">₺ / ay</span>
            </div>
            <p className="text-[#666] text-[11px]">KDV dahil • İstediğiniz zaman iptal edin</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[#aaa] hover:text-white text-sm font-semibold transition-all"
            >
              Ücretsiz Dene
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all hover:-translate-y-0.5"
            >
              Satın Al
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Project Modal ───
const PRESETS = [
  { id: 'ig_post', name: 'Instagram Post', width: 1080, height: 1080, icon: '📸' },
  { id: 'ig_story', name: 'Instagram Story', width: 1080, height: 1920, icon: '📱' },
  { id: 'fb_cover', name: 'Facebook Kapak', width: 820, height: 312, icon: '👍' },
  { id: 'tw_header', name: 'Twitter/X Başlık', width: 1500, height: 500, icon: '🐦' },
  { id: 'yt_thumb', name: 'YouTube Thumbnail', width: 1280, height: 720, icon: '▶' },
  { id: 'fhd', name: 'Full HD', width: 1920, height: 1080, icon: '📺' },
  { id: '4k', name: '4K UHD', width: 3840, height: 2160, icon: '4K' },
  { id: 'a4', name: 'A4 (300dpi)', width: 2480, height: 3508, icon: '📄' },
  { id: 'a3', name: 'A3 (300dpi)', width: 3508, height: 4961, icon: '📄' },
  { id: 'twitch_banner', name: 'Twitch Banner', width: 1200, height: 480, icon: '🎮' },
  { id: 'linkedin_banner', name: 'LinkedIn Kapak', width: 1584, height: 396, icon: '💼' },
  { id: 'web_banner', name: 'Web Banner', width: 728, height: 90, icon: '🌐' },
];

function NewProjectModal({ onClose, onCreate }: { onClose: () => void, onCreate: (config: ProjectConfig) => void }) {
  const [title, setTitle] = useState('Untitled-1');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [background, setBackground] = useState<'white'|'transparent'|'custom'>('white');
  const [customColor, setCustomColor] = useState('#000000');
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={modalRef} className="relative w-[700px] max-h-[85vh] flex flex-col bg-[#111] border border-[#222] rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-modal-scale">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] flex-shrink-0">
          <h2 className="text-white text-sm font-semibold tracking-wide">Yeni Proje Oluştur</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">{Icons.close}</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 text-[#aaa] space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[2px] text-[#666] mb-2">Proje Adı</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#181818] border border-[#333] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#3b82f6] transition-colors" />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-[2px] text-[#666] mb-2">Genişlik (PX)</label>
              <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full bg-[#181818] border border-[#333] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#3b82f6] transition-colors" />
            </div>
            <div className="flex items-end pb-3 text-[#555]">x</div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-[2px] text-[#666] mb-2">Yükseklik (PX)</label>
              <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-[#181818] border border-[#333] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#3b82f6] transition-colors" />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[2px] text-[#666] mb-2">Arka Plan</label>
            <div className="flex gap-3">
              <button onClick={() => setBackground('white')} className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${background === 'white' ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#181818] border-[#333] hover:border-[#555]'}`}>Beyaz</button>
              <button onClick={() => setBackground('transparent')} className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${background === 'transparent' ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#181818] border-[#333] hover:border-[#555]'}`}>Şeffaf</button>
              <div className="flex gap-2">
                <button onClick={() => setBackground('custom')} className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${background === 'custom' ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#181818] border-[#333] hover:border-[#555]'}`}>Özel</button>
                {background === 'custom' && (
                  <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-10 h-[34px] rounded bg-transparent cursor-pointer border-0 p-0" />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[2px] text-[#666] mb-3">Boyut Şablonları</label>
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => { setWidth(p.width); setHeight(p.height); }} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${width === p.width && height === p.height ? 'bg-[#3b82f6]/10 border-[#3b82f6]/50' : 'bg-[#181818] border-[#2a2a2a] hover:border-[#444]'}`}>
                  <div className="w-8 h-8 rounded bg-[#222] flex items-center justify-center text-[#888] text-xs font-bold">{p.icon}</div>
                  <div>
                    <p className={`text-xs font-medium ${width === p.width && height === p.height ? 'text-[#3b82f6]' : 'text-[#ddd]'}`}>{p.name}</p>
                    <p className="text-[#666] text-[10px] mt-0.5">{p.width} × {p.height}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#222] flex-shrink-0">
          <button onClick={() => onCreate({ title, width, height, background, customColor })} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium py-3 rounded-lg transition-colors">
            OLUŞTUR
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───
// ─── Ana Dashboard (Panel) Bileşeni ───
// Kullanıcının projelerini gördüğü, yönettiği, profil ayarlarını yapabildiği ve editöre geçiş yaptığı ana kontrol paneli.
export function DashboardPage({ onOpenEditor }: DashboardPageProps) {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [cardMenu, setCardMenu] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectItem | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside → menü kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [menuOpen]);

  // API'den projeleri çek
  useEffect(() => {
    const fetchDrafts = async () => {
      setLoadingProjects(true);
      try {
        const token = useAuthStore.getState().token;
        let serverDrafts: ProjectItem[] = [];
        if (token) {
          try {
            const res = await axios.get(`${API_URL}/drafts`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            serverDrafts = res.data.drafts || [];
          } catch (err) {
            console.warn('Backend drafts fetch failed, using local only.');
          }
        }
        
        const localDraftsStr = localStorage.getItem('mireditor-local-drafts');
        const localDrafts: ProjectItem[] = localDraftsStr ? JSON.parse(localDraftsStr) : [];
        
        // Merge and sort by date descending
        const allDrafts = [...localDrafts, ...serverDrafts].sort((a, b) => 
          new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
        );
        
        setProjects(allDrafts);
      } catch (err) {
        console.error('Drafts fetch error:', err);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchDrafts();
  }, [user?.id]);

  const handleOpenFile = async () => {
    if (ipcRenderer) {
      const filePath = await ipcRenderer.invoke('open-file-dialog');
      if (filePath) {
        onOpenEditor();
      }
    } else {
      onOpenEditor();
    }
  };

  // Herhangi bir yere tıklanınca kart menüsünü kapat
  useEffect(() => {
    if (cardMenu === null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-card-menu]')) setCardMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cardMenu]);

  const deleteProject = (project: ProjectItem) => {
    setProjects(prev => prev.filter(p => p.id !== project.id));
    const localDraftsStr = localStorage.getItem('mireditor-local-drafts');
    if (localDraftsStr) {
      const localDrafts: ProjectItem[] = JSON.parse(localDraftsStr);
      const updated = localDrafts.filter(p => p.id !== project.id);
      localStorage.setItem('mireditor-local-drafts', JSON.stringify(updated));
    }
    setDeleteConfirm(null);
    setCardMenu(null);
  };

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex bg-[#09090b] text-[#ededed] select-none overflow-hidden font-sans">
      {/* Background gradients for premium feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} user={user} />}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={(config) => {
            setShowNewProject(false);
            onOpenEditor(config);
          }}
        />
      )}
      {showTemplates && (
        <TemplatesModal
          onClose={() => setShowTemplates(false)}
          onCreate={(config) => {
            setShowTemplates(false);
            onOpenEditor(config);
          }}
        />
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      {deleteConfirm && (
        <ConfirmDeleteModal
          project={deleteConfirm}
          onConfirm={() => deleteProject(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* LEFT SIDE - Son Projeler */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mini header */}
        <div className="h-14 flex items-center justify-between px-6 flex-shrink-0 border-b border-white/5">
          <h2 className="text-[#ccc] text-xs font-semibold">Hoş Geldiniz</h2>

          {/* User dropdown */}
          <div className="relative z-50" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm flex-shrink-0">
                {user?.username?.[0] ?? 'U'}
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-white text-xs font-semibold">{user?.username ?? 'Kullanıcı'}</span>
                <span className="text-[#666] text-[10px] mt-0.5">{user?.role === 'poweruser' ? 'Power User' : 'Standart'}</span>
              </div>
              <svg
                className={`w-3 h-3 text-[#666] ml-1 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Animated dropdown */}
            <div className={`absolute right-0 top-12 w-52 glass-panel rounded-2xl z-50 overflow-hidden transition-all duration-300 origin-top-right ${menuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
              <div className="px-4 py-4 border-b border-white/5 bg-white/5">
                <p className="text-white text-sm font-bold truncate">{user?.username ?? 'Kullanıcı'}</p>
                <p className="text-[#888] text-[10px] mt-0.5 uppercase tracking-wider font-semibold">
                  {user?.role === 'poweruser' ? 'Power User' : 'Standart'}
                </p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { setMenuOpen(false); setShowSettings(true); }}
                  className="w-full text-left px-3 py-2.5 text-[#aaa] text-xs font-medium hover:bg-white/10 hover:text-white transition-all rounded-xl flex items-center gap-3"
                >
                  <span className="text-[#666]">{Icons.settings}</span> Ayarlar
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setShowProfile(true); }}
                  className="w-full text-left px-3 py-2.5 text-[#aaa] text-xs font-medium hover:bg-white/10 hover:text-white transition-all rounded-xl flex items-center gap-3"
                >
                  <span className="text-[#666]">{Icons.user}</span> Profil
                </button>
                <div className="h-px w-full bg-white/5 my-1" />
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full text-left px-3 py-2.5 text-red-400 text-xs font-medium hover:bg-red-500/10 hover:text-red-300 transition-all rounded-xl flex items-center gap-3"
                >
                  <span className="text-red-400/70">{Icons.logout}</span> Oturumu Kapat
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-10 pb-10 overflow-y-auto relative z-10">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Projeleriniz</h1>
            <p className="text-[#888] text-sm font-medium">Yaratıcılığınızı özgür bırakın veya kaldığınız yerden devam edin.</p>
          </div>

          {/* Search */}
          <div className="mb-8 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#666]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Projelerde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-lg bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm font-medium placeholder-[#666] outline-none focus:border-blue-500 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
            />
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {loadingProjects ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6 animate-pulse h-36">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 w-1/2 bg-white/10 rounded mb-2" />
                      <div className="h-2 w-3/4 bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredProjects.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl border-dashed">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-[#444] mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>
                <p className="text-white text-base font-semibold mb-1">{searchQuery ? 'Arama sonucu bulunamadı.' : 'Henüz proje yok.'}</p>
                <p className="text-[#888] text-xs">Yeni bir proje oluşturarak tasarım yolculuğunuza başlayın.</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group relative w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-visible cursor-pointer"
                  onClick={() => onOpenEditor()}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="flex justify-between items-start relative z-10 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a1a24] to-[#2a2a35] border border-white/10 flex items-center justify-center text-white text-lg font-bold shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                      {project.title[0]?.toUpperCase()}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className="text-[#888] text-[10px] font-semibold tracking-wider uppercase">{formatDate(project.last_modified)}</span>
                        <div className="mt-2">
                          {project.is_cloud_synced ? (
                            <span className="inline-flex items-center gap-1 text-blue-400 text-[10px] font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg> Bulut
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg> Yerel
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Üç nokta menü */}
                      <div
                        className="relative"
                        data-card-menu
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setCardMenu(cardMenu === project.id ? null : project.id)}
                          className="w-7 h-7 rounded-lg bg-transparent hover:bg-white/10 flex items-center justify-center text-[#555] hover:text-[#aaa] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                          </svg>
                        </button>

                        {cardMenu === project.id && (
                          <div className="absolute right-0 top-8 w-36 bg-[#161618] border border-[#2a2a2a] rounded-xl shadow-2xl z-[60] overflow-hidden animate-modal-in">
                            <button
                              onClick={() => { setDeleteConfirm(project); setCardMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-medium transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Sil
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <p className="text-[#eee] text-base font-bold truncate group-hover:text-white transition-colors">{project.title}</p>
                    <p className="text-[#666] text-xs truncate mt-1 group-hover:text-[#888] transition-colors">{project.file_path}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Actions */}
      <div className="w-[300px] bg-white/[0.015] border-l border-white/5 p-8 flex flex-col relative z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.3)]">
        <p className="text-[#888] text-[10px] font-bold uppercase tracking-[3px] mb-5">Hızlı Başlangıç</p>

        <div className="space-y-3">
          <SideButton icon={Icons.newFile} label="Yeni Proje" desc="Boş bir canvas oluştur" primary onClick={() => setShowNewProject(true)} />
          <SideButton icon={Icons.folder} label="Proje Aç" desc="Diskten .gef dosyası aç" onClick={handleOpenFile} />
          <SideButton icon={Icons.template} label="Şablonlar" desc="Hazır şablonlardan başla" onClick={() => setShowTemplates(true)} />
        </div>

        <p className="text-[#888] text-[10px] font-bold uppercase tracking-[3px] mt-10 mb-5">Kaynaklar</p>

        <div className="space-y-3">
          <SideButton icon={Icons.book} label="Dökümantasyon" desc="Kullanım kılavuzu ve API" onClick={() => {}} />
          <SideButton icon={Icons.video} label="Eğitim Videoları" desc="Adım adım video dersler" onClick={() => {}} />
          <SideButton icon={Icons.user} label="Topluluk & Destek" desc="Fikir alışverişi ve yardım" onClick={() => {}} />
        </div>

        <div className="mt-auto pt-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/5 backdrop-blur-md">
            <h4 className="text-white text-xs font-bold mb-1 tracking-wide">Mireditor Pro</h4>
            <p className="text-[#888] text-[10px] mb-3 leading-relaxed">Tüm bulut özelliklerinin kilitlerini açın.</p>
            <button
              onClick={() => setShowUpgrade(true)}
              className="w-full py-2 bg-gradient-to-r from-violet-600/80 to-blue-600/80 hover:from-violet-600 hover:to-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-md shadow-violet-500/10 hover:shadow-violet-500/20 hover:-translate-y-px"
            >
              Yükselt
            </button>
          </div>
          
          <div className="mt-6 flex items-center justify-between text-[#555] text-[9px] uppercase tracking-[2px] font-semibold">
            <p>v0.0.1 (Beta)</p>
            <p>Build 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Side Button ───
function SideButton({ icon, label, desc, primary = false, onClick }: {
  icon: React.ReactNode; label: string; desc: string; primary?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 group ${
        primary
          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5'
          : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 hover:-translate-y-0.5'
      }`}
    >
      <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
        primary ? 'bg-white/20 text-white' : 'bg-white/5 text-[#777] group-hover:text-white group-hover:bg-white/10'
      }`}>
        {icon}
      </span>
      <div>
        <p className={`text-xs font-bold tracking-wide transition-colors ${primary ? 'text-white' : 'text-[#ddd] group-hover:text-white'}`}>{label}</p>
        <p className={`text-[10px] mt-0.5 font-medium transition-colors ${primary ? 'text-blue-100/70' : 'text-[#666] group-hover:text-[#888]'}`}>{desc}</p>
      </div>
    </button>
  );
}
