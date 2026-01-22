-- Remove 'youtube' from item_type enum by recreating it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type') THEN
    UPDATE items SET type = 'movie' WHERE type::text = 'youtube';

    CREATE TYPE item_type_new AS ENUM ('anime', 'movie', 'tv', 'game', 'book');

    ALTER TABLE items
      ALTER COLUMN type DROP DEFAULT,
      ALTER COLUMN type TYPE item_type_new
      USING type::text::item_type_new;

    ALTER TABLE items
      ALTER COLUMN type SET DEFAULT 'movie';

    DROP TYPE item_type;
    ALTER TYPE item_type_new RENAME TO item_type;
  END IF;
END $$;
