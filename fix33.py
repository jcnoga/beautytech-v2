content = open('backend/src/modules/appointments/appointments.routes.ts', 'r', encoding='latin-1').read()

old = '    const available = slots.filter(slot => {'
new = '''    // Busca bloqueios manuais
    const blocksResult = await db.execute(sql`
      SELECT starts_at, ends_at FROM professional_blocks
      WHERE professional_id = ${professionalId}
      AND tenant_id = ${tenant.id}
      AND starts_at <= ${dayEnd}
      AND ends_at >= ${dayStart}
    `);
    const blocks = (blocksResult as any).rows ?? (Array.isArray(blocksResult) ? blocksResult : []);

    const available = slots.filter(slot => {'''

content = content.replace(old, new, 1)

# Tambem atualiza o filtro para considerar bloqueios
old2 = '''      return !existingAppts.some(appt => {
        const as_ = new Date(appt.scheduledAt);
        const ae  = appt.endsAt ? new Date(appt.endsAt) : new Date(as_.getTime() + appt.durationMinutes * 60000);
        const asMin = as_.getUTCHours() * 60 + as_.getUTCMinutes();
        const aeMin = ae.getUTCHours()  * 60 + ae.getUTCMinutes();
        return slotStart < aeMin && slotEnd > asMin;
      });'''
new2 = '''      const conflictsAppt = existingAppts.some(appt => {
        const as_ = new Date(appt.scheduledAt);
        const ae  = appt.endsAt ? new Date(appt.endsAt) : new Date(as_.getTime() + appt.durationMinutes * 60000);
        const asMin = as_.getUTCHours() * 60 + as_.getUTCMinutes();
        const aeMin = ae.getUTCHours()  * 60 + ae.getUTCMinutes();
        return slotStart < aeMin && slotEnd > asMin;
      });
      const conflictsBlock = blocks.some((b) => {
        const bStart = new Date(b.starts_at);
        const bEnd   = new Date(b.ends_at);
        const bStartMin = bStart.getUTCHours() * 60 + bStart.getUTCMinutes();
        const bEndMin   = bEnd.getUTCHours()   * 60 + bEnd.getUTCMinutes();
        return slotStart < bEndMin && slotEnd > bStartMin;
      });
      return !conflictsAppt && !conflictsBlock;'''

content = content.replace(old2, new2, 1)
open('backend/src/modules/appointments/appointments.routes.ts', 'w', encoding='latin-1').write(content)
print('OK - blocks:', content.count('professional_blocks'), '- conflicts:', content.count('conflictsBlock'))
