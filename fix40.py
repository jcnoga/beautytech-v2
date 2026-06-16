content = open('backend/src/modules/appointments/appointments.routes.ts', 'r', encoding='latin-1').read()
old = '''      const conflictsBlock = blocks.some((b) => {
        const bStart = new Date(b.starts_at);
        const bEnd   = new Date(b.ends_at);
        const bStartMin = bStart.getUTCHours() * 60 + bStart.getUTCMinutes();
        const bEndMin   = bEnd.getUTCHours()   * 60 + bEnd.getUTCMinutes();
        return slotStart < bEndMin && slotEnd > bStartMin;
      });'''
new = '''      const conflictsBlock = blocks.some((b) => {
        const bStart = new Date(b.starts_at);
        const bEnd   = new Date(b.ends_at);
        // Converte slot para UTC considerando fuso do servidor (UTC)
        const slotDateStart = new Date(`${date}T${String(Math.floor(slotStart/60)).padStart(2,"0")}:${String(slotStart%60).padStart(2,"0")}:00-03:00`);
        const slotDateEnd   = new Date(`${date}T${String(Math.floor(slotEnd/60)).padStart(2,"0")}:${String(slotEnd%60).padStart(2,"0")}:00-03:00`);
        return slotDateStart < bEnd && slotDateEnd > bStart;
      });'''
content = content.replace(old, new, 1)
open('backend/src/modules/appointments/appointments.routes.ts', 'w', encoding='latin-1').write(content)
print('OK')
