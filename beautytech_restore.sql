-- ============================================================
-- BEAUTYTECH v2 — Script de Restore (Dados de Demonstração)
-- Execute no Supabase SQL Editor para restaurar os dados
-- URL: https://supabase.com/dashboard/project/wthhegdhdkhffjbzhvtt/sql/new
-- ============================================================
-- TENANT ID:  d664018e-59f0-4d59-a3c7-503646041d5b
-- USER ID:    e794e9f9-b147-4fca-88b2-e291aecf5eb3
-- LOGIN:      admin@beautytech.com.br / BeautyV2prod2024
-- ============================================================

-- PASSO 1: LIMPAR DADOS ATUAIS
DELETE FROM commissions            WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM appointment_services   WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM appointments           WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM financial_transactions WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM packages               WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM loyalty_transactions   WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM referrals              WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM reviews                WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM goals                  WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM leads                  WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM clients                WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM professionals          WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM services               WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';
DELETE FROM service_categories     WHERE tenant_id = 'd664018e-59f0-4d59-a3c7-503646041d5b';

-- PASSO 2: USER PROFILE DO ADMIN
INSERT INTO user_profiles (id, tenant_id, auth_user_id, role, full_name, email, is_active)
VALUES ('6b151bf8-5f2d-4e3b-b9f4-4963ddd11d42', 'd664018e-59f0-4d59-a3c7-503646041d5b', 'e794e9f9-b147-4fca-88b2-e291aecf5eb3', 'owner', 'Administrador', 'admin@beautytech.com.br', true)
ON CONFLICT (id) DO UPDATE SET role='owner', is_active=true;

-- PASSO 3: CATEGORIAS
INSERT INTO service_categories (tenant_id, name, color, is_active, sort_order)
VALUES
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Cabelo',   '#E8A598', true, 1),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Unhas',    '#D4AF7A', true, 2),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Estetica', '#8FAF8A', true, 3);

-- PASSO 4: PROFISSIONAIS
INSERT INTO professionals (tenant_id, full_name, display_name, specialties, commission_pct, color, is_active, accepts_online_booking, monthly_goal, sort_order)
VALUES
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Marina Santos', 'Marina', ARRAY['Coloracao','Mechas','Progressiva'], 40.00, '#E8A598', true, true,  8000.00, 1),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Camila Costa',  'Camila', ARRAY['Corte','Escova','Hidratacao'],      38.00, '#D4AF7A', true, true,  6000.00, 2),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Ana Lucia',     'Ana',    ARRAY['Manicure','Pedicure','Nail Art'],   45.00, '#8FAF8A', true, true,  4000.00, 3),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Sofia Barbosa', 'Sofia',  ARRAY['Estetica','Limpeza de Pele'],       42.00, '#6B8CAE', true, false, 5000.00, 4);

-- PASSO 5: SERVIÇOS
INSERT INTO services (tenant_id, category_id, name, duration_minutes, price, is_active, is_online_bookable, sort_order)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Coloracao Completa', 180, 280.00, true, true,  1 FROM service_categories WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND name='Cabelo';
INSERT INTO services (tenant_id, category_id, name, duration_minutes, price, is_active, is_online_bookable, sort_order)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Mechas Balayage',    240, 380.00, true, true,  2 FROM service_categories WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND name='Cabelo';
INSERT INTO services (tenant_id, category_id, name, duration_minutes, price, is_active, is_online_bookable, sort_order)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Escova Progressiva', 180, 220.00, true, true,  3 FROM service_categories WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND name='Cabelo';
INSERT INTO services (tenant_id, category_id, name, duration_minutes, price, is_active, is_online_bookable, sort_order)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Corte Feminino',      60,  95.00, true, true,  4 FROM service_categories WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND name='Cabelo';
INSERT INTO services (tenant_id, category_id, name, duration_minutes, price, is_active, is_online_bookable, sort_order)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Manicure + Pedicure', 90,  75.00, true, true,  5 FROM service_categories WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND name='Unhas';
INSERT INTO services (tenant_id, category_id, name, duration_minutes, price, is_active, is_online_bookable, sort_order)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Nail Art Completo',  120, 120.00, true, true,  6 FROM service_categories WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND name='Unhas';
INSERT INTO services (tenant_id, category_id, name, duration_minutes, price, is_active, is_online_bookable, sort_order)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Limpeza de Pele',     90, 180.00, true, false, 7 FROM service_categories WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND name='Estetica';

