-- Lägg till koppling mellan artikelrader och objekt
ALTER TABLE article_rows 
ADD COLUMN object_id uuid REFERENCES order_objects(id) ON DELETE SET NULL;