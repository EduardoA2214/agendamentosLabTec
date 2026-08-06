// Copie este arquivo para js/config.js e preencha com as credenciais do seu projeto Supabase.
// js/config.js está no .gitignore e não deve ser commitado.
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_KEY = 'sua-chave-anon-publica-aqui';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
