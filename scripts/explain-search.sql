EXPLAIN ANALYZE
SELECT d.id, u.name, s.name AS specialty, c.name AS clinic, c.city,
       d.experience_years, d.consultation_fee
FROM doctors d
JOIN users u       ON u.id = d.user_id
JOIN specialties s ON s.id = d.specialty_id
JOIN clinics c     ON c.id = d.clinic_id
WHERE lower(s.name) = lower('Cardiology')
  AND lower(c.city) = lower('Bengaluru')
ORDER BY d.experience_years DESC, d.id
LIMIT 10;