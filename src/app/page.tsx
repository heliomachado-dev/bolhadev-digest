import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Settings, BookOpen, Sparkles, MessageSquare } from 'lucide-react';
import GenerateButton from '@/components/GenerateButton';
import PushSubscribeButton from '@/components/PushSubscribeButton';
import SchedulerWatcher from '@/components/SchedulerWatcher';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const newsletters = await prisma.newsletter.findMany({
    orderBy: { date: 'desc' },
    take: 10,
    include: { tweets: true },
  });

  const latestNewsletter = newsletters[0];
  const olderNewsletters = newsletters.slice(1);
  const latestIsX = latestNewsletter?.source === 'x';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                BolhaDev Digest <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/35">PWA</span>
              </h1>
              <p className="text-xs text-slate-400">As principais discussões e polêmicas da #bolhadev</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <PushSubscribeButton />
            <GenerateButton />
            <Link
              href="/settings"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition flex items-center gap-2 text-sm font-medium border border-slate-700"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurações</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        {newsletters.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800 p-8 space-y-4">
            <Sparkles className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
            <h2 className="text-xl font-semibold">Nenhuma edição gerada ainda</h2>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              Clique no botão <strong className="text-indigo-400">&quot;Gerar Edição Agora&quot;</strong> acima para coletar os destaques do dia e criar sua primeira newsletter inteligente.
            </p>
          </div>
        ) : (
          <>
            {/* Edição Mais Recente */}
            {latestNewsletter && (
              <section className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-950/20 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Mais Recente
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(latestNewsletter.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-indigo-300 font-medium">
                    {latestNewsletter.tweets.length} {latestIsX ? 'tweets' : 'destaques'} curados
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                    {latestNewsletter.title}
                  </h2>
                  <div className="prose prose-invert max-w-none text-slate-300 space-y-4 leading-relaxed whitespace-pre-line bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80">
                    {latestNewsletter.summaryWeb}
                  </div>
                </div>

                {/* Tweets Originais Destaque */}
                {latestNewsletter.tweets.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                      {latestIsX ? 'Tweets em Destaque nesta Edição' : 'Destaques desta Edição'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {latestNewsletter.tweets.map((tweet) => (
                        <a
                          key={tweet.id}
                          href={tweet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 p-4 rounded-xl transition flex flex-col justify-between space-y-3 group"
                        >
                          <p className="text-sm text-slate-200 line-clamp-3">&quot;{tweet.text}&quot;</p>
                          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                            <span className="font-medium text-indigo-400 group-hover:underline">
                              @{tweet.author}
                            </span>
                            <span className="flex items-center gap-2">
                              ❤️ {tweet.likes} 🔄 {tweet.retweets}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Edições Anteriores */}
            {olderNewsletters.length > 0 && (
              <section className="space-y-4 pt-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" /> Edições Anteriores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {olderNewsletters.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/50 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-xs text-slate-400">
                          {new Date(item.date).toLocaleDateString('pt-BR')}
                        </span>
                        <h4 className="font-semibold text-white text-base line-clamp-1">{item.title}</h4>
                        <p className="text-sm text-slate-400 line-clamp-2">{item.summaryPush}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-medium">
                        <span>{item.tweets.length} destaques analisados</span>
                        <span>Ver detalhes →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/30 py-6 mt-12 text-center text-xs text-slate-500">
        <p>BolhaDev Digest • Next.js • Prisma + Neon Postgres • Gemini IA • Telegram, WhatsApp &amp; Push • Vercel Cron</p>
      </footer>
      <SchedulerWatcher />
    </div>
  );
}
