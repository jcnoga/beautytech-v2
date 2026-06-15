content = open('C:/projetos/beautytech-v2/backend/src/modules/resend.module.ts', encoding='utf-8').read()

# Corrige linha 4 - o FROM com emoji no template literal
# Substitui todos os emojis por texto equivalente
import re

fixes = [
    ('\U0001f389', '[PRO]'),   # 🎉
    ('\u2728', '[ZenSalon]'),  # ✨
    ('\u26a0\ufe0f', '[AVISO]'), # ⚠️
    ('\U0001f4e7', ''),        # 📧
    ('\U0001f517', ''),        # 🔗
    ('\u2192', '->'),          # →
    ('\U0001f449', '>>'),      # 👉
    ('\u2705', '[OK]'),        # ✅
    ('\U0001f4cd', ''),        # 📍
    ('\U0001f4f1', ''),        # 📱
    ('\U0001f4b3', ''),        # 💳
    ('\U0001f4b0', ''),        # 💰
    ('\U0001f517', ''),        # 🔗
    ('\U0001f510', ''),        # 🔐
]

for emoji, replacement in fixes:
    content = content.replace(emoji, replacement)

# Remove qualquer caracter fora do range ASCII seguro em template literals
# Abordagem: substituir qualquer emoji restante
content = re.sub(r'[\U00010000-\U0010ffff]', '', content)
# Remove emojis do BMP problemáticos em template literals
content = re.sub(r'[\u2600-\u27ff\u2300-\u23ff\ufe00-\ufe0f]', '', content)

open('C:/projetos/beautytech-v2/backend/src/modules/resend.module.ts', 'w', encoding='utf-8').write(content)
print("OK - emojis removidos do resend.module.ts")
