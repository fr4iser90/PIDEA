-- Beispiel-Initialdaten für Sections
INSERT INTO sections (name, title, type, content, display_order) VALUES
  ('about', 'Über mich', 'text', '{"text": "Ich bin Gesundheits- und Krankenpfleger, KI- und Linux-Fan, Bastler und Angler aus Leipzig."}', 1),
  ('nixos', 'NixOS', 'text', '{"text": "Mein Weg zu NixOS begann mit Debian, dann 3 Wochen Walls, viel gebrickt, viel gelernt. Jetzt liebe ich die Flexibilität!"}', 2),
  ('homelab', 'Homelab', 'text', '{"text": "Hier findest du bald Fotos, Hardware-Setups und Automatisierungen aus meinem Homelab."}', 3),
  ('angeln', 'Angeln', 'text', '{"text": "Ich angle am liebsten an der Pleiße und Lauer in Leipzig – Ansitz auf Friedfisch und Aktivangeln im Sommer."}', 4),
  ('contact', 'Kontakt', 'text', '{"text": "Kontaktformular wird hier angezeigt."}', 5);

-- Beispiel-Initialdaten für Skills
INSERT INTO skills (category, description, items, display_order) VALUES
  ('KI & Prompting', 'Ich liebe es, mit KI-Systemen zu experimentieren und Prompts zu bauen.', '["Prompt Engineering", "KI-Tools kreativ nutzen", "Ideen entwickeln & umsetzen"]', 1),
  ('Linux & NixOS', 'Ich bastle gerne an Linux-Systemen, vor allem an NixOS.', '["Linux Basics", "NixOS (Konfiguration, Hardware-Checks)", "Probleme lösen & Systeme retten"]', 2),
  ('Kreativität & Projekte', 'Ich habe Spaß daran, neue Projektideen zu entwickeln und mit KI-Unterstützung umzusetzen.', '["Projektideen & Brainstorming", "KI-generierte Projekte bauen", "2D Multiplayer Framework (mit KI-Hilfe)"]', 3),
  ('Angeln', 'In meiner Freizeit bin ich gerne am Wasser – am liebsten an der Pleiße oder Lauer in Leipzig.', '["Ansitz auf Friedfisch", "Aktivangeln im Sommer", "Pleiße, Lauer & Umgebung (Leipzig)"]', 4);

-- Default layout for home page with dynamic elements based on available sections
-- This will be created automatically by the service when no layout exists
-- The layout will include navbar, all available sections, skills, projects, and footer

