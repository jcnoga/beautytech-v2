path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('servicos ativos')
if idx < 0:
    idx = content.find('Novo Servico')
if idx < 0:
    idx = content.find('novo-servico')
if idx < 0:
    idx = content.find('services')
print(repr(content[idx-50:idx+500]))
