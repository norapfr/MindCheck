const WRITING_PROMPTS: string[] = [
    "What was the hardest part of today?",
    "What's one thing that made you smile recently?",
    "What's been on your mind the most lately?",
    "How did your body feel today?",
    "What are you looking forward to?",
    "What's something you wish someone understood right now?",
    "What drained your energy today?",
    "What gave you energy today?",
    "Is there something you've been avoiding thinking about?",
    "What would you tell a friend who felt the way you feel right now?",
    "What's one small thing that went well today?",
    "What do you need right now that you're not getting?",
];

export function getRandomPrompt(excluding?: string): string {
    if (WRITING_PROMPTS.length === 1) return WRITING_PROMPTS[0];
    let candidate: string;
    do {
        candidate = WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)];
    } while (candidate === excluding);
    return candidate;
}