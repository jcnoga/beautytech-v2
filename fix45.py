content = open('backend/src/modules/appointments/appointments.routes.ts', 'r', encoding='latin-1').read()
old = '      const conflictsBlock = blocks.some((b) => {'
new = '''      // Verifica intervalo de almoco
      const breakStart = schedRows[0]?.break_start;
      const breakEnd   = schedRows[0]?.break_end;
      const conflictsBreak = breakStart && breakEnd ? (() => {
        const [bsh, bsm] = breakStart.split(":").map(Number);
        const [beh, bem] = breakEnd.split(":").map(Number);
        const bsMin = bsh * 60 + bsm;
        const beMin = beh * 60 + bem;
        return slotStart < beMin && slotEnd > bsMin;
      })() : false;

      const conflictsBlock = blocks.some((b) => {'''
content = content.replace(old, new, 1)

old2 = '      return !conflictsAppt && !conflictsBlock;'
new2 = '      return !conflictsAppt && !conflictsBlock && !conflictsBreak;'
content = content.replace(old2, new2, 1)

open('backend/src/modules/appointments/appointments.routes.ts', 'w', encoding='latin-1').write(content)
print('OK - break:', content.count('conflictsBreak'))
