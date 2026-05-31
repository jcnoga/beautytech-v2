import postgres from 'postgres';

const sql = postgres('postgresql://postgres.wthhegdhdkhffjbzhvtt:BeautyTech2024x@aws-1-us-west-2.pooler.supabase.com:5432/postgres', {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});

const result = await sql`SELECT 1 as ok`;
console.log('Banco conectado!', result);
await sql.end();