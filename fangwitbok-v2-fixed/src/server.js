const app = require("./app");
const { scheduleTrashPurge } = require("./jobs/purgeTrash");

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[fangwitbok-api] listening on port ${PORT}`);
  scheduleTrashPurge();
});
