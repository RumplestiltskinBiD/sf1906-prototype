// Approved artwork from DECISION_LOG.md (27 Nov 2026); no rule inference.
// Tokens are resolved at render time to a common ink and surface color.
export const TILE_INK='#FFF4DB';
export const RESOURCE_COLORS=Object.freeze({Lumber:'#A66B35',Masonry:'#F5F4F0',Steel:'#58636F',Beer:'#E77DAD',Bread:'#E77DAD',Contraband:'#008C83'});
const drawings={
 "construction": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M36 11H64L91 26.5V73.5L50 97L9 73.5V26.5Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "g",
    "attrs": {
     "transform": "rotate(40 50 52)",
     "fill": "#3C607C"
    },
    "children": [
     {
      "tag": "path",
      "attrs": {
       "d": "M44 39H56V78Q50 84 44 78Z M26 25H67L78 36L67 47H26Z"
      },
      "children": []
     }
    ]
   }
  ]
 },
 "completion": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M36 11H64L91 26.5V73.5L50 97L9 73.5V26.5Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M27 50L43 66L74 33",
     "fill": "none",
     "stroke": "#3C607C",
     "stroke-width": "10",
     "stroke-linejoin": "round",
     "stroke-linecap": "round"
    },
    "children": []
   }
  ]
 },
 "newspaper": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "rect",
    "attrs": {
     "x": "3",
     "y": "14",
     "width": "94",
     "height": "72",
     "rx": "4",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "text",
    "attrs": {
     "x": "50",
     "y": "42",
     "text-anchor": "middle",
     "font-family": "serif",
     "font-weight": "bold",
     "font-size": "27",
     "fill": "#3C607C"
    },
    "children": [],
    "text": "NEWS"
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M11 48H89V52H11Z M11 58H40V77H11Z M48 58H89V63H48Z M48 70H89V75H48Z",
     "fill": "#3C607C"
    },
    "children": []
   }
  ]
 },
 "year": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M16 5H84V15H16Z M16 85H84V95H16Z M24 19H76C76 35 64 44 56 50C64 56 76 65 76 81H24C24 65 36 56 44 50C36 44 24 35 24 19Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M33 24H67Q65 36 50 45Q35 36 33 24Z M32 76L50 60L68 76Z",
     "fill": "#3C607C"
    },
    "children": []
   }
  ]
 },
 "production": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M50 3L86 41H65V95H35V41H14Z",
     "fill": "#FFF4DB"
    },
    "children": []
   }
  ]
 },
 "delivery": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M4 28L29 15L54 28V62L29 76L4 62Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M4 28L29 43L54 28M29 43V76",
     "stroke": "#3C607C",
     "stroke-width": "3.5",
     "fill": "none"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M57 39H76V25L99 50L76 75V61H57Z",
     "fill": "#FFF4DB"
    },
    "children": []
   }
  ]
 },
 "movement": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "g",
    "attrs": {
     "transform": "rotate(-22 50 50)",
     "fill": "#FFF4DB"
    },
    "children": [
     {
      "tag": "path",
      "attrs": {
       "d": "M22 49Q11 37 14 23Q17 9 30 9Q44 10 43 26L36 49Z M22 55H36V73Q29 79 22 73Z"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "d": "M64 67Q53 55 56 41Q59 27 72 27Q86 28 85 44L78 67Z M64 73H78V91Q71 97 64 91Z"
      },
      "children": []
     }
    ]
   }
  ]
 },
 "disaster": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M5 17H95V90H5Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M24 5V24M76 5V24",
     "stroke": "#FFF4DB",
     "stroke-width": "9",
     "stroke-linecap": "round"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M5 35H95",
     "stroke": "#3C607C",
     "stroke-width": "5"
    },
    "children": []
   },
   {
    "tag": "text",
    "attrs": {
     "x": "50",
     "y": "70",
     "text-anchor": "middle",
     "font-weight": "bold",
     "font-size": "34",
     "fill": "#3C607C"
    },
    "children": [],
    "text": "1906"
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M38 73L48 79L42 85L54 90",
     "stroke": "#3C607C",
     "stroke-width": "3",
     "fill": "none"
    },
    "children": []
   }
  ]
 },
 "credit": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M17 4H65L85 24V96H17Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M65 4V24H85",
     "stroke": "#3C607C",
     "stroke-width": "4",
     "fill": "none"
    },
    "children": []
   },
   {
    "tag": "text",
    "attrs": {
     "x": "49",
     "y": "65",
     "font-size": "49",
     "font-weight": "bold",
     "text-anchor": "middle",
     "fill": "#3C607C"
    },
    "children": [],
    "text": "$"
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M29 76H73M29 86H60",
     "stroke": "#3C607C",
     "stroke-width": "4",
     "stroke-linecap": "round"
    },
    "children": []
   }
  ]
 },
 "goal": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "rect",
    "attrs": {
     "x": "17",
     "y": "5",
     "width": "66",
     "height": "90",
     "rx": "6",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M33 76V25",
     "stroke": "#3C607C",
     "stroke-width": "6",
     "stroke-linecap": "round"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M35 24H72L61 39L72 54H35Z",
     "fill": "#3C607C"
    },
    "children": []
   }
  ]
 },
 "warehouse": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M3 31L50 5L97 31V94H3Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M13 32H87V94H13Z",
     "fill": "#3C607C"
    },
    "children": []
   },
   {
    "tag": "g",
    "attrs": {
     "fill": "#FFF4DB",
     "stroke": "none"
    },
    "children": [
     {
      "tag": "rect",
      "attrs": {
       "x": "18",
       "y": "35",
       "width": "30",
       "height": "27",
       "rx": "1.5"
      },
      "children": []
     },
     {
      "tag": "rect",
      "attrs": {
       "x": "52",
       "y": "35",
       "width": "30",
       "height": "27",
       "rx": "1.5"
      },
      "children": []
     },
     {
      "tag": "rect",
      "attrs": {
       "x": "18",
       "y": "64",
       "width": "30",
       "height": "27",
       "rx": "1.5"
      },
      "children": []
     },
     {
      "tag": "rect",
      "attrs": {
       "x": "52",
       "y": "64",
       "width": "30",
       "height": "27",
       "rx": "1.5"
      },
      "children": []
     }
    ]
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M22 39L44 58M44 39L22 58 M56 39L78 58M78 39L56 58 M22 68L44 87M44 68L22 87 M56 68L78 87M78 68L56 87",
     "stroke": "#3C607C",
     "stroke-width": "4.5",
     "stroke-linecap": "round",
     "fill": "none"
    },
    "children": []
   }
  ]
 },
 "partnership": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "g",
    "attrs": {
     "transform": "translate(2 8) scale(.96)"
    },
    "children": [
     {
      "tag": "path",
      "attrs": {
       "d": "M2 28L18 17L34 40L17 55L2 41Z M98 28L82 17L66 40L83 55L98 41Z M24 24L38 19L49 24L35 37Q30 44 37 50Q44 55 51 48L58 41L79 62Q85 69 78 73L72 75Q72 83 64 83L57 80Q54 88 47 84L21 60L16 51Z M76 25L62 20Q54 17 47 24L36 38Q31 45 38 47Q42 49 47 44L57 34L79 57L84 48Z",
       "fill": "#FFF4DB"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "d": "M51 24L36 39Q31 46 38 48Q43 50 48 44L57 35L79 57 M62 63L74 74 M52 73L63 83",
       "stroke": "#3C607C",
       "stroke-width": "3",
       "stroke-linecap": "round",
       "fill": "none"
      },
      "children": []
     }
    ]
   }
  ]
 },
 "inspection": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "circle",
    "attrs": {
     "cx": "39",
     "cy": "39",
     "r": "29",
     "fill": "none",
     "stroke": "#FFF4DB",
     "stroke-width": "11"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M58 65L68 55L97 84L85 96Z",
     "fill": "#FFF4DB"
    },
    "children": []
   }
  ]
 },
 "research": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "g",
    "attrs": {
     "fill": "#FFF4DB"
    },
    "children": [
     {
      "tag": "path",
      "attrs": {
       "d": "M34 6L52 15L32 56L14 47Z M32 57L42 62L35 75L25 70Z M58 29Q91 39 84 65Q80 83 61 88H91V98H9V87H42Q72 83 72 61Q71 47 51 42Z M8 73H54V82H8Z"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "d": "M35 0L51 8L47 16L31 8Z"
      },
      "children": []
     }
    ]
   }
  ]
 },
 "port": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "circle",
    "attrs": {
     "cx": "50",
     "cy": "15",
     "r": "10",
     "fill": "none",
     "stroke": "#FFF4DB",
     "stroke-width": "7"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M45 25H55V79Q73 75 79 61L65 63L85 43L96 68L87 64Q77 90 50 96Q23 90 13 64L4 68L15 43L35 63L21 61Q27 75 45 79Z M30 36H70V44H30Z",
     "fill": "#FFF4DB"
    },
    "children": []
   }
  ]
 },
 "rail": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M33 4H42L32 96H18Z M58 4H67L82 96H68Z M26 12H74V19H26Z M22 32H78V40H22Z M17 55H83V64H17Z M10 81H90V92H10Z",
     "fill": "#FFF4DB"
    },
    "children": []
   }
  ]
 },
 "fire": {
  "viewBox": "0 0 64 64",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M29 3C46 11 33 23 43 25C48 23 50 19 49 14C65 32 63 50 48 58H16C-1 49 1 29 16 21C13 29 22 31 24 24Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "text",
    "attrs": {
     "x": "32",
     "y": "49",
     "font-size": "26",
     "font-weight": "bold",
     "text-anchor": "middle",
     "fill": "#3C607C"
    },
    "children": [],
    "text": "+2"
   }
  ]
 },
 "upgrade": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M62 8C48 5 34 18 37 33L10 67Q1 79 13 90Q24 99 35 88L64 53C81 56 94 42 91 26L76 40L63 37L59 24L73 10Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "circle",
    "attrs": {
     "cx": "23",
     "cy": "78",
     "r": "5",
     "fill": "#3C607C"
    },
    "children": []
   }
  ]
 },
 "quick": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M59 4L13 57H44L36 96L88 38H55Z",
     "fill": "#FFF4DB"
    },
    "children": []
   }
  ]
 },
 "project": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M36 11H64L91 26.5V73.5L50 97L9 73.5V26.5Z",
     "fill": "#FFF4DB"
    },
    "children": []
   }
  ]
 },
 "firehouse": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M19 64C12 30 37 17 50 17C72 17 91 38 82 64L94 75Q50 90 6 75Z",
     "fill": "#FFF4DB"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M36 29L50 24L64 29V50L50 61L36 50Z",
     "fill": "#3C607C"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M22 67Q50 75 79 67",
     "stroke": "#3C607C",
     "stroke-width": "3.5",
     "fill": "none",
     "stroke-linecap": "round"
    },
    "children": []
   }
  ]
 },
 "medical": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M37 10H63V37H90V63H63V90H37V63H10V37H37Z",
     "fill": "#FFF4DB"
    },
    "children": []
   }
  ]
 },
 "police": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "g",
    "attrs": {
     "fill": "#FFF4DB"
    },
    "children": [
     {
      "tag": "path",
      "attrs": {
       "d": "M8 30L18 15Q50 0 82 15L92 30L76 41H24Z"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "d": "M24 44H76V50Q50 62 24 50Z"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "d": "M31 57Q50 66 69 57L66 75Q50 96 34 75Z"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "d": "M43 17L50 13L57 17V28L50 33L43 28Z",
       "fill": "#3C607C"
      },
      "children": []
     }
    ]
   }
  ]
 },
 "influence": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "g",
    "attrs": {
     "fill": "#253745"
    },
    "children": [
     {
      "tag": "circle",
      "attrs": {
       "cx": "50",
       "cy": "18",
       "r": "12"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "d": "M27 50V43Q27 33 50 33Q73 33 73 43V50Z"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "d": "M13 48H87V60H13Z M22 64H78L72 94H28Z"
      },
      "children": []
     }
    ]
   }
  ]
 },
 "earthquake": {
  "viewBox": "0 0 80 80",
  "children": [
   {
    "tag": "g",
    "attrs": {
     "transform": "rotate(9 40 71)",
     "fill": "currentColor",
     "fill-rule": "evenodd"
    },
    "children": [
     {
      "tag": "path",
      "attrs": {
       "d": "M24 44L34 39L44 46L55 41L66 47V74H24Z M31 52H41V64H31Z M49 52H59V64H49Z"
      },
      "children": []
     },
     {
      "tag": "path",
      "attrs": {
       "transform": "translate(-8 0)",
       "d": "M24 5H66V39L55 34L44 39L34 32L24 37Z M31 13H41V24H31Z M49 13H59V24H49Z"
      },
      "children": []
     }
    ]
   }
  ]
 },
 "money": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "text",
    "attrs": {
     "x": "50",
     "y": "78",
     "text-anchor": "middle",
     "font-size": "88",
     "font-weight": "bold",
     "fill": "currentColor"
    },
    "children": [],
    "text": "$"
   }
  ]
 },
 "vp": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "text",
    "attrs": {
     "x": "50",
     "y": "71",
     "text-anchor": "middle",
     "font-size": "58",
     "font-weight": "bold",
     "fill": "currentColor"
    },
    "children": [],
    "text": "VP"
   }
  ]
 },
 "income": {
  "viewBox": "0 0 64 64",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M7 25A25 25 0 0 1 54 19M54 6V19H41M57 39A25 25 0 0 1 10 45M10 58V45H23",
     "stroke": "currentColor",
     "stroke-width": "3.5",
     "stroke-linecap": "round",
     "stroke-linejoin": "round",
     "fill": "none"
    },
    "children": []
   },
   {
    "tag": "text",
    "attrs": {
     "x": "32",
     "y": "43",
     "font-size": "31",
     "font-weight": "bold",
     "text-anchor": "middle",
     "fill": "currentColor"
    },
    "children": [],
    "text": "$"
   }
  ]
 },
 "land": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M24 48L9 56L50 76L91 56L76 48 M9 56V64L50 84L91 64V56 M50 76V84",
     "stroke": "currentColor",
     "stroke-width": "3",
     "stroke-linecap": "round",
     "stroke-linejoin": "round",
     "fill": "none"
    },
    "children": []
   },
   {
    "tag": "text",
    "attrs": {
     "x": "50",
     "y": "54",
     "font-size": "35",
     "font-weight": "bold",
     "text-anchor": "middle",
     "fill": "currentColor"
    },
    "children": [],
    "text": "↑1"
   }
  ]
 },
 "suspicion": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M50 6L61.75570504584947 33.819660112501055L91.84648671698676 36.403252247502316L69.02113032590307 56.180339887498945L75.86255110086881 85.59674775249769L50 70L24.137448899131186 85.59674775249769L30.97886967409693 56.18033988749895L8.15351328301324 36.40325224750232L38.24429495415053 33.819660112501055Z",
     "fill": "currentColor"
    },
    "children": []
   }
  ]
 },
 "neighbor": {
  "viewBox": "0 0 100 100",
  "children": [
   {
    "tag": "path",
    "attrs": {
     "d": "M68 18.823L59 34.4114572681199L41 34.4114572681199L32 18.823000000000004L40.99999999999999 3.2345427318801097L59 3.234542731880106Z",
     "stroke": "currentColor",
     "stroke-width": "1.1",
     "fill": "currentColor",
     "fill-opacity": "0.2"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M95 34.412L86 50.000457268119895L68 50.000457268119895L59 34.412L68 18.82354273188011L86 18.823542731880103Z",
     "stroke": "currentColor",
     "stroke-width": "1.1",
     "fill": "currentColor",
     "fill-opacity": "0.2"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M95 65.588L86 81.17645726811989L68 81.17645726811989L59 65.588L68 49.999542731880105L86 49.9995427318801Z",
     "stroke": "currentColor",
     "stroke-width": "1.1",
     "fill": "currentColor",
     "fill-opacity": "0.2"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M68 81.177L59 96.7654572681199L41 96.7654572681199L32 81.177L40.99999999999999 65.58854273188011L59 65.58854273188011Z",
     "stroke": "currentColor",
     "stroke-width": "1.1",
     "fill": "currentColor",
     "fill-opacity": "0.2"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M41 65.588L32 81.17645726811989L14.000000000000004 81.17645726811989L5 65.588L13.999999999999993 49.999542731880105L32 49.9995427318801Z",
     "stroke": "currentColor",
     "stroke-width": "1.1",
     "fill": "currentColor",
     "fill-opacity": "0.2"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M41 34.412L32 50.000457268119895L14.000000000000004 50.000457268119895L5 34.412L13.999999999999993 18.82354273188011L32 18.823542731880103Z",
     "stroke": "currentColor",
     "stroke-width": "1.1",
     "fill": "currentColor",
     "fill-opacity": "0.2"
    },
    "children": []
   },
   {
    "tag": "path",
    "attrs": {
     "d": "M68 50L59 65.5884572681199L41 65.5884572681199L32 50L40.99999999999999 34.41154273188011L59 34.411542731880104Z",
     "stroke": "currentColor",
     "stroke-width": "1.1",
     "fill": "currentColor",
     "fill-opacity": "1"
    },
    "children": []
   }
  ]
 }
};
const cube=(color)=>({viewBox:'0 0 60 60',children:[
 {tag:'path',attrs:{d:'M5 15L30 3L55 15L30 28Z M5 15L30 28V56L5 43Z M30 28L55 15V43L30 56Z',fill:color,stroke:'#20282C','stroke-width':'1.2'},children:[]},
 {tag:'path',attrs:{d:'M5 15L30 3L55 15L30 28Z',fill:'#FFFFFF',opacity:'.22'},children:[]},
 {tag:'path',attrs:{d:'M30 28L55 15V43L30 56Z',fill:'#000000',opacity:'.18'},children:[]}
]});
for(const [id,resource] of Object.entries({lumber:'Lumber',masonry:'Masonry',steel:'Steel',beer:'Beer',bread:'Bread',contraband:'Contraband'}))drawings[id]=cube(RESOURCE_COLORS[resource]);
// KP2 receiving is distinct from a physical Contraband stock cube.
drawings['contraband-receive']={viewBox:'0 0 100 100',children:[
 {tag:'path',attrs:{d:'M43 3H57V18H68L50 34L32 18H43Z',fill:'#FFF4DB'},children:[]},
 {tag:'g',attrs:{transform:'translate(19 32) scale(1.05)'},children:cube(RESOURCE_COLORS.Contraband).children}
]};
// RS1 is the review candidate, not a new resource or a new rules symbol.
drawings.material={viewBox:'0 0 100 100',children:[
 ['M6 26L50 4L94 26L50 49Z',RESOURCE_COLORS.Lumber],
 ['M6 26L50 49V96L6 73Z',RESOURCE_COLORS.Masonry],
 ['M50 49L94 26V73L50 96Z',RESOURCE_COLORS.Steel]
].map(([d,fill])=>({tag:'path',attrs:{d,fill,stroke:'#343B40','stroke-width':'2','stroke-linejoin':'round'},children:[]}))};
drawings.bid=drawings.money;
function deepFreeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x}
export const APPROVED_ARTWORK=deepFreeze(drawings);
export function drawApprovedArtwork(doc,def,{ink=TILE_INK,surface='#3C607C',value}={}){
 const ns='http://www.w3.org/2000/svg';
 const el=doc.createElementNS(ns,'g');
 function build(n){
  const e=doc.createElementNS(ns,n.tag);
  for(const [key,raw] of Object.entries(n.attrs)){
   const v=['fill','stroke'].includes(key)?(['#FFF4DB','#253745','currentColor'].includes(raw)?ink:raw==='#3C607C'?surface:raw):raw;
   e.setAttribute(key,v);
   if(['fill','stroke','font-weight','text-anchor'].includes(key)&&n.tag==='text')e.setAttribute('style',(n.attrs.fill?'fill:'+(['#FFF4DB','#253745','currentColor'].includes(n.attrs.fill)?ink:n.attrs.fill==='#3C607C'?surface:n.attrs.fill)+';':'')+'stroke:none;text-anchor:'+(n.attrs['text-anchor']||'middle')+';font-weight:'+(n.attrs['font-weight']||'bold'));
  }
  if(n.text!==undefined)e.textContent=String(value===undefined?n.text:value);
  for(const c of n.children)e.append(build(c));return e;
 }
 for(const n of def.children)el.append(build(n));return el;
}
