# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix linha 1458 - referrals WHERE sem parenteses
old = "DELETE FROM referrals WHERE referred_id IN (SELECT id FROM clients WHERE tenant_id=${tenantId} AND tags @> ARRAY['demo']::text[]) OR referrer_id IN (SELECT id FROM clients WHERE tenant_id=${tenantId} AND tags @> ARRAY['demo']::text[])"
new = "DELETE FROM referrals WHERE (referred_id IN (SELECT id FROM clients WHERE tenant_id=${tenantId} AND tags @> ARRAY['demo']::text[]) OR referrer_id IN (SELECT id FROM clients WHERE tenant_id=${tenantId} AND tags @> ARRAY['demo']::text[]))"
content = content.replace(old, new)

# Fix linha 1466 - gift_cards WHERE sem parenteses
old2 = "DELETE FROM gift_cards WHERE purchased_by_id IN (SELECT id FROM clients WHERE tenant_id=${tenantId} AND tags @> ARRAY['demo']::text[]) OR used_by_id IN (SELECT id FROM clients WHERE tenant_id=${tenantId} AND tags @> ARRAY['demo']::text[])"
new2 = "DELETE FROM gift_cards WHERE (purchased_by_id IN (SELECT id FROM clients WHERE tenant_id=${tenantId} AND tags @> ARRAY['demo']::text[]) OR used_by_id IN (SELECT id FROM clients WHERE tenant_id=${tenantId} AND tags @> ARRAY['demo']::text[]))"
content = content.replace(old2, new2)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
