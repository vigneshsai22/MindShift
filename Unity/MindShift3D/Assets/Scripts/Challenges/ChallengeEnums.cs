// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ChallengeEnums
// Shared enumerations used across all challenge scripts.
// ═══════════════════════════════════════════════════════════════
namespace MindShift.Challenges
{
    public enum CognitiveCategory
    {
        Memory,
        Observation,
        Logic,
        Reaction,
        Spatial,
        Audio,
        Pattern
    }

    public enum DifficultyLevel
    {
        Easy   = 1,
        Medium = 2,
        Hard   = 3
    }

    public enum ChallengeType
    {
        MemoryObjectRecall,
        CCTVAnomalyHunt,
        MechanismLogicPuzzle,
        PanelFlashReaction,
        ShapeAlignment3D,
        AudioSequence,
        PatternLock
    }
}
