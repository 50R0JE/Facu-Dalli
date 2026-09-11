import { DEFAULT } from './data.js';

import { KEY } from './storage.js';

import { today } from './utils.js';

export const State = {

  view: "entreno",

  activeId: ({1:"lun",2:"mar",3:"mie",4:"jue",5:"vie"})[new Date().getDay()] || "lun",

  sb: null,

  cloudUser: null,

  cloudProfile: null,

  cloudLoading: false,

  routineTimer: null,

  brandName: "",

};

export let state;

try { const raw = localStorage.getItem(KEY); state = raw ? JSON.parse(raw) : null; } catch(e) { state = null; }

if (!state || !state.days) state = JSON.parse(JSON.stringify(DEFAULT));

if (!Array.isArray(state.habits)) state.habits = JSON.parse(JSON.stringify(DEFAULT.habits));

if (!state.habitsDate) state.habitsDate = today();

state.days.forEach(d => { if (d.subtitle == null) d.subtitle = ""; });

if (!Array.isArray(state.foods)) state.foods = [];

if (!Array.isArray(state.diary)) state.diary = [];

if (!state.diaryDate) state.diaryDate = today();

if (typeof state.calTarget === "undefined") state.calTarget = null;

if (typeof state.coachPlan === "undefined") state.coachPlan = null;

if (typeof state.info === "undefined") state.info = null;

if (typeof state.block === "undefined") state.block = null;

if (typeof state.calProfile === "undefined") state.calProfile = null;

if (typeof state.steps === "undefined") state.steps = 0;

if (!state.stepsDate) state.stepsDate = today();

if (typeof state.stepsGoal === "undefined") state.stepsGoal = 10000;

if (!Array.isArray(state.weights)) state.weights = [];

if (typeof state.water === "undefined") state.water = 0;

if (typeof state.waterGoal === "undefined") state.waterGoal = 3000;

if (typeof state.waterDate === "undefined") state.waterDate = today();

if (typeof state.restDefault === "undefined") state.restDefault = 120;

if (!Array.isArray(state.sessions)) state.sessions = [];

if (!state.daily || typeof state.daily !== "object") state.daily = {};

if (!state.checkins || typeof state.checkins !== "object") state.checkins = {};

if (!state.habitsDone || typeof state.habitsDone !== "object") state.habitsDone = {};

if (!state.days.find(d => d.id === State.activeId)) State.activeId = state.days[0].id;
