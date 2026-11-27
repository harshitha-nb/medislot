require('dotenv').config();
const app = require('./app');
const { startSlotTopUp } = require('./jobs/topupSlots');

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`MediSlot running on port ${port}`));

// Demo mode: keep slots available for the next week (switched on only on the live site)
if (process.env.AUTO_TOPUP_SLOTS === 'on') startSlotTopUp();