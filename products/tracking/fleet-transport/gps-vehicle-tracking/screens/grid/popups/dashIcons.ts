// IT-0055. The Dashboard cards' own icons and fixed markup (legend, hour axis), copied from the
// Dashboard page (screens/dash) by the approved prototype. Constant strings, safe to inject as markup.
export const DASH = {
 "head": {
  "alerts": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"></path><path d=\"M12 9v4\"></path><path d=\"M12 17h.01\"></path></svg>",
  "act": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\"></path></svg>",
  "odo": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m12 14 4-4\"></path><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"></path></svg>",
  "speed": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m12 14 4-4\"></path><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"></path></svg>",
  "drivers": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978\"></path><path d=\"M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978\"></path><path d=\"M18 9h1.5a1 1 0 0 0 0-5H18\"></path><path d=\"M4 22h16\"></path><path d=\"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z\"></path><path d=\"M6 9H4.5a1 1 0 0 1 0-5H6\"></path></svg>"
 },
 "ddlIcon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide td-ddl__icon\" aria-hidden=\"true\"><path d=\"M8 2v4\"></path><path d=\"M16 2v4\"></path><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"></rect><path d=\"M3 10h18\"></path><path d=\"M8 14h.01\"></path><path d=\"M12 14h.01\"></path><path d=\"M16 14h.01\"></path><path d=\"M8 18h.01\"></path><path d=\"M12 18h.01\"></path><path d=\"M16 18h.01\"></path></svg>",
 "th": [
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M8 2v4\"></path><path d=\"M16 2v4\"></path><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"></rect><path d=\"M3 10h18\"></path><path d=\"M8 14h.01\"></path><path d=\"M12 14h.01\"></path><path d=\"M16 14h.01\"></path><path d=\"M8 18h.01\"></path><path d=\"M12 18h.01\"></path><path d=\"M16 18h.01\"></path></svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M8 2v4\"></path><path d=\"M16 2v4\"></path><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"></rect><path d=\"M3 10h18\"></path><path d=\"M8 14h.01\"></path><path d=\"M12 14h.01\"></path><path d=\"M16 14h.01\"></path><path d=\"M8 18h.01\"></path><path d=\"M12 18h.01\"></path><path d=\"M16 18h.01\"></path></svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M8 2v4\"></path><path d=\"M16 2v4\"></path><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"></rect><path d=\"M3 10h18\"></path><path d=\"M8 14h.01\"></path><path d=\"M12 14h.01\"></path><path d=\"M16 14h.01\"></path><path d=\"M8 18h.01\"></path><path d=\"M12 18h.01\"></path><path d=\"M16 18h.01\"></path></svg>"
 ],
 "cats": [
  {
   "tone": "red",
   "title": "Overspeed",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m12 14 4-4\"></path><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"></path></svg>"
  },
  {
   "tone": "red",
   "title": "Harsh Braking",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m15 9-6 6\"></path><path d=\"M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z\"></path><path d=\"m9 9 6 6\"></path></svg>"
  },
  {
   "tone": "orange",
   "title": "Harsh Driving",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"></path><path d=\"M12 9v4\"></path><path d=\"M12 17h.01\"></path></svg>"
  },
  {
   "tone": "amber",
   "title": "Harsh Cornering",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"></path><path d=\"M12 9v4\"></path><path d=\"M12 17h.01\"></path></svg>"
  },
  {
   "tone": "blue",
   "title": "Idle",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M12 6v6l4 2\"></path><circle cx=\"12\" cy=\"12\" r=\"10\"></circle></svg>"
  },
  {
   "tone": "teal",
   "title": "Geofence Entry",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0\"></path><circle cx=\"12\" cy=\"8\" r=\"2\"></circle><path d=\"M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712\"></path></svg>"
  },
  {
   "tone": "orange",
   "title": "Geofence Exit",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0\"></path><circle cx=\"12\" cy=\"8\" r=\"2\"></circle><path d=\"M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712\"></path></svg>"
  },
  {
   "tone": "amber",
   "title": "Power Cut",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\"></path></svg>"
  },
  {
   "tone": "teal",
   "title": "Towed",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"></path><path d=\"M15 18H9\"></path><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"></path><circle cx=\"17\" cy=\"18\" r=\"2\"></circle><circle cx=\"7\" cy=\"18\" r=\"2\"></circle></svg>"
  },
  {
   "tone": "red",
   "title": "SOS",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M7 18v-6a5 5 0 1 1 10 0v6\"></path><path d=\"M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z\"></path><path d=\"M21 12h1\"></path><path d=\"M18.5 4.5 18 5\"></path><path d=\"M2 12h1\"></path><path d=\"M12 2v1\"></path><path d=\"m4.929 4.929.707.707\"></path><path d=\"M12 12v6\"></path></svg>"
  },
  {
   "tone": "amber",
   "title": "Low Battery",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M22 14v-4\"></path><path d=\"M6 14v-4\"></path><rect x=\"2\" y=\"6\" width=\"16\" height=\"12\" rx=\"2\"></rect></svg>"
  },
  {
   "tone": "dark",
   "title": "Device Offline",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M12 20h.01\"></path><path d=\"M8.5 16.429a5 5 0 0 1 7 0\"></path><path d=\"M5 12.859a10 10 0 0 1 5.17-2.69\"></path><path d=\"M19 12.859a10 10 0 0 0-2.007-1.523\"></path><path d=\"M2 8.82a15 15 0 0 1 4.177-2.643\"></path><path d=\"M22 8.82a15 15 0 0 0-11.288-3.764\"></path><path d=\"m2 2 20 20\"></path></svg>"
  }
 ],
 "kpi": [
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"></path><path d=\"M15 18H9\"></path><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"></path><circle cx=\"17\" cy=\"18\" r=\"2\"></circle><circle cx=\"7\" cy=\"18\" r=\"2\"></circle></svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m12 14 4-4\"></path><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"></path></svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M12 5v14\"></path><path d=\"m19 12-7 7-7-7\"></path></svg>",
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m5 12 7-7 7 7\"></path><path d=\"M12 19V5\"></path></svg>"
 ],
 "marker": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"></path><path d=\"M15 18H9\"></path><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"></path><circle cx=\"17\" cy=\"18\" r=\"2\"></circle><circle cx=\"7\" cy=\"18\" r=\"2\"></circle></svg>",
 "hbadge": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide\" aria-hidden=\"true\"><path d=\"m12 14 4-4\"></path><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"></path></svg>",
 "legend": "<div class=\"td-tl__legend\"><span class=\"td-tl__axis-label\">Time (Hours)</span><span class=\"tone-green\"><i class=\"td-dot\"></i>Running</span><span class=\"tone-red\"><i class=\"td-dot\"></i>Stopped</span><span class=\"tone-blue\"><i class=\"td-dot\"></i>Idle</span><span class=\"tone-orange\"><i class=\"td-dot\"></i>Overspeed</span><span class=\"tone-teal\"><i class=\"td-dot\"></i>Towed</span><span class=\"tone-dark\"><i class=\"td-dot\"></i>No Transmit</span><span class=\"tone-gray\"><i class=\"td-dot\"></i>Yet to Transmit</span></div>",
 "hours": "<div class=\"td-tl__head\"><span>Vehicle</span><div class=\"td-tl__hours\"><span>00:00</span><span>02:00</span><span>04:00</span><span>06:00</span><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span><span>22:00</span></div></div>"
} as const;
