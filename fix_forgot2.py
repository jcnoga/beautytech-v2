with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old = '''  if (showRegister) return <RegisterPage onBack={() => setShowRegister(f'''

new = '''  if (showForgot) return <ForgotPasswordPage onBack={() => setShowForgot(false)} />;
  if (showRegister) return <RegisterPage onBack={() => setShowRegister(f'''

content = content.replace(old, new, 1)

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("OK" if "showForgot" in content else "ERRO")
