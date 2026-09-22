# BolhaDev Digest 🚀

Sistema completo de newsletter e curadoria inteligente focado nas principais discussões, polêmicas e dicas da comunidade **#bolhadev** do Twitter/X, com suporte a **Web Push Notifications** e disparos automáticos para o **WhatsApp**.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend & App Web (PWA):** Next.js 15 (App Router), Tailwind CSS, Lucide Icons.
- **Banco de Dados & ORM:** SQLite com Prisma ORM (leve, rápido e sem dependências complexas).
- **Inteligência Artificial:** Google Gemini (`gemini-2.5-flash`) para análise de relevância e sumarização automática.
- **Disparos & Notificações:** Web Push API (VAPID) e integração com WhatsApp via Evolution API / Baileys.

---

## 🚀 Como Executar o Projeto Localmente

### 1. Instalar as dependências
```bash
npm install
```

### 2. Configurar o Banco de Dados (Prisma + SQLite)
```bash
npx prisma db push
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto baseando-se no `.env.example`:
```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="sua_chave_do_google_gemini"
```
*(Você pode obter sua chave do Gemini gratuitamente no [Google AI Studio](https://aistudio.google.com/))*

### 4. Rodar em Modo de Desenvolvimento
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📱 Funcionalidades

1. **Leitor Web (PWA):** Instale o aplicativo no celular ou desktop, visualize a edição mais recente formatada em Markdown rico com os tweets em destaque e navegue pelas edições anteriores.
2. **Curadoria com IA (Gemini):** Agrupa os tweets do dia em tópicos relevantes (Polêmicas, Dicas, Carreira, Ferramentas).
3. **Disparo no WhatsApp:** Envie o resumo otimizado diretamente para o seu WhatsApp configurando sua Evolution API.
4. **Web Push Notifications:** Ative notificações no navegador para ser avisado assim que novas edições forem geradas.
