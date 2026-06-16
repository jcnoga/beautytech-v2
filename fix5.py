content = open('frontend/src/PricingPage.tsx', 'r', encoding='latin-1').read()
old = '    } catch {\n      setMsg({ type: "err", text: "Erro de conexao. Tente novamente." });\n    } finally {\n      setLoading(null);\n    }\n  };'
new = '    } catch(e: any) {\n      console.error("BILLING ERROR:", e);\n      setMsg({ type: "err", text: "Erro: " + (e?.message || String(e)) });\n    } finally {\n      setLoading(null);\n    }\n  };'
content = content.replace(old, new)
open('frontend/src/PricingPage.tsx', 'w', encoding='latin-1').write(content)
print('OK - catch count:', content.count('BILLING ERROR'))
