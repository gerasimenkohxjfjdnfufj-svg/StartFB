-- Устанавливаем PostGIS если доступен
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Проверяем версию
DO $$
BEGIN
  RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
EXCEPTION WHEN undefined_function THEN
  RAISE WARNING 'PostGIS not available — geometry fields will not work';
END;
$$;

COMMENT ON DATABASE dostupny_gorod IS 'Доступный город — пилот Москва 2026';
