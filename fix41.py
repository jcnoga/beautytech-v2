content = open('frontend/src/BookingPage.tsx', 'r', encoding='latin-1').read()

# Remove o codigo antigo que ficou apos o novo
bad = '''                })()}}
                        >{s}</div>
                      ))}
                    </div>
                }'''
good = '''                })()}'''

content = content.replace(bad, good, 1)
open('frontend/src/BookingPage.tsx', 'w', encoding='latin-1').write(content)
print('OK')
