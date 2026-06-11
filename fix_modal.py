path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '          <button onClick={onClose} style={{ background:"none", border:"none", color: C.textMuted, fontSize:22, cursor:"pointer", lineHeight:1 }}>&times;</button>\n          </div>\n        </div>\n      </div>\n    </div>'
new = '          <button onClick={onClose} style={{ background:"none", border:"none", color: C.textMuted, fontSize:22, cursor:"pointer", lineHeight:1 }}>&times;</button>\n        </div>\n        <div style={{ padding:"20px 28px" }}>{children}</div>\n      </div>\n    </div>'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK Modal corrigido!")
else:
    print("ERRO trecho nao encontrado")
