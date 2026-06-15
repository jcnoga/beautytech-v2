content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()

old = """  if (currentPage === 'payment_success') return <PaymentSuccessPage onGoHome={() => setCurrentPage('app')} />;

  return ("""

new = """  if (currentPage === 'payment_success') return <PaymentSuccessPage onGoHome={() => setCurrentPage('app')} />;
  if (!user) return <LoginPage onLogin={(data: any) => { setUser(data.user); }} />;

  return ("""

if old in content:
    content = content.replace(old, new, 1)
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content)
    print("OK - verificacao de user adicionada")
else:
    print("NAO ENCONTRADO")
