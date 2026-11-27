require('dotenv').config();
const db = require('../src/config/db');
const { topUpSlots } = require('../src/jobs/topupSlots');

topUpSlots().finally(() => db.end());