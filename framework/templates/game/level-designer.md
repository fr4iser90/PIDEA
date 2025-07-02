# Game Level Designer Template

## Form Configuration

### Level Overview
- **Level Type**: [Dropdown: Tutorial, Story, Challenge, Boss Fight, Exploration, Puzzle, Combat, Stealth, Racing, Survival]
- **Level Number**: [Input: Sequential number in game]
- **Estimated Duration**: [Input: minutes to complete]
- **Difficulty**: [Dropdown: Easy, Normal, Hard, Expert, Variable]
- **Theme/Setting**: [Text Area: Visual and atmospheric description]
- **Story Context**: [Text Area: Narrative elements and objectives]

### Level Structure
- **Layout Type**: [Dropdown: Linear, Open World, Hub and Spoke, Maze, Arena, Procedural]
- **Size**: [Dropdown: Small, Medium, Large, Massive]
- **Checkpoints**: [Input: Number of save points]
- **Exit Conditions**: [Text Area: How to complete the level]
- **Alternative Paths**: [Text Area: Secret areas or optional routes]
- **Backtracking**: [Dropdown: None, Minimal, Moderate, Heavy]

### Gameplay Elements
- **Enemies/Types**: [Text Area: Types and placement of enemies]
- **Obstacles**: [Text Area: Environmental challenges]
- **Puzzles**: [Text Area: Brain teasers or logic challenges]
- **Collectibles**: [Text Area: Items to find and collect]
- **Power-ups**: [Text Area: Temporary abilities or bonuses]
- **Environmental Hazards**: [Text Area: Dangerous elements in the level]

### Player Progression
- **Starting Equipment**: [Text Area: What player has at level start]
- **Available Upgrades**: [Text Area: What can be obtained during level]
- **Skill Requirements**: [Text Area: Abilities needed to complete level]
- **Learning Objectives**: [Text Area: New skills taught in this level]
- **Mastery Challenges**: [Text Area: Optional difficult content]

### Visual Design
- **Art Style**: [Dropdown: Realistic, Cartoon, Pixel Art, Abstract, Minimalist, Dark, Bright]
- **Color Palette**: [Text Area: Primary colors and mood]
- **Lighting**: [Dropdown: Bright, Dim, Dynamic, Atmospheric, Dramatic]
- **Weather Effects**: [Checkboxes: Rain, Snow, Fog, Wind, Clear]
- **Particle Effects**: [Text Area: Special visual effects]
- **Camera Behavior**: [Dropdown: Fixed, Follow, Cinematic, Player-controlled]

### Audio Design
- **Background Music**: [Text Area: Musical style and mood]
- **Sound Effects**: [Text Area: Important audio cues]
- **Ambient Sounds**: [Text Area: Environmental audio]
- **Voice Acting**: [Text Area: Character dialogue or narration]
- **Audio Triggers**: [Text Area: Events that trigger specific sounds]

### Technical Considerations
- **Performance Budget**: [Text Area: Memory and processing limits]
- **Loading Zones**: [Text Area: Areas that require loading]
- **Optimization**: [Text Area: Performance considerations]
- **Platform Limitations**: [Text Area: Hardware constraints]
- **Accessibility**: [Text Area: Features for disabled players]

## Generated Prompt Template

```
Design a comprehensive level for a [LEVEL_TYPE] level (Level [LEVEL_NUMBER]).

**Level Overview:**
- Duration: [ESTIMATED_DURATION] minutes
- Difficulty: [DIFFICULTY]
- Theme: [THEME_SETTING]
- Story: [STORY_CONTEXT]

**Structure:**
- Layout: [LAYOUT_TYPE]
- Size: [SIZE]
- Checkpoints: [CHECKPOINTS]
- Exit: [EXIT_CONDITIONS]
- Alternative Paths: [ALTERNATIVE_PATHS]
- Backtracking: [BACKTRACKING]

**Gameplay Elements:**
- Enemies: [ENEMIES_TYPES]
- Obstacles: [OBSTACLES]
- Puzzles: [PUZZLES]
- Collectibles: [COLLECTIBLES]
- Power-ups: [POWER_UPS]
- Hazards: [ENVIRONMENTAL_HAZARDS]

**Player Progression:**
- Starting Equipment: [STARTING_EQUIPMENT]
- Upgrades: [AVAILABLE_UPGRADES]
- Skill Requirements: [SKILL_REQUIREMENTS]
- Learning: [LEARNING_OBJECTIVES]
- Mastery: [MASTERY_CHALLENGES]

**Visual Design:**
- Art Style: [ART_STYLE]
- Colors: [COLOR_PALETTE]
- Lighting: [LIGHTING]
- Weather: [WEATHER_EFFECTS]
- Particles: [PARTICLE_EFFECTS]
- Camera: [CAMERA_BEHAVIOR]

**Audio:**
- Music: [BACKGROUND_MUSIC]
- Sound Effects: [SOUND_EFFECTS]
- Ambient: [AMBIENT_SOUNDS]
- Voice: [VOICE_ACTING]
- Triggers: [AUDIO_TRIGGERS]

**Technical:**
- Performance: [PERFORMANCE_BUDGET]
- Loading: [LOADING_ZONES]
- Optimization: [OPTIMIZATION]
- Platform: [PLATFORM_LIMITATIONS]
- Accessibility: [ACCESSIBILITY]

Please provide:
1. Detailed level layout and flow
2. Enemy and obstacle placement
3. Puzzle and challenge design
4. Visual and audio specifications
5. Technical implementation notes
6. Playtesting considerations
7. Iteration and balance recommendations
```

## Usage Instructions

1. Complete all relevant form fields
2. Generate formatted level design prompt
3. Submit to AI for comprehensive level design
4. Review and iterate on recommendations
5. Create detailed level documentation 