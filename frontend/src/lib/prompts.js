// Curated writing prompts, grouped so a note's tags can steer which pool
// gets pulled from. No API calls, no cost — just a static list.

const GENERAL = [
  "What's on your mind right now?",
  "Something you want to remember from today",
  "A question you don't have the answer to yet",
  "One thing you're looking forward to",
  "Something you noticed but almost forgot",
  "A decision you're weighing",
  "What would make tomorrow better than today?",
  "Something you'd tell your past self",
  "A small win worth writing down",
  "What's taking up space in your head right now?",
];

const CATEGORIES = {
  work: {
    keywords: ["work", "job", "career", "meeting", "project"],
    prompts: [
      "What's blocking you right now?",
      "A decision you need to make this week",
      "Something that went well at work today",
      "An idea worth revisiting later",
      "What would you do differently on this?",
      "A note to your future self about this task",
    ],
  },
  personal: {
    keywords: ["journal", "gratitude", "personal", "life", "diary"],
    prompts: [
      "Something you're grateful for today",
      "A person you've been thinking about",
      "How are you actually feeling right now?",
      "Something you'd like to do more of",
      "A memory that came up today",
      "What do you need right now?",
    ],
  },
  ideas: {
    keywords: ["idea", "ideas", "project", "brainstorm", "creative"],
    prompts: [
      "A problem worth solving",
      "An idea you haven't fully thought through",
      "Something you saw that sparked an idea",
      "A 'what if' worth exploring",
      "A project you keep putting off",
      "Something worth building",
    ],
  },
};

function poolForTags(tags = []) {
  const lowerTags = tags.map((t) => t.toLowerCase());
  const matched = Object.values(CATEGORIES).find((cat) =>
    cat.keywords.some((kw) => lowerTags.some((tag) => tag.includes(kw)))
  );
  return matched ? [...matched.prompts, ...GENERAL] : GENERAL;
}

// Avoids immediately repeating the same prompt twice in a row.
export function getSuggestion(tags, lastPrompt) {
  const pool = poolForTags(tags);
  const options = pool.filter((p) => p !== lastPrompt);
  const choices = options.length > 0 ? options : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}
