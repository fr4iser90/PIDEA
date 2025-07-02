# Nursing Medication Management Template

## Form Configuration

### Patient Information
- **Patient Age**: [Input: years]
- **Weight**: [Input: kg]
- **Height**: [Input: cm]
- **Allergies**: [Text Area: Drug allergies and reactions]
- **Current Medications**: [Text Area: All current medications with dosages]
- **Medical Conditions**: [Text Area: Relevant diagnoses affecting medication metabolism]
- **Liver Function**: [Dropdown: Normal, Mild Impairment, Moderate Impairment, Severe Impairment]
- **Kidney Function**: [Dropdown: Normal, Mild CKD, Moderate CKD, Severe CKD, ESRD]

### Medication Details
- **Medication Name**: [Input: Generic and brand names]
- **Classification**: [Dropdown: Antibiotic, Analgesic, Anticoagulant, Antihypertensive, Antidiabetic, Antipsychotic, Antidepressant, Antiarrhythmic, Diuretic, Steroid, Other]
- **Route of Administration**: [Dropdown: Oral, IV, IM, SC, Topical, Inhalation, Rectal, Ophthalmic, Otic]
- **Dosage**: [Input: Amount and unit]
- **Frequency**: [Dropdown: Once daily, Twice daily, Three times daily, Four times daily, Every 6 hours, Every 8 hours, Every 12 hours, As needed, Other]
- **Duration**: [Input: Days/weeks/months or ongoing]

### Administration Requirements
- **Timing**: [Text Area: Specific timing requirements (with meals, before bed, etc.)]
- **Preparation**: [Text Area: Special preparation needed (dilution, mixing, etc.)]
- **Administration Method**: [Text Area: Specific technique required]
- **Monitoring Required**: [Checkboxes: Blood pressure, Heart rate, Blood glucose, INR, Liver function, Kidney function, Drug levels, ECG, Oxygen saturation]
- **Precautions**: [Text Area: Special precautions or contraindications]

### Drug Interactions
- **Known Interactions**: [Text Area: List of interacting medications]
- **Food Interactions**: [Text Area: Foods to avoid or timing with meals]
- **Herbal Supplements**: [Text Area: Herbal interactions]
- **Alcohol**: [Dropdown: Safe, Avoid, Moderate use only]
- **Pregnancy/Lactation**: [Dropdown: Safe, Avoid, Consult provider]

### Side Effects
- **Common Side Effects**: [Text Area: Expected side effects]
- **Serious Side Effects**: [Text Area: Signs requiring immediate attention]
- **Patient Education**: [Text Area: What to tell patient about side effects]

### Monitoring Parameters
- **Vital Signs**: [Checkboxes: BP, HR, RR, Temp, SpO2]
- **Laboratory Tests**: [Text Area: Required lab monitoring]
- **Clinical Assessment**: [Text Area: Physical assessment findings to monitor]
- **Frequency of Monitoring**: [Dropdown: Every dose, Daily, Weekly, Monthly, As needed]

## Generated Prompt Template

```
Provide comprehensive medication management guidance for [MEDICATION_NAME] administration.

**Patient Profile:**
- Age: [AGE] years
- Weight: [WEIGHT] kg
- Height: [HEIGHT] cm
- Allergies: [ALLERGIES]
- Current Medications: [CURRENT_MEDICATIONS]
- Medical Conditions: [MEDICAL_CONDITIONS]
- Liver Function: [LIVER_FUNCTION]
- Kidney Function: [KIDNEY_FUNCTION]

**Medication Information:**
- Classification: [CLASSIFICATION]
- Route: [ROUTE_OF_ADMINISTRATION]
- Dosage: [DOSAGE]
- Frequency: [FREQUENCY]
- Duration: [DURATION]

**Administration Protocol:**
- Timing: [TIMING]
- Preparation: [PREPARATION]
- Method: [ADMINISTRATION_METHOD]
- Monitoring: [MONITORING_REQUIRED]
- Precautions: [PRECAUTIONS]

**Drug Interactions:**
- Medication Interactions: [KNOWN_INTERACTIONS]
- Food Interactions: [FOOD_INTERACTIONS]
- Herbal Interactions: [HERBAL_SUPPLEMENTS]
- Alcohol: [ALCOHOL]
- Pregnancy/Lactation: [PREGNANCY_LACTATION]

**Side Effects:**
- Common: [COMMON_SIDE_EFFECTS]
- Serious: [SERIOUS_SIDE_EFFECTS]
- Patient Education: [PATIENT_EDUCATION]

**Monitoring:**
- Vital Signs: [VITAL_SIGNS]
- Laboratory: [LABORATORY_TESTS]
- Clinical Assessment: [CLINICAL_ASSESSMENT]
- Frequency: [FREQUENCY_OF_MONITORING]

Please provide:
1. Safe administration guidelines
2. Monitoring protocols
3. Patient education points
4. Potential complications to watch for
5. Dose adjustment considerations
6. Emergency procedures if needed
7. Documentation requirements
```

## Usage Instructions

1. Complete medication and patient information
2. Generate formatted medication management prompt
3. Submit to AI for comprehensive guidance
4. Review and implement recommendations
5. Document administration and monitoring 