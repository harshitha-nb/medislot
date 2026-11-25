INSERT INTO slots (doctor_id, start_time, end_time)
SELECT d.id, x.t, x.t + interval '30 minutes'
FROM doctors d
CROSS JOIN generate_series(0, 7) AS n
CROSS JOIN generate_series(0, 7) AS s
CROSS JOIN LATERAL (
  SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
          + n * interval '1 day' + interval '9 hours' + s * interval '30 minutes')
         AT TIME ZONE 'Asia/Kolkata' AS t
) x
WHERE x.t > now()
ON CONFLICT (doctor_id, start_time) DO NOTHING;