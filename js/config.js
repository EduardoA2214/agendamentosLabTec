// Credenciais do Supabase (chave pública/anon — segura para expor no navegador)
const SUPABASE_URL = 'https://sehxeucaaqtcibmnyrpb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1iEp9vdqUAMOTmf-jwGMSg_dtmgyIDv';

// Cliente único do Supabase, reaproveitado por todas as páginas
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
