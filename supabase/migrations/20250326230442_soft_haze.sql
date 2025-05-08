DO $$
DECLARE
  slot_date date;
  n integer;
BEGIN
  FOR n IN 1..14 LOOP
    slot_date := CURRENT_DATE + (n || ' days')::interval;
    
    -- Skip weekends (0 = Sunday, 6 = Saturday)
    IF EXTRACT(DOW FROM slot_date) NOT IN (0, 6) THEN
      -- Insert only if the slot doesn't exist
      IF NOT EXISTS (
        SELECT 1 
        FROM detention_slots 
        WHERE date = slot_date 
        AND teacher_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      ) THEN
        INSERT INTO detention_slots (date, teacher_id, capacity)
        VALUES (
          slot_date,
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          20
        );
      END IF;
    END IF;
  END LOOP;
END $$;