-- PASSO 6: CLIENTES
INSERT INTO clients (tenant_id, full_name, whatsapp, email, gender, birth_date, segment, loyalty_tier, total_visits, total_spent, average_ticket, loyalty_points, is_vip, is_active, last_visit_at)
VALUES
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Isabela Carvalho', '(34) 99111-1111', 'isabela@email.com',  'female', '1990-03-15', 'vip',     'gold',     42, 5840.00, 139.00, 580,  true,  true, NOW()-INTERVAL '1 day'),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Renata Oliveira',  '(34) 99222-2222', 'renata@email.com',   'female', '1985-07-22', 'active',  'silver',   18, 2160.00, 120.00, 216,  false, true, NOW()-INTERVAL '3 days'),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Juliana Ferreira', '(34) 99333-3333', 'juliana@email.com',  'female', '1995-11-08', 'active',  'bronze',    6,  570.00,  95.00,  57,  false, true, NOW()-INTERVAL '5 days'),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Patricia Mendes',  '(34) 99444-4444', 'patricia@email.com', 'female', '1978-05-30', 'vip',     'platinum', 89,12450.00, 140.00,1245,  true,  true, NOW()-INTERVAL '2 days'),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Fernanda Lima',    '(34) 99555-5555', 'fernanda@email.com', 'female', '1992-09-14', 'at_risk', 'bronze',    4,  340.00,  85.00,  34,  false, true, NOW()-INTERVAL '60 days'),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Luciana Rocha',    '(34) 99666-6666', 'luciana@email.com',  'female', '1988-12-03', 'loyal',   'gold',     31, 4180.00, 135.00, 418,  false, true, NOW()-INTERVAL '7 days');

-- PASSO 7: AGENDAMENTOS DE HOJE
INSERT INTO appointments (tenant_id, client_id, professional_id, scheduled_at, ends_at, status, total_price, payment_status, confirmed_at, checkin_at, checkout_at)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', c.id, p.id, CURRENT_DATE+TIME '08:30', CURRENT_DATE+TIME '10:00', 'completed', 280.00, 'confirmed', CURRENT_DATE+TIME '08:00', CURRENT_DATE+TIME '08:30', CURRENT_DATE+TIME '10:00'
FROM clients c, professionals p WHERE c.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND c.full_name='Isabela Carvalho' AND p.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND p.full_name='Marina Santos';

INSERT INTO appointments (tenant_id, client_id, professional_id, scheduled_at, ends_at, status, total_price, payment_status, confirmed_at, checkin_at)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', c.id, p.id, CURRENT_DATE+TIME '09:00', CURRENT_DATE+TIME '10:30', 'in_progress', 380.00, 'pending', CURRENT_DATE+TIME '08:50', CURRENT_DATE+TIME '09:00'
FROM clients c, professionals p WHERE c.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND c.full_name='Renata Oliveira' AND p.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND p.full_name='Camila Costa';

INSERT INTO appointments (tenant_id, client_id, professional_id, scheduled_at, ends_at, status, total_price, payment_status, confirmed_at)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', c.id, p.id, CURRENT_DATE+TIME '10:00', CURRENT_DATE+TIME '11:00', 'confirmed', 95.00, 'pending', CURRENT_DATE+TIME '09:50'
FROM clients c, professionals p WHERE c.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND c.full_name='Juliana Ferreira' AND p.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND p.full_name='Marina Santos';

INSERT INTO appointments (tenant_id, client_id, professional_id, scheduled_at, ends_at, status, total_price, payment_status, confirmed_at)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', c.id, p.id, CURRENT_DATE+TIME '11:00', CURRENT_DATE+TIME '12:30', 'confirmed', 310.00, 'pending', CURRENT_DATE+TIME '10:50'
FROM clients c, professionals p WHERE c.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND c.full_name='Patricia Mendes' AND p.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND p.full_name='Ana Lucia';

INSERT INTO appointments (tenant_id, client_id, professional_id, scheduled_at, ends_at, status, total_price, payment_status)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', c.id, p.id, CURRENT_DATE+TIME '14:00', CURRENT_DATE+TIME '15:00', 'pending', 120.00, 'pending'
FROM clients c, professionals p WHERE c.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND c.full_name='Fernanda Lima' AND p.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND p.full_name='Camila Costa';

INSERT INTO appointments (tenant_id, client_id, professional_id, scheduled_at, ends_at, status, total_price, payment_status)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', c.id, p.id, CURRENT_DATE+TIME '15:30', CURRENT_DATE+TIME '16:30', 'pending', 85.00, 'pending'
FROM clients c, professionals p WHERE c.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND c.full_name='Luciana Rocha' AND p.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND p.full_name='Ana Lucia';

