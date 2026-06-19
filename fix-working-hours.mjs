const SUPABASE_URL = 'https://wthhegdhdkhffjbzhvtt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aGhlZ2RoZGtoZmZqYnpodnR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE4MTIyNiwiZXhwIjoyMDk1NzU3MjI2fQ.LvYD0k0xQFrFZAntsu6h46AjPUpJDVCFv0hkre9IKdM';

const workingHours = {
  "0": { start: null, end: null, isWorking: false, slotMinutes: 30, breakStart: null, breakEnd: null },
  "1": { start: "08:00", end: "18:00", isWorking: true, slotMinutes: 30, breakStart: "12:00", breakEnd: "13:30" },
  "2": { start: "08:00", end: "18:00", isWorking: true, slotMinutes: 30, breakStart: "12:00", breakEnd: "13:30" },
  "3": { start: "08:00", end: "18:00", isWorking: true, slotMinutes: 30, breakStart: "12:00", breakEnd: "13:30" },
  "4": { start: "08:00", end: "18:00", isWorking: true, slotMinutes: 30, breakStart: "12:00", breakEnd: "13:30" },
  "5": { start: "08:00", end: "18:00", isWorking: true, slotMinutes: 30, breakStart: "12:00", breakEnd: "13:30" },
  "6": { start: "08:00", end: "12:00", isWorking: true, slotMinutes: 30, breakStart: null, breakEnd: null }
};

const professionalIds = [
  '93c6f51d-f85a-4110-be77-8789ef5a1c73', // Carlos Demo Silva
  'e8241b48-f287-49a9-844a-8b62f9fad4dc'  // Pedro Demo Barbosa
];

async function fixWorkingHours() {
  console.log('Iniciando update de working_hours...\n');

  for (const id of professionalIds) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/professionals?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ working_hours: workingHours })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`ERRO ao atualizar ${id}:`, data);
    } else {
      const prof = data[0];
      console.log(`OK: ${prof?.full_name || id} - working_hours atualizado`);
    }
  }

  console.log('\nConcluido!');
}

fixWorkingHours().catch(console.error);
