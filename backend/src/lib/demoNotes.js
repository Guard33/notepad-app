// Sample notes every demo account starts with. They're picked to show off
// each feature (pinning, tags, search, archive, trash) without any setup.
// Listed oldest first so the newest ends up at the top of the list.
export const DEMO_NOTES = [
  {
    title: "Recipe: weeknight dal",
    body:
      "1 cup red lentils, rinsed\n1 onion, 2 tomatoes, 3 garlic cloves\nTurmeric, cumin, chili\n\nSimmer lentils ~20 min. Fry the rest in ghee, stir in, squeeze of lemon.",
    tags: ["cooking"],
    archived: true,
  },
  {
    title: "Old to-do list",
    body: "Everything on here is done. Restore it from Trash if you miss it, or delete it forever.",
    tags: [],
    trashed: true,
  },
  {
    title: "Books to read",
    body: "- The Pragmatic Programmer\n- Designing Data-Intensive Applications\n- A Philosophy of Software Design",
    tags: ["personal", "reading"],
  },
  {
    title: "Side project ideas",
    body:
      "- Habit tracker that only asks one question a day\n- Browser extension that saves a tab as a note\n- Offline-first sync for this app 👀",
    tags: ["ideas"],
  },
  {
    title: "Weekly planning",
    body:
      "Mon: finish the report draft\nWed: review PRs, team sync\nFri: demo prep\n\nBlocker: waiting on design feedback for the settings page.",
    tags: ["work"],
  },
  {
    title: "👋 Welcome to the demo",
    body:
      "This is a throwaway account made just for you, with no sign-up needed. Poke at anything:\n\n" +
      "• Edit this note. It saves automatically as you type.\n" +
      "• Click a #tag in the sidebar to filter by it.\n" +
      "• Search for \"blocker\" and it finds the planning note by its contents.\n" +
      "• There's a recipe in the Archived tab and an old list in Trash.\n" +
      "• Hover a note and use the ⋯ menu to pin, archive, or trash it.\n" +
      "• Open an empty note and hit \"✦ Need an idea?\" for a writing prompt.\n\n" +
      "Everything here is deleted automatically within 24 hours.",
    tags: ["start-here"],
    pinned: true,
  },
];
