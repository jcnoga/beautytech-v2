path = "backend/src/modules/all-modules.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

old = """        SELECT coalesce(sum(
          EXTRACT(EPOCH FROM (ps.end_time - ps.start_time)) / 60
          - CASE WHEN ps.break_start IS NOT NULL AND ps.break_end IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (ps.break_end - ps.break_start)) / 60
                 ELSE 0 END
        ) * dias.qtd, 0) as minutos_disponiveis"""

new = """        SELECT coalesce(sum(
          EXTRACT(EPOCH FROM (ps.end_time::time - ps.start_time::time)) / 60
          - CASE WHEN ps.break_start IS NOT NULL AND ps.break_end IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (ps.break_end::time - ps.break_start::time)) / 60
                 ELSE 0 END
        ) * dias.qtd, 0) as minutos_disponiveis"""

if old in content:
    content = content.replace(old, new)
    changes += 1
    print("OK: cast ::time adicionado na query de ocupacao de agenda")
else:
    print("AVISO: trecho nao encontrado - nenhuma alteracao feita")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/1")
