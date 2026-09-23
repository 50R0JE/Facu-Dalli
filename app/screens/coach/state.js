export const CoachState = {

  coachClients: [],

  coachSel: null,

  coachData: null,

  coachInvite: null,

  coachDayFilter: null,

  coachEditDay: 0,

  coachDL: "",

  coachPlanForm: null,

  // arranca abierto solo si ya hay comidas cargadas para días de descanso — ver
  // coachPlanObj()/renderCoachPlan(): la mayoría de los clientes no necesita un reparto
  // aparte para el día de descanso, así que ocultamos esa tabla por defecto.
  coachPlanRestOpen: null,

  coachInfoForm: null,

  coachBlockForm: null,

  coachSearch: "",

  coachClientStats: {},

  coachView: "clients",

  coachClientTab: "ficha",

  coachTpls: [],

  coachTplEdit: null,

  coachApplyPicker: null,

  tplsError: null,

  coachPicker: null,

  coachPCat: null,

  coachPQ: "",

  coachSettingsOpen: false,

  // Editor de preguntas (ver preguntas.js): copia de trabajo mientras está abierto, y el
  // error de la última lectura de coach_questions (tabla sin crear, sin conexión…).
  coachQEdit: null,

  coachQError: null,

  coachNameForm: null,

  // ids de ejercicios expandidos en el editor de rutina — por defecto todo colapsado
  // para no tener una interfaz gigante con muchos ejercicios (ver renderCoachRoutine()).
  coachExpandedEx: new Set(),

  // menú de acciones (subir/bajar/insertar/cambiar) abierto en la card de ejercicio, por id
  coachExMenu: null,

};

export let coachCopyPicker = false;

export let coachWeekSel = null;
