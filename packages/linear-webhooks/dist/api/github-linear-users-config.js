"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GH_LOGIN_to_LINEAR_DISPLAY_NAME = exports.LINEAR_DISPLAY_NAME_TO_GH_LOGIN = void 0;
/**
 * This file has a mapping between Github and Linear users. It is used by the Vercel app and by the Github Actions.
 */
exports.LINEAR_DISPLAY_NAME_TO_GH_LOGIN = {
    pato: "alcuadrado",
    gene: "feuGeneA",
    ["franco.victorio"]: "fvictorio",
    john: "kanej",
    morgan: "morgansliman",
};
exports.GH_LOGIN_to_LINEAR_DISPLAY_NAME = Object.fromEntries(Object.entries(exports.LINEAR_DISPLAY_NAME_TO_GH_LOGIN).map(([k, v]) => [v, k]));
