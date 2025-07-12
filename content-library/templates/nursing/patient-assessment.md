# Nursing Patient Assessment Template

## Form Configuration

### Patient Information
- **Patient Age**: [Input: years]
- **Gender**: [Dropdown: Male, Female, Other]
- **Weight**: [Input: kg/lbs]
- **Height**: [Input: cm/inches]
- **BMI**: [Auto-calculated]
- **Allergies**: [Text Area: Known allergies and reactions]
- **Current Medications**: [Text Area: List of medications with dosages]
- **Medical History**: [Text Area: Relevant medical conditions and surgeries]

### Vital Signs
- **Blood Pressure**: [Input: systolic/diastolic mmHg]
- **Heart Rate**: [Input: bpm]
- **Respiratory Rate**: [Input: breaths per minute]
- **Temperature**: [Input: °C/°F]
- **Oxygen Saturation**: [Input: %]
- **Pain Level**: [Dropdown: 0-10 scale or Wong-Baker FACES]

### Symptoms Assessment
- **Primary Complaint**: [Text Area: Main reason for visit/concern]
- **Onset**: [Dropdown: Sudden, Gradual, Chronic, Acute]
- **Duration**: [Input: hours/days/weeks/months]
- **Severity**: [Dropdown: Mild, Moderate, Severe, Critical]
- **Location**: [Text Area: Specific body areas affected]
- **Quality**: [Text Area: Description of symptoms (sharp, dull, throbbing, etc.)]
- **Aggravating Factors**: [Text Area: What makes symptoms worse]
- **Relieving Factors**: [Text Area: What provides relief]

### Physical Assessment
- ** Appearance**: [Checkboxes: Alert, Oriented, Distressed, Pale, Cyanotic, Diaphoretic, Edema, Jaundice]
- **Cardiovascular**: [Text Area: Heart sounds, pulses, edema, capillary refill]
- **Respiratory**: [Text Area: Breath sounds, effort, cough, sputum]
- **Gastrointestinal**: [Text Area: Bowel sounds, tenderness, nausea, vomiting]
- **Neurological**: [Text Area: Level of consciousness, motor function, sensation]
- **Skin**: [Text Area: Color, temperature, moisture, lesions, wounds]

### Laboratory Values
- **Complete Blood Count (CBC)**: [Text Area: WBC, RBC, Hgb, Hct, Platelets]
- **Basic Metabolic Panel (BMP)**: [Text Area: Na, K, Cl, CO2, BUN, Creatinine, Glucose]
- **Liver Function Tests**: [Text Area: AST, ALT, Bilirubin, Albumin]
- **Cardiac Enzymes**: [Text Area: Troponin, CK-MB, BNP]
- **Other Relevant Labs**: [Text Area: Additional lab results]

### Diagnostic Tests
- **Imaging**: [Checkboxes: X-ray, CT, MRI, Ultrasound, EKG, Echo]
- **Test Results**: [Text Area: Findings from diagnostic tests]
- **Pending Tests**: [Text Area: Tests ordered but not yet completed]

### Risk Factors
- **Social History**: [Text Area: Smoking, alcohol, drugs, occupation]
- **Family History**: [Text Area: Relevant family medical conditions]
- **Environmental Factors**: [Text Area: Recent travel, exposures, trauma]

## Generated Prompt Template

```
Perform a comprehensive nursing assessment for a [AGE]-year-old [GENDER] patient.

**Patient Demographics:**
- Weight: [WEIGHT] kg/lbs
- Height: [HEIGHT] cm/inches
- BMI: [BMI]
- Allergies: [ALLERGIES]
- Current Medications: [CURRENT_MEDICATIONS]
- Medical History: [MEDICAL_HISTORY]

**Vital Signs:**
- BP: [BLOOD_PRESSURE] mmHg
- HR: [HEART_RATE] bpm
- RR: [RESPIRATORY_RATE] bpm
- Temp: [TEMPERATURE] °C/°F
- SpO2: [OXYGEN_SATURATION]%
- Pain: [PAIN_LEVEL]

**Primary Assessment:**
- Chief Complaint: [PRIMARY_COMPLAINT]
- Onset: [ONSET]
- Duration: [DURATION]
- Severity: [SEVERITY]
- Location: [LOCATION]
- Quality: [QUALITY]
- Aggravating: [AGGRAVATING_FACTORS]
- Relieving: [RELIEVING_FACTORS]

**Physical Findings:**
- : [_APPEARANCE]
- Cardiovascular: [CARDIOVASCULAR]
- Respiratory: [RESPIRATORY]
- Gastrointestinal: [GASTROINTESTINAL]
- Neurological: [NEUROLOGICAL]
- Skin: [SKIN]

**Laboratory Data:**
- CBC: [CBC_VALUES]
- BMP: [BMP_VALUES]
- LFTs: [LFT_VALUES]
- Cardiac Enzymes: [CARDIAC_ENZYMES]
- Other: [OTHER_LABS]

**Diagnostic Tests:**
- Imaging: [IMAGING_TESTS]
- Results: [TEST_RESULTS]
- Pending: [PENDING_TESTS]

**Risk Factors:**
- Social: [SOCIAL_HISTORY]
- Family: [FAMILY_HISTORY]
- Environmental: [ENVIRONMENTAL_FACTORS]

Please provide:
1. Nursing diagnosis based on assessment
2. Priority nursing interventions
3. Expected outcomes
4. Patient education needs
5. Safety considerations
6. Follow-up recommendations
7. Potential complications to monitor
```

## Usage Instructions

1. Complete all relevant form fields
2. Generate formatted assessment prompt
3. Submit to AI for nursing analysis
4. Review and validate recommendations
5. Document in patient record 