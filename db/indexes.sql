CREATE INDEX IF NOT EXISTS idx_doctors_specialty_exp ON doctors (specialty_id, experience_years DESC, id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic        ON doctors (clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinics_city_lower    ON clinics (lower(city));
CREATE INDEX IF NOT EXISTS idx_appointments_patient  ON appointments (patient_id);