-- Dealer DL3 was entered with what looked like a real person's name, phone number and email.
-- Demo data must be invented (CLAUDE.md §5, §8), so it becomes an invented dealer.
-- Data only (no structure change). Safe to run twice; does nothing where DL3 / U20 don't exist.
SET ROLE iotify_prototyper;

update core.dealers
   set name = 'Gulf Track Solutions', contact = 'Demo contact', updated_at = now()
 where id = 'DL3' and (name, contact) is distinct from ('Gulf Track Solutions', 'Demo contact');

update core.users
   set name = 'Gulf Track admin', email = 'admin@gulftrack.demo', updated_at = now()
 where id = 'U20' and (name, email) is distinct from ('Gulf Track admin', 'admin@gulftrack.demo');