-- PASSO 8: FINANCEIRO
INSERT INTO financial_transactions (tenant_id, account_id, type, status, description, amount, due_date, paid_at, payment_method)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'revenue', 'confirmed', 'Coloracao - Isabela Carvalho',  280.00, CURRENT_DATE-1, CURRENT_DATE-1, 'pix'           FROM financial_accounts WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' LIMIT 1;
INSERT INTO financial_transactions (tenant_id, account_id, type, status, description, amount, due_date, paid_at, payment_method)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'revenue', 'confirmed', 'Mechas - Patricia Mendes',      380.00, CURRENT_DATE-5, CURRENT_DATE-5, 'credit_card'   FROM financial_accounts WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' LIMIT 1;
INSERT INTO financial_transactions (tenant_id, account_id, type, status, description, amount, due_date, paid_at, payment_method)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'revenue', 'confirmed', 'Manicure - Renata Oliveira',     75.00, CURRENT_DATE-2, CURRENT_DATE-2, 'pix'           FROM financial_accounts WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' LIMIT 1;
INSERT INTO financial_transactions (tenant_id, account_id, type, status, description, amount, due_date, paid_at, payment_method)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'revenue', 'confirmed', 'Limpeza de Pele - Juliana',     180.00, CURRENT_DATE-4, CURRENT_DATE-4, 'debit_card'    FROM financial_accounts WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' LIMIT 1;
INSERT INTO financial_transactions (tenant_id, account_id, type, status, description, amount, due_date, paid_at, payment_method)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'expense', 'confirmed', 'Produtos Loreal - Fornecedor',  890.00, CURRENT_DATE-3, CURRENT_DATE-3, 'bank_transfer' FROM financial_accounts WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' LIMIT 1;
INSERT INTO financial_transactions (tenant_id, account_id, type, status, description, amount, due_date, paid_at, payment_method)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'expense', 'pending',   'Aluguel - Junho',              3200.00, CURRENT_DATE+5, NULL, NULL        FROM financial_accounts WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' LIMIT 1;

-- PASSO 9: COMISSÕES
INSERT INTO commissions (tenant_id, professional_id, appointment_id, base_amount, commission_pct, commission_amt, reference_month, is_paid)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', a.professional_id, a.id, a.total_price, p.commission_pct, a.total_price*p.commission_pct/100, TO_CHAR(NOW(),'YYYY-MM'), false
FROM appointments a JOIN professionals p ON p.id=a.professional_id
WHERE a.tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND a.status='completed';

-- PASSO 10: PACOTES
INSERT INTO packages (tenant_id, client_id, name, total_sessions, used_sessions, remaining_sessions, total_value, status, expires_at)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Pacote Beleza Total',  10, 6, 4, 1200.00, 'active',    '2026-12-31T23:59:00Z' FROM clients WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND full_name='Isabela Carvalho';
INSERT INTO packages (tenant_id, client_id, name, total_sessions, used_sessions, remaining_sessions, total_value, status, expires_at)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Pacote Coloracao VIP',  6, 6, 0, 1500.00, 'completed', '2026-08-31T23:59:00Z' FROM clients WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND full_name='Renata Oliveira';
INSERT INTO packages (tenant_id, client_id, name, total_sessions, used_sessions, remaining_sessions, total_value, status, expires_at)
SELECT 'd664018e-59f0-4d59-a3c7-503646041d5b', id, 'Pacote Unhas Premium',  8, 2, 6,  480.00, 'active',    '2026-10-31T23:59:00Z' FROM clients WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b' AND full_name='Juliana Ferreira';

-- PASSO 11: LEADS
INSERT INTO leads (tenant_id, name, whatsapp, source, status, service_interest, estimated_value)
VALUES
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Bianca Souza',   '(34) 98111-0001', 'instagram', 'new',       'Mechas',    380.00),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Camila Nunes',   '(34) 98111-0002', 'whatsapp',  'contacted', 'Coloracao', 280.00),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Elaine Martins', '(34) 98111-0004', 'google',    'interested','Manicure',   75.00),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Debora Castro',  '(34) 98111-0003', 'indicacao', 'scheduled', 'Estetica',  180.00),
  ('d664018e-59f0-4d59-a3c7-503646041d5b', 'Fabiana Reis',   '(34) 98111-0005', 'facebook',  'converted', 'Corte',      95.00);

-- VERIFICAÇÃO FINAL
SELECT 'user_profiles'  AS tabela, COUNT(*) AS total FROM user_profiles          WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b'
UNION ALL SELECT 'clientes',       COUNT(*) FROM clients               WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b'
UNION ALL SELECT 'profissionais',  COUNT(*) FROM professionals         WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b'
UNION ALL SELECT 'servicos',       COUNT(*) FROM services              WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b'
UNION ALL SELECT 'agendamentos',   COUNT(*) FROM appointments          WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b'
UNION ALL SELECT 'financeiro',     COUNT(*) FROM financial_transactions WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b'
UNION ALL SELECT 'comissoes',      COUNT(*) FROM commissions           WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b'
UNION ALL SELECT 'pacotes',        COUNT(*) FROM packages              WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b'
UNION ALL SELECT 'leads',          COUNT(*) FROM leads                 WHERE tenant_id='d664018e-59f0-4d59-a3c7-503646041d5b';
