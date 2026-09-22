'use client';

import { useState, useEffect } from 'react';
import { QrCode, Loader2, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';

export default function WhatsAppLoginButton() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async (forceNew = false) => {
    try {
      const url = `/api/whatsapp/status${forceNew ? '?new=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setIsConnected(data.isConnected);
        if (data.isConnected) {
          setQrCodeUrl(null);
        } else if (data.qrCode) {
          setQrCodeUrl(data.qrCode);
        }
      } else {
        setErrorMsg(data.error || 'Erro ao carregar status do WhatsApp');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Sem conexão com o servidor de status.');
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => {
      // Só faz o polling se estiver desconectado para economizar recursos e detectar pareamento
      if (!isConnected) {
        fetchStatus();
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [isConnected]);

  const handleGenerate = async () => {
    setErrorMsg(null);
    setLoading(true);
    setQrCodeUrl(null);
    await fetchStatus(true);
    setLoading(false);
  };

  const handleReset = async () => {
    if (!confirm('Deseja realmente desconectar e limpar os dados de sessão do WhatsApp?')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/status', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setIsConnected(false);
        setQrCodeUrl(null);
        alert('Sessão encerrada com sucesso!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600/20 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/30 animate-pulse">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Sessão WhatsApp (Baileys)</h3>
            <p className="text-xs text-slate-400">
              Conecte seu celular escaneando o QR Code abaixo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 animate-bounce" /> Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Aguardando Pareamento
            </span>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {!isConnected ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition flex items-center gap-2 text-sm shadow-lg shadow-emerald-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{qrCodeUrl ? 'Recarregar QR Code' : 'Iniciar & Gerar QR Code'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium px-5 py-2.5 rounded-xl transition flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Desconectar Conta</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
            {errorMsg}
          </div>
        )}

        {!isConnected && (
          <div className="flex flex-col items-center justify-center pt-2">
            {qrCodeUrl ? (
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-4 shadow-2xl animate-fade-in">
                <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-indigo-500/25">
                  <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-52 h-52 object-contain" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-slate-200">Aponte a câmera do seu celular</p>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                    Vá em Aparelhos Conectados no WhatsApp e escaneie para ligar o robô.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full p-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-center text-slate-400 text-xs italic">
                {loading ? 'Inicializando conexão segura e renderizando imagem...' : 'Clique em "Iniciar & Gerar QR Code" para começar.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
