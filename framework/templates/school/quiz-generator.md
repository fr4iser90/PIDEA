# Quiz Generator Template

## Form Configuration

### Quiz Overview
- **Subject**: [Dropdown: Mathematics, Physics, Chemistry, Biology, History, Geography, Literature, English, German, French, Spanish, Art, Music, Computer Science, Economics, Philosophy]
- **Grade Level**: [Dropdown: Elementary (1-4), Middle School (5-8), High School (9-12), College/University]
- **Quiz Type**: [Dropdown: Multiple Choice, True/False, Fill in the Blank, Short Answer, Essay, Matching, Ordering, Drag & Drop]
- **Topic**: [Text Area: Specific topic or chapter]
- **Number of Questions**: [Input: Total questions]
- **Time Limit**: [Input: minutes (optional)]

### Question Distribution
- **Easy Questions**: [Input: Number of easy questions]
- **Medium Questions**: [Input: Number of medium questions]
- **Hard Questions**: [Input: Number of hard questions]
- **Question Types Mix**: [Text Area: Distribution of different question types]

### Content Requirements
- **Learning Objectives**: [Text Area: What students should demonstrate]
- **Key Concepts**: [Text Area: Main concepts to test]
- **Vocabulary Terms**: [Text Area: Important terms to include]
- **Real-world Applications**: [Text Area: Practical scenarios to include]
- **Common Misconceptions**: [Text Area: Wrong answers to include as distractors]

### Question Format
- **Question Style**: [Dropdown: Direct, Scenario-based, Problem-solving, Analysis, Application, Synthesis]
- **Answer Options**: [Input: Number of choices for multiple choice]
- **Partial Credit**: [Checkboxes: Allow partial credit, Show work required, Bonus points]
- **Randomization**: [Checkboxes: Randomize question order, Randomize answer choices]

### Assessment Criteria
- **Scoring Method**: [Dropdown: Points per question, Weighted scoring, Rubric-based]
- **Passing Grade**: [Input: Percentage to pass]
- **Grading Scale**: [Text Area: A-F scale or custom grading]
- **Feedback Type**: [Dropdown: Immediate, Delayed, Detailed explanations, Hints]

### Accessibility & Accommodations
- **Reading Level**: [Dropdown: Below grade level, At grade level, Above grade level]
- **Visual Aids**: [Checkboxes: Diagrams, Charts, Images, Graphs, None]
- **Audio Support**: [Checkboxes: Read aloud, Audio questions, None]
- **Time Accommodations**: [Text Area: Extended time or other accommodations]

## Generated Prompt Template

```
Create a comprehensive quiz for [SUBJECT] at [GRADE_LEVEL] level.

**Quiz Overview:**
- Type: [QUIZ_TYPE]
- Topic: [TOPIC]
- Questions: [NUMBER_OF_QUESTIONS]
- Time Limit: [TIME_LIMIT] minutes

**Question Distribution:**
- Easy: [EASY_QUESTIONS]
- Medium: [MEDIUM_QUESTIONS]
- Hard: [HARD_QUESTIONS]
- Mix: [QUESTION_TYPES_MIX]

**Content Requirements:**
- Learning Objectives: [LEARNING_OBJECTIVES]
- Key Concepts: [KEY_CONCEPTS]
- Vocabulary: [VOCABULARY_TERMS]
- Applications: [REAL_WORLD_APPLICATIONS]
- Misconceptions: [COMMON_MISCONCEPTIONS]

**Question Format:**
- Style: [QUESTION_STYLE]
- Answer Options: [ANSWER_OPTIONS]
- Partial Credit: [PARTIAL_CREDIT]
- Randomization: [RANDOMIZATION]

**Assessment:**
- Scoring: [SCORING_METHOD]
- Passing Grade: [PASSING_GRADE]%
- Grading Scale: [GRADING_SCALE]
- Feedback: [FEEDBACK_TYPE]

**Accessibility:**
- Reading Level: [READING_LEVEL]
- Visual Aids: [VISUAL_AIDS]
- Audio Support: [AUDIO_SUPPORT]
- Accommodations: [TIME_ACCOMMODATIONS]

Please provide:
1. Complete quiz with all questions
2. Answer key with explanations
3. Scoring rubric
4. Time management tips
5. Study guide recommendations
6. Common mistakes to watch for
7. Extension activities for advanced students
```

## Usage Instructions

1. Complete all relevant form fields
2. Generate formatted quiz prompt
3. Submit to AI for quiz generation
4. Review and customize questions
5. Create answer key and distribute 