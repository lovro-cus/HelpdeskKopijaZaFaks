// Katalog za teste (motoristična oprema z več trgi in jeziki). Testi računajo
// s temi naslovi in variantami; aplikacija ga ne uporablja — njeno seme je
// src/lib/catalog-seed-products.ts.

import type { ImportedProduct } from "../../src/lib/catalog-import";

export const FIXTURE_PRODUCTS: ImportedProduct[] = [
  {
    "shopifyId": null,
    "handle": "testmoto-blendschutz-nachtfahrbrille",
    "title": "Testmoto Anti-Glare Night Driving Glasses",
    "status": "active",
    "price": 49,
    "image": "https://img.example.com/katalog/hf_20260427_081908_09546533-b079-4500-8ae5-28cb85dd45c5.webp?v=1778188406",
    "options": [],
    "variants": [],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-gardevoie-pantalon-moto",
    "title": "Testmoto GardeVoie™ Pantalon Moto",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/ChatGPTImage26.avg.2026_10_03_33.png?v=1787731426",
    "options": [
      {
        "key": "color",
        "label": "Couleur",
        "values": [
          "Noir",
          "Vert",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Taille",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Genre",
        "values": [
          "Homme",
          "Femme"
        ]
      }
    ],
    "variants": [
      {
        "title": "Noir / XXS / EU 40 / W24 / Homme",
        "selection": {
          "color": "Noir",
          "size": "XXS / EU 40 / W24",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / XXS / EU 40 / W24 / Femme",
        "selection": {
          "color": "Noir",
          "size": "XXS / EU 40 / W24",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / XS / EU 42 / W26 / Homme",
        "selection": {
          "color": "Noir",
          "size": "XS / EU 42 / W26",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / XS / EU 42 / W26 / Femme",
        "selection": {
          "color": "Noir",
          "size": "XS / EU 42 / W26",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / S / EU 44 / W28 / Homme",
        "selection": {
          "color": "Noir",
          "size": "S / EU 44 / W28",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / S / EU 44 / W28 / Femme",
        "selection": {
          "color": "Noir",
          "size": "S / EU 44 / W28",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / M / EU 46 / W30 / Homme",
        "selection": {
          "color": "Noir",
          "size": "M / EU 46 / W30",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / M / EU 46 / W30 / Femme",
        "selection": {
          "color": "Noir",
          "size": "M / EU 46 / W30",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / L / EU 48 / W32 / Homme",
        "selection": {
          "color": "Noir",
          "size": "L / EU 48 / W32",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / L / EU 48 / W32 / Femme",
        "selection": {
          "color": "Noir",
          "size": "L / EU 48 / W32",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / XL / EU 50 / W34 / Homme",
        "selection": {
          "color": "Noir",
          "size": "XL / EU 50 / W34",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / XL / EU 50 / W34 / Femme",
        "selection": {
          "color": "Noir",
          "size": "XL / EU 50 / W34",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / 2XL / EU 52 / W36 / Homme",
        "selection": {
          "color": "Noir",
          "size": "2XL / EU 52 / W36",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / 2XL / EU 52 / W36 / Femme",
        "selection": {
          "color": "Noir",
          "size": "2XL / EU 52 / W36",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / 3XL / EU 54 / W38 / Homme",
        "selection": {
          "color": "Noir",
          "size": "3XL / EU 54 / W38",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / 3XL / EU 54 / W38 / Femme",
        "selection": {
          "color": "Noir",
          "size": "3XL / EU 54 / W38",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / 4XL / EU 56 / W40 / Homme",
        "selection": {
          "color": "Noir",
          "size": "4XL / EU 56 / W40",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Noir / 4XL / EU 56 / W40 / Femme",
        "selection": {
          "color": "Noir",
          "size": "4XL / EU 56 / W40",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Vert / XXS / EU 40 / W24 / Homme",
        "selection": {
          "color": "Vert",
          "size": "XXS / EU 40 / W24",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / XXS / EU 40 / W24 / Femme",
        "selection": {
          "color": "Vert",
          "size": "XXS / EU 40 / W24",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / XS / EU 42 / W26 / Homme",
        "selection": {
          "color": "Vert",
          "size": "XS / EU 42 / W26",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / XS / EU 42 / W26 / Femme",
        "selection": {
          "color": "Vert",
          "size": "XS / EU 42 / W26",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / S / EU 44 / W28 / Homme",
        "selection": {
          "color": "Vert",
          "size": "S / EU 44 / W28",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / S / EU 44 / W28 / Femme",
        "selection": {
          "color": "Vert",
          "size": "S / EU 44 / W28",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / M / EU 46 / W30 / Homme",
        "selection": {
          "color": "Vert",
          "size": "M / EU 46 / W30",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / M / EU 46 / W30 / Femme",
        "selection": {
          "color": "Vert",
          "size": "M / EU 46 / W30",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / L / EU 48 / W32 / Homme",
        "selection": {
          "color": "Vert",
          "size": "L / EU 48 / W32",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / L / EU 48 / W32 / Femme",
        "selection": {
          "color": "Vert",
          "size": "L / EU 48 / W32",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / XL / EU 50 / W34 / Homme",
        "selection": {
          "color": "Vert",
          "size": "XL / EU 50 / W34",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / XL / EU 50 / W34 / Femme",
        "selection": {
          "color": "Vert",
          "size": "XL / EU 50 / W34",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / 2XL / EU 52 / W36 / Homme",
        "selection": {
          "color": "Vert",
          "size": "2XL / EU 52 / W36",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / 2XL / EU 52 / W36 / Femme",
        "selection": {
          "color": "Vert",
          "size": "2XL / EU 52 / W36",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / 3XL / EU 54 / W38 / Homme",
        "selection": {
          "color": "Vert",
          "size": "3XL / EU 54 / W38",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / 3XL / EU 54 / W38 / Femme",
        "selection": {
          "color": "Vert",
          "size": "3XL / EU 54 / W38",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / 4XL / EU 56 / W40 / Homme",
        "selection": {
          "color": "Vert",
          "size": "4XL / EU 56 / W40",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Vert / 4XL / EU 56 / W40 / Femme",
        "selection": {
          "color": "Vert",
          "size": "4XL / EU 56 / W40",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Homme",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Homme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Femme",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Femme"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "fr"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-scudostrada-pantaloni-da-moto-it",
    "title": "Testmoto ScudoStrada™ Pantaloni da Moto",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/itv1.png?v=1780609691",
    "options": [
      {
        "key": "color",
        "label": "Colore",
        "values": [
          "Nero",
          "Verde",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Größe",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Genere",
        "values": [
          "Uomo",
          "Donna"
        ]
      }
    ],
    "variants": [
      {
        "title": "Nero / XXS / EU 40 / W24 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "XXS / EU 40 / W24",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XXS / EU 40 / W24 / Donna",
        "selection": {
          "color": "Nero",
          "size": "XXS / EU 40 / W24",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XS / EU 42 / W26 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "XS / EU 42 / W26",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XS / EU 42 / W26 / Donna",
        "selection": {
          "color": "Nero",
          "size": "XS / EU 42 / W26",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / S / EU 44 / W28 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "S / EU 44 / W28",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / S / EU 44 / W28 / Donna",
        "selection": {
          "color": "Nero",
          "size": "S / EU 44 / W28",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / M / EU 46 / W30 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "M / EU 46 / W30",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / M / EU 46 / W30 / Donna",
        "selection": {
          "color": "Nero",
          "size": "M / EU 46 / W30",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / L / EU 48 / W32 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "L / EU 48 / W32",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / L / EU 48 / W32 / Donna",
        "selection": {
          "color": "Nero",
          "size": "L / EU 48 / W32",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XL / EU 50 / W34 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "XL / EU 50 / W34",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XL / EU 50 / W34 / Donna",
        "selection": {
          "color": "Nero",
          "size": "XL / EU 50 / W34",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 2XL / EU 52 / W36 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "2XL / EU 52 / W36",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 2XL / EU 52 / W36 / Donna",
        "selection": {
          "color": "Nero",
          "size": "2XL / EU 52 / W36",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 3XL / EU 54 / W38 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "3XL / EU 54 / W38",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 3XL / EU 54 / W38 / Donna",
        "selection": {
          "color": "Nero",
          "size": "3XL / EU 54 / W38",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 4XL / EU 56 / W40 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "4XL / EU 56 / W40",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 4XL / EU 56 / W40 / Donna",
        "selection": {
          "color": "Nero",
          "size": "4XL / EU 56 / W40",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Verde / XXS / EU 40 / W24 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "XXS / EU 40 / W24",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XXS / EU 40 / W24 / Donna",
        "selection": {
          "color": "Verde",
          "size": "XXS / EU 40 / W24",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XS / EU 42 / W26 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "XS / EU 42 / W26",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XS / EU 42 / W26 / Donna",
        "selection": {
          "color": "Verde",
          "size": "XS / EU 42 / W26",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / S / EU 44 / W28 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "S / EU 44 / W28",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / S / EU 44 / W28 / Donna",
        "selection": {
          "color": "Verde",
          "size": "S / EU 44 / W28",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / M / EU 46 / W30 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "M / EU 46 / W30",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / M / EU 46 / W30 / Donna",
        "selection": {
          "color": "Verde",
          "size": "M / EU 46 / W30",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / L / EU 48 / W32 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "L / EU 48 / W32",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / L / EU 48 / W32 / Donna",
        "selection": {
          "color": "Verde",
          "size": "L / EU 48 / W32",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XL / EU 50 / W34 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "XL / EU 50 / W34",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XL / EU 50 / W34 / Donna",
        "selection": {
          "color": "Verde",
          "size": "XL / EU 50 / W34",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 2XL / EU 52 / W36 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "2XL / EU 52 / W36",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 2XL / EU 52 / W36 / Donna",
        "selection": {
          "color": "Verde",
          "size": "2XL / EU 52 / W36",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 3XL / EU 54 / W38 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "3XL / EU 54 / W38",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 3XL / EU 54 / W38 / Donna",
        "selection": {
          "color": "Verde",
          "size": "3XL / EU 54 / W38",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 4XL / EU 56 / W40 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "4XL / EU 56 / W40",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 4XL / EU 56 / W40 / Donna",
        "selection": {
          "color": "Verde",
          "size": "4XL / EU 56 / W40",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "it"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-scudostrada-pantaloni-da-moto-donna",
    "title": "Testmoto ScudoStrada™ Pantaloni da Moto Donna",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/itpants.png?v=1788522423",
    "options": [
      {
        "key": "color",
        "label": "Colore",
        "values": [
          "Nero",
          "Verde",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Größe",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Genere",
        "values": [
          "Uomo",
          "Donna"
        ]
      }
    ],
    "variants": [
      {
        "title": "Nero / XXS / EU 40 / W24 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "XXS / EU 40 / W24",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XXS / EU 40 / W24 / Donna",
        "selection": {
          "color": "Nero",
          "size": "XXS / EU 40 / W24",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XS / EU 42 / W26 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "XS / EU 42 / W26",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XS / EU 42 / W26 / Donna",
        "selection": {
          "color": "Nero",
          "size": "XS / EU 42 / W26",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / S / EU 44 / W28 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "S / EU 44 / W28",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / S / EU 44 / W28 / Donna",
        "selection": {
          "color": "Nero",
          "size": "S / EU 44 / W28",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / M / EU 46 / W30 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "M / EU 46 / W30",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / M / EU 46 / W30 / Donna",
        "selection": {
          "color": "Nero",
          "size": "M / EU 46 / W30",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / L / EU 48 / W32 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "L / EU 48 / W32",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / L / EU 48 / W32 / Donna",
        "selection": {
          "color": "Nero",
          "size": "L / EU 48 / W32",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XL / EU 50 / W34 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "XL / EU 50 / W34",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / XL / EU 50 / W34 / Donna",
        "selection": {
          "color": "Nero",
          "size": "XL / EU 50 / W34",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 2XL / EU 52 / W36 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "2XL / EU 52 / W36",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 2XL / EU 52 / W36 / Donna",
        "selection": {
          "color": "Nero",
          "size": "2XL / EU 52 / W36",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 3XL / EU 54 / W38 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "3XL / EU 54 / W38",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 3XL / EU 54 / W38 / Donna",
        "selection": {
          "color": "Nero",
          "size": "3XL / EU 54 / W38",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 4XL / EU 56 / W40 / Uomo",
        "selection": {
          "color": "Nero",
          "size": "4XL / EU 56 / W40",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Nero / 4XL / EU 56 / W40 / Donna",
        "selection": {
          "color": "Nero",
          "size": "4XL / EU 56 / W40",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Verde / XXS / EU 40 / W24 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "XXS / EU 40 / W24",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XXS / EU 40 / W24 / Donna",
        "selection": {
          "color": "Verde",
          "size": "XXS / EU 40 / W24",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XS / EU 42 / W26 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "XS / EU 42 / W26",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XS / EU 42 / W26 / Donna",
        "selection": {
          "color": "Verde",
          "size": "XS / EU 42 / W26",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / S / EU 44 / W28 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "S / EU 44 / W28",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / S / EU 44 / W28 / Donna",
        "selection": {
          "color": "Verde",
          "size": "S / EU 44 / W28",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / M / EU 46 / W30 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "M / EU 46 / W30",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / M / EU 46 / W30 / Donna",
        "selection": {
          "color": "Verde",
          "size": "M / EU 46 / W30",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / L / EU 48 / W32 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "L / EU 48 / W32",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / L / EU 48 / W32 / Donna",
        "selection": {
          "color": "Verde",
          "size": "L / EU 48 / W32",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XL / EU 50 / W34 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "XL / EU 50 / W34",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XL / EU 50 / W34 / Donna",
        "selection": {
          "color": "Verde",
          "size": "XL / EU 50 / W34",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 2XL / EU 52 / W36 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "2XL / EU 52 / W36",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 2XL / EU 52 / W36 / Donna",
        "selection": {
          "color": "Verde",
          "size": "2XL / EU 52 / W36",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 3XL / EU 54 / W38 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "3XL / EU 54 / W38",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 3XL / EU 54 / W38 / Donna",
        "selection": {
          "color": "Verde",
          "size": "3XL / EU 54 / W38",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 4XL / EU 56 / W40 / Uomo",
        "selection": {
          "color": "Verde",
          "size": "4XL / EU 56 / W40",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 4XL / EU 56 / W40 / Donna",
        "selection": {
          "color": "Verde",
          "size": "4XL / EU 56 / W40",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Uomo",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Uomo"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Donna",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Donna"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "it"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-escudovial™-pantalones-de-moto",
    "title": "Testmoto EscudoVial™ Pantalones de Moto",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/ChatGPTImage22.avg.2026_13_24_44.png?v=1787397899",
    "options": [
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Negro",
          "Verde",
          "Camuflaje"
        ]
      },
      {
        "key": "size",
        "label": "Talla",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Género",
        "values": [
          "Hombre",
          "Mujer"
        ]
      }
    ],
    "variants": [
      {
        "title": "Negro / XXS / EU 40 / W24 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "XXS / EU 40 / W24",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / XXS / EU 40 / W24 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "XXS / EU 40 / W24",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / XS / EU 42 / W26 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "XS / EU 42 / W26",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / XS / EU 42 / W26 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "XS / EU 42 / W26",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / S / EU 44 / W28 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "S / EU 44 / W28",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / S / EU 44 / W28 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "S / EU 44 / W28",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / M / EU 46 / W30 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "M / EU 46 / W30",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / M / EU 46 / W30 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "M / EU 46 / W30",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / L / EU 48 / W32 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "L / EU 48 / W32",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / L / EU 48 / W32 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "L / EU 48 / W32",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / XL / EU 50 / W34 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "XL / EU 50 / W34",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / XL / EU 50 / W34 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "XL / EU 50 / W34",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / 2XL / EU 52 / W36 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "2XL / EU 52 / W36",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / 2XL / EU 52 / W36 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "2XL / EU 52 / W36",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / 3XL / EU 54 / W38 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "3XL / EU 54 / W38",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / 3XL / EU 54 / W38 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "3XL / EU 54 / W38",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / 4XL / EU 56 / W40 / Hombre",
        "selection": {
          "color": "Negro",
          "size": "4XL / EU 56 / W40",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Negro / 4XL / EU 56 / W40 / Mujer",
        "selection": {
          "color": "Negro",
          "size": "4XL / EU 56 / W40",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Verde / XXS / EU 40 / W24 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "XXS / EU 40 / W24",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XXS / EU 40 / W24 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "XXS / EU 40 / W24",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XS / EU 42 / W26 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "XS / EU 42 / W26",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XS / EU 42 / W26 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "XS / EU 42 / W26",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / S / EU 44 / W28 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "S / EU 44 / W28",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / S / EU 44 / W28 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "S / EU 44 / W28",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / M / EU 46 / W30 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "M / EU 46 / W30",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / M / EU 46 / W30 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "M / EU 46 / W30",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / L / EU 48 / W32 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "L / EU 48 / W32",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / L / EU 48 / W32 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "L / EU 48 / W32",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XL / EU 50 / W34 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "XL / EU 50 / W34",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / XL / EU 50 / W34 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "XL / EU 50 / W34",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 2XL / EU 52 / W36 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "2XL / EU 52 / W36",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 2XL / EU 52 / W36 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "2XL / EU 52 / W36",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 3XL / EU 54 / W38 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "3XL / EU 54 / W38",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 3XL / EU 54 / W38 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "3XL / EU 54 / W38",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 4XL / EU 56 / W40 / Hombre",
        "selection": {
          "color": "Verde",
          "size": "4XL / EU 56 / W40",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Verde / 4XL / EU 56 / W40 / Mujer",
        "selection": {
          "color": "Verde",
          "size": "4XL / EU 56 / W40",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camuflaje / XXS / EU 40 / W24 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "XXS / EU 40 / W24",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / XXS / EU 40 / W24 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "XXS / EU 40 / W24",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / XS / EU 42 / W26 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "XS / EU 42 / W26",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / XS / EU 42 / W26 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "XS / EU 42 / W26",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / S / EU 44 / W28 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "S / EU 44 / W28",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / S / EU 44 / W28 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "S / EU 44 / W28",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / M / EU 46 / W30 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "M / EU 46 / W30",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / M / EU 46 / W30 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "M / EU 46 / W30",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / L / EU 48 / W32 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "L / EU 48 / W32",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / L / EU 48 / W32 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "L / EU 48 / W32",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / XL / EU 50 / W34 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "XL / EU 50 / W34",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / XL / EU 50 / W34 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "XL / EU 50 / W34",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / 2XL / EU 52 / W36 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "2XL / EU 52 / W36",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / 2XL / EU 52 / W36 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "2XL / EU 52 / W36",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / 3XL / EU 54 / W38 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "3XL / EU 54 / W38",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / 3XL / EU 54 / W38 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "3XL / EU 54 / W38",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / 4XL / EU 56 / W40 / Hombre",
        "selection": {
          "color": "Camuflaje",
          "size": "4XL / EU 56 / W40",
          "gender": "Hombre"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camuflaje / 4XL / EU 56 / W40 / Mujer",
        "selection": {
          "color": "Camuflaje",
          "size": "4XL / EU 56 / W40",
          "gender": "Mujer"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "es"
  },
  {
    "shopifyId": null,
    "handle": "hidden-camera-detector-complete-protection-kit",
    "title": "Testmoto ImpactWeave™ Motorcycle Jeans",
    "status": "draft",
    "price": 189,
    "image": "https://img.example.com/katalog/sfv2.png?v=1786790392",
    "options": [
      {
        "key": "size",
        "label": "Size",
        "values": [
          "S",
          "M",
          "L",
          "XL",
          "2XL",
          "3XL"
        ]
      }
    ],
    "variants": [
      {
        "title": "S",
        "selection": {
          "size": "S"
        },
        "image": null,
        "price": 189
      },
      {
        "title": "M",
        "selection": {
          "size": "M"
        },
        "image": null,
        "price": 189
      },
      {
        "title": "L",
        "selection": {
          "size": "L"
        },
        "image": null,
        "price": 189
      },
      {
        "title": "XL",
        "selection": {
          "size": "XL"
        },
        "image": null,
        "price": 189
      },
      {
        "title": "2XL",
        "selection": {
          "size": "2XL"
        },
        "image": null,
        "price": 189
      },
      {
        "title": "3XL",
        "selection": {
          "size": "3XL"
        },
        "image": null,
        "price": 189
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "motorrad-sitzkissen-fur-lange-fahrten",
    "title": "Testmoto Motorrad-Sitzkissen für lange Fahrten",
    "status": "active",
    "price": 59.9,
    "image": "https://img.example.com/katalog/ChatGPTImage4.avg.2026_10_15_17.png?v=1788261095",
    "options": [],
    "variants": [],
    "language": "de"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-ritschild™-motorbroek",
    "title": "Testmoto RitSchild™ Motorbroek",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/ChatGPTImage2.sep.2026_11_28_52.png?v=1788341345",
    "options": [
      {
        "key": "color",
        "label": "Kleur",
        "values": [
          "Zwart",
          "Groen",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Maat",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Geslacht",
        "values": [
          "Heren",
          "Dames"
        ]
      }
    ],
    "variants": [
      {
        "title": "Zwart / XXS / EU 40 / W24 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "XXS / EU 40 / W24",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / XXS / EU 40 / W24 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "XXS / EU 40 / W24",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / XS / EU 42 / W26 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "XS / EU 42 / W26",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / XS / EU 42 / W26 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "XS / EU 42 / W26",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / S / EU 44 / W28 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "S / EU 44 / W28",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / S / EU 44 / W28 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "S / EU 44 / W28",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / M / EU 46 / W30 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "M / EU 46 / W30",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / M / EU 46 / W30 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "M / EU 46 / W30",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / L / EU 48 / W32 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "L / EU 48 / W32",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / L / EU 48 / W32 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "L / EU 48 / W32",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / XL / EU 50 / W34 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "XL / EU 50 / W34",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / XL / EU 50 / W34 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "XL / EU 50 / W34",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / 2XL / EU 52 / W36 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "2XL / EU 52 / W36",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / 2XL / EU 52 / W36 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "2XL / EU 52 / W36",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / 3XL / EU 54 / W38 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "3XL / EU 54 / W38",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / 3XL / EU 54 / W38 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "3XL / EU 54 / W38",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / 4XL / EU 56 / W40 / Heren",
        "selection": {
          "color": "Zwart",
          "size": "4XL / EU 56 / W40",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Zwart / 4XL / EU 56 / W40 / Dames",
        "selection": {
          "color": "Zwart",
          "size": "4XL / EU 56 / W40",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Groen / XXS / EU 40 / W24 / Heren",
        "selection": {
          "color": "Groen",
          "size": "XXS / EU 40 / W24",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / XXS / EU 40 / W24 / Dames",
        "selection": {
          "color": "Groen",
          "size": "XXS / EU 40 / W24",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / XS / EU 42 / W26 / Heren",
        "selection": {
          "color": "Groen",
          "size": "XS / EU 42 / W26",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / XS / EU 42 / W26 / Dames",
        "selection": {
          "color": "Groen",
          "size": "XS / EU 42 / W26",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / S / EU 44 / W28 / Heren",
        "selection": {
          "color": "Groen",
          "size": "S / EU 44 / W28",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / S / EU 44 / W28 / Dames",
        "selection": {
          "color": "Groen",
          "size": "S / EU 44 / W28",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / M / EU 46 / W30 / Heren",
        "selection": {
          "color": "Groen",
          "size": "M / EU 46 / W30",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / M / EU 46 / W30 / Dames",
        "selection": {
          "color": "Groen",
          "size": "M / EU 46 / W30",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / L / EU 48 / W32 / Heren",
        "selection": {
          "color": "Groen",
          "size": "L / EU 48 / W32",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / L / EU 48 / W32 / Dames",
        "selection": {
          "color": "Groen",
          "size": "L / EU 48 / W32",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / XL / EU 50 / W34 / Heren",
        "selection": {
          "color": "Groen",
          "size": "XL / EU 50 / W34",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / XL / EU 50 / W34 / Dames",
        "selection": {
          "color": "Groen",
          "size": "XL / EU 50 / W34",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / 2XL / EU 52 / W36 / Heren",
        "selection": {
          "color": "Groen",
          "size": "2XL / EU 52 / W36",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / 2XL / EU 52 / W36 / Dames",
        "selection": {
          "color": "Groen",
          "size": "2XL / EU 52 / W36",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / 3XL / EU 54 / W38 / Heren",
        "selection": {
          "color": "Groen",
          "size": "3XL / EU 54 / W38",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / 3XL / EU 54 / W38 / Dames",
        "selection": {
          "color": "Groen",
          "size": "3XL / EU 54 / W38",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / 4XL / EU 56 / W40 / Heren",
        "selection": {
          "color": "Groen",
          "size": "4XL / EU 56 / W40",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Groen / 4XL / EU 56 / W40 / Dames",
        "selection": {
          "color": "Groen",
          "size": "4XL / EU 56 / W40",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Heren",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Heren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Dames",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Dames"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "nl"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-trailshield™-motorcycle-pants",
    "title": "Testmoto TrailShield™ Black Motorcycle Pants",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/V2BLK.png?v=1786786032",
    "options": [
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Black",
          "Green",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Size",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Gender",
        "values": [
          "Male",
          "Female"
        ]
      }
    ],
    "variants": [
      {
        "title": "Black / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Black",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Black",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Black",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Black",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Black",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Black",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Black",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Black",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Black",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Black",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Black",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Black",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Black",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Black",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Black",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Black",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Black",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Black",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Green / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Green",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Green",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Green",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Green",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Green",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Green",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Green",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Green",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Green",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Green",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Green",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Green",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Green",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Green",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Green",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Green",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Green",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Green",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-trailshield™-camouflage-motorcycle-pants",
    "title": "Testmoto TrailShield™ Camouflage Motorcycle Pants",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/v1camo.png?v=1786787324",
    "options": [
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Black",
          "Green",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Size",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Gender",
        "values": [
          "Male",
          "Female"
        ]
      }
    ],
    "variants": [
      {
        "title": "Black / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Black",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Black",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Black",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Black",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Black",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Black",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Black",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Black",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Black",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Black",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Black",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Black",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Black",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Black",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Black",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Black",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Black",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Black",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Green / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Green",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Green",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Green",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Green",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Green",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Green",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Green",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Green",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Green",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Green",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Green",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Green",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Green",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Green",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Green",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Green",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Green",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Green",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-schutzwerk™-motorradhose-copy",
    "title": "Testmoto TrailShield™ Camouflage Motorcycle Pants",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/green1.png?v=1780602394",
    "options": [
      {
        "key": "color",
        "label": "Farbe",
        "values": [
          "Camouflage",
          "Schwarz",
          "Grün"
        ]
      },
      {
        "key": "size",
        "label": "Größe",
        "values": [
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Geschlecht",
        "values": [
          "Herren",
          "Damen"
        ]
      }
    ],
    "variants": [
      {
        "title": "Camouflage / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Schwarz / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Grün / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Grün",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Grün",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Grün",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Grün",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Grün",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Grün",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Grün",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Grün",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Grün",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Grün",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Grün",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Grün",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      }
    ],
    "language": "de"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-trailshield™-green-motorcycle-pants",
    "title": "Testmoto TrailShield™ Green Motorcycle Pants",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/v1GREEN.png?v=1786787107",
    "options": [
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Black",
          "Green",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Size",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Gender",
        "values": [
          "Male",
          "Female"
        ]
      }
    ],
    "variants": [
      {
        "title": "Black / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Black",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Black",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Black",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Black",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Black",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Black",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Black",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Black",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Black",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Black",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Black",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Black",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Black",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Black",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Black",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Black",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Black",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Black / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Black",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Green / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Green",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Green",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Green",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Green",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Green",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Green",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Green",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Green",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Green",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Green",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Green",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Green",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Green",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Green",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Green",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Green",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Green",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Green / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Green",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Male",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Male"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Female",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Female"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-schutzwerk™-grun-motorradhose",
    "title": "Testmoto TrailShield™ Green Motorcycle Pants",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/camo1.png?v=1780602267",
    "options": [
      {
        "key": "color",
        "label": "Farbe",
        "values": [
          "Grün",
          "Schwarz",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Größe",
        "values": [
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Geschlecht",
        "values": [
          "Herren",
          "Damen"
        ]
      }
    ],
    "variants": [
      {
        "title": "Grün / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Grün",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Grün",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Grün",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Grün",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Grün",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Grün",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Grün",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Grün",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Grün",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Grün",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Grün",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Grün",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Schwarz / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "de"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-schutzwerk-motorradhose",
    "title": "Testmoto TrailShield™ Motorcycle Pants",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/p1v1.png?v=1780510300",
    "options": [
      {
        "key": "color",
        "label": "Farbe",
        "values": [
          "Schwarz",
          "Grün",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Größe",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Geschlecht",
        "values": [
          "Herren",
          "Damen"
        ]
      }
    ],
    "variants": [
      {
        "title": "Schwarz / XXS / EU 40 / W24 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XXS / EU 40 / W24",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XXS / EU 40 / W24 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XXS / EU 40 / W24",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Grün / XXS / EU 40 / W24 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XXS / EU 40 / W24",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XXS / EU 40 / W24 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XXS / EU 40 / W24",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Grün",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Grün",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Grün",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Grün",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Grün",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Grün",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Grün",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Grün",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Grün",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Grün",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Grün",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Grün",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "de"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-schutzwerk-motorradhose-damen",
    "title": "Testmoto SchutzWerk™ Motorradhose",
    "status": "active",
    "price": 129,
    "image": "https://img.example.com/katalog/womensDACH.png?v=1788203254",
    "options": [
      {
        "key": "color",
        "label": "Farbe",
        "values": [
          "Schwarz",
          "Grün",
          "Camouflage"
        ]
      },
      {
        "key": "size",
        "label": "Größe",
        "values": [
          "XXS / EU 40 / W24",
          "XS / EU 42 / W26",
          "S / EU 44 / W28",
          "M / EU 46 / W30",
          "L / EU 48 / W32",
          "XL / EU 50 / W34",
          "2XL / EU 52 / W36",
          "3XL / EU 54 / W38",
          "4XL / EU 56 / W40"
        ]
      },
      {
        "key": "gender",
        "label": "Geschlecht",
        "values": [
          "Damen",
          "Herren"
        ]
      }
    ],
    "variants": [
      {
        "title": "Schwarz / XXS / EU 40 / W24 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XXS / EU 40 / W24",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XXS / EU 40 / W24 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XXS / EU 40 / W24",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Schwarz",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Schwarz / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Schwarz",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/14.png?v=1778172249",
        "price": 129
      },
      {
        "title": "Grün / XXS / EU 40 / W24 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XXS / EU 40 / W24",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XXS / EU 40 / W24 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XXS / EU 40 / W24",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Grün",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Grün",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Grün",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Grün",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Grün",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Grün",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Grün",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Grün",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Grün",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Grün",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Grün",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Grün",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Grün",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Grün / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Grün",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/8_f186d70e-44fa-40a3-9510-659a05afb6ea.png?v=1778172309",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XXS / EU 40 / W24 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XXS / EU 40 / W24",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XS / EU 42 / W26 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XS / EU 42 / W26",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / S / EU 44 / W28 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "S / EU 44 / W28",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / M / EU 46 / W30 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "M / EU 46 / W30",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / L / EU 48 / W32 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "L / EU 48 / W32",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / XL / EU 50 / W34 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "XL / EU 50 / W34",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 2XL / EU 52 / W36 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "2XL / EU 52 / W36",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 3XL / EU 54 / W38 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "3XL / EU 54 / W38",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Damen",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Damen"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      },
      {
        "title": "Camouflage / 4XL / EU 56 / W40 / Herren",
        "selection": {
          "color": "Camouflage",
          "size": "4XL / EU 56 / W40",
          "gender": "Herren"
        },
        "image": "https://img.example.com/katalog/3_8d6dc79b-f2f2-4786-8451-ff2364830fd6.png?v=1778172248",
        "price": 129
      }
    ],
    "language": "de"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-flexarmor™-black-motorcycle-jeans",
    "title": "Testmoto FlexArmor™ Black Motorcycle Jeans",
    "status": "active",
    "price": 139,
    "image": "https://img.example.com/katalog/sfvw2.png?v=1789132615",
    "options": [
      {
        "key": "size",
        "label": "Size",
        "values": [
          "XS",
          "S",
          "M",
          "L",
          "XL",
          "2XL",
          "3XL",
          "4XL"
        ]
      },
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Blue",
          "Black",
          "Khaki"
        ]
      }
    ],
    "variants": [
      {
        "title": "XS / Blue",
        "selection": {
          "size": "XS",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XS / Black",
        "selection": {
          "size": "XS",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XS / Khaki",
        "selection": {
          "size": "XS",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/imgi_125_71WkggkIy_S._AC_SL1500_9015b30a-ba5c-4c8b-a960-bd774ad2c2a4.jpg?v=1786794245",
        "price": 139
      },
      {
        "title": "S / Blue",
        "selection": {
          "size": "S",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "S / Black",
        "selection": {
          "size": "S",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "S / Khaki",
        "selection": {
          "size": "S",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/imgi_125_71WkggkIy_S._AC_SL1500_9015b30a-ba5c-4c8b-a960-bd774ad2c2a4.jpg?v=1786794245",
        "price": 139
      },
      {
        "title": "M / Blue",
        "selection": {
          "size": "M",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "M / Black",
        "selection": {
          "size": "M",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "M / Khaki",
        "selection": {
          "size": "M",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/imgi_125_71WkggkIy_S._AC_SL1500_9015b30a-ba5c-4c8b-a960-bd774ad2c2a4.jpg?v=1786794245",
        "price": 139
      },
      {
        "title": "L / Blue",
        "selection": {
          "size": "L",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "L / Black",
        "selection": {
          "size": "L",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "L / Khaki",
        "selection": {
          "size": "L",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/imgi_125_71WkggkIy_S._AC_SL1500_9015b30a-ba5c-4c8b-a960-bd774ad2c2a4.jpg?v=1786794245",
        "price": 139
      },
      {
        "title": "XL / Blue",
        "selection": {
          "size": "XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XL / Black",
        "selection": {
          "size": "XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XL / Khaki",
        "selection": {
          "size": "XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/imgi_125_71WkggkIy_S._AC_SL1500_9015b30a-ba5c-4c8b-a960-bd774ad2c2a4.jpg?v=1786794245",
        "price": 139
      },
      {
        "title": "2XL / Blue",
        "selection": {
          "size": "2XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "2XL / Black",
        "selection": {
          "size": "2XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "2XL / Khaki",
        "selection": {
          "size": "2XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/imgi_125_71WkggkIy_S._AC_SL1500_9015b30a-ba5c-4c8b-a960-bd774ad2c2a4.jpg?v=1786794245",
        "price": 139
      },
      {
        "title": "3XL / Blue",
        "selection": {
          "size": "3XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "3XL / Black",
        "selection": {
          "size": "3XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "3XL / Khaki",
        "selection": {
          "size": "3XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/imgi_125_71WkggkIy_S._AC_SL1500_9015b30a-ba5c-4c8b-a960-bd774ad2c2a4.jpg?v=1786794245",
        "price": 139
      },
      {
        "title": "4XL / Blue",
        "selection": {
          "size": "4XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "4XL / Black",
        "selection": {
          "size": "4XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "4XL / Khaki",
        "selection": {
          "size": "4XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/imgi_125_71WkggkIy_S._AC_SL1500_9015b30a-ba5c-4c8b-a960-bd774ad2c2a4.jpg?v=1786794245",
        "price": 139
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-flexarmor™-blue-motorcycle-jeans",
    "title": "Testmoto FlexArmor™ Blue Motorcycle Jeans",
    "status": "active",
    "price": 139,
    "image": "https://img.example.com/katalog/SHIELDFLEXV1.png?v=1789123103",
    "options": [
      {
        "key": "size",
        "label": "Size",
        "values": [
          "XS",
          "S",
          "M",
          "L",
          "XL",
          "2XL",
          "3XL",
          "4XL"
        ]
      },
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Blue",
          "Black",
          "Khaki"
        ]
      }
    ],
    "variants": [
      {
        "title": "XS / Blue",
        "selection": {
          "size": "XS",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XS / Black",
        "selection": {
          "size": "XS",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XS / Khaki",
        "selection": {
          "size": "XS",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "S / Blue",
        "selection": {
          "size": "S",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "S / Black",
        "selection": {
          "size": "S",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "S / Khaki",
        "selection": {
          "size": "S",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "M / Blue",
        "selection": {
          "size": "M",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "M / Black",
        "selection": {
          "size": "M",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "M / Khaki",
        "selection": {
          "size": "M",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "L / Blue",
        "selection": {
          "size": "L",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "L / Black",
        "selection": {
          "size": "L",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "L / Khaki",
        "selection": {
          "size": "L",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XL / Blue",
        "selection": {
          "size": "XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XL / Black",
        "selection": {
          "size": "XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XL / Khaki",
        "selection": {
          "size": "XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "2XL / Blue",
        "selection": {
          "size": "2XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "2XL / Black",
        "selection": {
          "size": "2XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "2XL / Khaki",
        "selection": {
          "size": "2XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "3XL / Blue",
        "selection": {
          "size": "3XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "3XL / Black",
        "selection": {
          "size": "3XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "3XL / Khaki",
        "selection": {
          "size": "3XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "4XL / Blue",
        "selection": {
          "size": "4XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "4XL / Black",
        "selection": {
          "size": "4XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "4XL / Khaki",
        "selection": {
          "size": "4XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-flexarmor™-khaki-motorcycle-jeans",
    "title": "Testmoto FlexArmor™ Khaki Motorcycle Jeans",
    "status": "active",
    "price": 139,
    "image": "https://img.example.com/katalog/sfv3.png?v=1789132649",
    "options": [
      {
        "key": "size",
        "label": "Size",
        "values": [
          "XS",
          "S",
          "M",
          "L",
          "XL",
          "2XL",
          "3XL",
          "4XL"
        ]
      },
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Blue",
          "Black",
          "Khaki"
        ]
      }
    ],
    "variants": [
      {
        "title": "XS / Blue",
        "selection": {
          "size": "XS",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XS / Black",
        "selection": {
          "size": "XS",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XS / Khaki",
        "selection": {
          "size": "XS",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "S / Blue",
        "selection": {
          "size": "S",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "S / Black",
        "selection": {
          "size": "S",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "S / Khaki",
        "selection": {
          "size": "S",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "M / Blue",
        "selection": {
          "size": "M",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "M / Black",
        "selection": {
          "size": "M",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "M / Khaki",
        "selection": {
          "size": "M",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "L / Blue",
        "selection": {
          "size": "L",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "L / Black",
        "selection": {
          "size": "L",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "L / Khaki",
        "selection": {
          "size": "L",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XL / Blue",
        "selection": {
          "size": "XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XL / Black",
        "selection": {
          "size": "XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "XL / Khaki",
        "selection": {
          "size": "XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "2XL / Blue",
        "selection": {
          "size": "2XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "2XL / Black",
        "selection": {
          "size": "2XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "2XL / Khaki",
        "selection": {
          "size": "2XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "3XL / Blue",
        "selection": {
          "size": "3XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "3XL / Black",
        "selection": {
          "size": "3XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "3XL / Khaki",
        "selection": {
          "size": "3XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      },
      {
        "title": "4XL / Blue",
        "selection": {
          "size": "4XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/2_a8b45d37-2b23-4503-b36f-8d15097a00a9.png?v=1786792992",
        "price": 139
      },
      {
        "title": "4XL / Black",
        "selection": {
          "size": "4XL",
          "color": "Black"
        },
        "image": "https://img.example.com/katalog/1.png?v=1786792992",
        "price": 139
      },
      {
        "title": "4XL / Khaki",
        "selection": {
          "size": "4XL",
          "color": "Khaki"
        },
        "image": "https://img.example.com/katalog/3_110ff42b-e232-4914-aab0-d439c2ac57b6.png?v=1786792992",
        "price": 139
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto-gloves",
    "title": "Testmoto™ GripLite Black/Red Gloves",
    "status": "active",
    "price": 79.9,
    "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
    "options": [
      {
        "key": "size",
        "label": "Size",
        "values": [
          "M",
          "L",
          "XL",
          "XXL"
        ]
      },
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Black/Red",
          "Red",
          "Orange",
          "Green",
          "Blue",
          "Pink"
        ]
      }
    ],
    "variants": [
      {
        "title": "M / Black/Red",
        "selection": {
          "size": "M",
          "color": "Black/Red"
        },
        "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "M / Red",
        "selection": {
          "size": "M",
          "color": "Red"
        },
        "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
        "price": 79.9
      },
      {
        "title": "M / Orange",
        "selection": {
          "size": "M",
          "color": "Orange"
        },
        "image": "https://img.example.com/katalog/glovesORANGE.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "M / Green",
        "selection": {
          "size": "M",
          "color": "Green"
        },
        "image": "https://img.example.com/katalog/greengloves.png?v=1779365177",
        "price": 79.9
      },
      {
        "title": "M / Blue",
        "selection": {
          "size": "M",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/glovesblue_9e3d122b-7b51-4aa9-a957-8468f7811897.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "M / Pink",
        "selection": {
          "size": "M",
          "color": "Pink"
        },
        "image": "https://img.example.com/katalog/pinkgloves.png?v=1779365071",
        "price": 79.9
      },
      {
        "title": "L / Black/Red",
        "selection": {
          "size": "L",
          "color": "Black/Red"
        },
        "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "L / Red",
        "selection": {
          "size": "L",
          "color": "Red"
        },
        "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
        "price": 79.9
      },
      {
        "title": "L / Orange",
        "selection": {
          "size": "L",
          "color": "Orange"
        },
        "image": "https://img.example.com/katalog/glovesORANGE.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "L / Green",
        "selection": {
          "size": "L",
          "color": "Green"
        },
        "image": "https://img.example.com/katalog/greengloves.png?v=1779365177",
        "price": 79.9
      },
      {
        "title": "L / Blue",
        "selection": {
          "size": "L",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/glovesblue_9e3d122b-7b51-4aa9-a957-8468f7811897.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "L / Pink",
        "selection": {
          "size": "L",
          "color": "Pink"
        },
        "image": "https://img.example.com/katalog/pinkgloves.png?v=1779365071",
        "price": 79.9
      },
      {
        "title": "XL / Black/Red",
        "selection": {
          "size": "XL",
          "color": "Black/Red"
        },
        "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XL / Red",
        "selection": {
          "size": "XL",
          "color": "Red"
        },
        "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
        "price": 79.9
      },
      {
        "title": "XL / Orange",
        "selection": {
          "size": "XL",
          "color": "Orange"
        },
        "image": "https://img.example.com/katalog/glovesORANGE.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XL / Green",
        "selection": {
          "size": "XL",
          "color": "Green"
        },
        "image": "https://img.example.com/katalog/greengloves.png?v=1779365177",
        "price": 79.9
      },
      {
        "title": "XL / Blue",
        "selection": {
          "size": "XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/glovesblue_9e3d122b-7b51-4aa9-a957-8468f7811897.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XL / Pink",
        "selection": {
          "size": "XL",
          "color": "Pink"
        },
        "image": "https://img.example.com/katalog/pinkgloves.png?v=1779365071",
        "price": 79.9
      },
      {
        "title": "XXL / Black/Red",
        "selection": {
          "size": "XXL",
          "color": "Black/Red"
        },
        "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XXL / Red",
        "selection": {
          "size": "XXL",
          "color": "Red"
        },
        "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
        "price": 79.9
      },
      {
        "title": "XXL / Orange",
        "selection": {
          "size": "XXL",
          "color": "Orange"
        },
        "image": "https://img.example.com/katalog/glovesORANGE.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XXL / Green",
        "selection": {
          "size": "XXL",
          "color": "Green"
        },
        "image": "https://img.example.com/katalog/greengloves.png?v=1779365177",
        "price": 79.9
      },
      {
        "title": "XXL / Blue",
        "selection": {
          "size": "XXL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/glovesblue_9e3d122b-7b51-4aa9-a957-8468f7811897.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XXL / Pink",
        "selection": {
          "size": "XXL",
          "color": "Pink"
        },
        "image": "https://img.example.com/katalog/pinkgloves.png?v=1779365071",
        "price": 79.9
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto™-griplite-red-gloves",
    "title": "Testmoto™ GripLite Red Gloves",
    "status": "active",
    "price": 79.9,
    "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
    "options": [
      {
        "key": "size",
        "label": "Size",
        "values": [
          "M",
          "L",
          "XL",
          "XXL"
        ]
      },
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Black/Red",
          "Red",
          "Orange",
          "Green",
          "Blue",
          "Pink"
        ]
      }
    ],
    "variants": [
      {
        "title": "M / Black/Red",
        "selection": {
          "size": "M",
          "color": "Black/Red"
        },
        "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "M / Red",
        "selection": {
          "size": "M",
          "color": "Red"
        },
        "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
        "price": 79.9
      },
      {
        "title": "M / Orange",
        "selection": {
          "size": "M",
          "color": "Orange"
        },
        "image": "https://img.example.com/katalog/glovesORANGE.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "M / Green",
        "selection": {
          "size": "M",
          "color": "Green"
        },
        "image": "https://img.example.com/katalog/greengloves.png?v=1779365177",
        "price": 79.9
      },
      {
        "title": "M / Blue",
        "selection": {
          "size": "M",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/glovesblue_9e3d122b-7b51-4aa9-a957-8468f7811897.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "M / Pink",
        "selection": {
          "size": "M",
          "color": "Pink"
        },
        "image": "https://img.example.com/katalog/pinkgloves.png?v=1779365071",
        "price": 79.9
      },
      {
        "title": "L / Black/Red",
        "selection": {
          "size": "L",
          "color": "Black/Red"
        },
        "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "L / Red",
        "selection": {
          "size": "L",
          "color": "Red"
        },
        "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
        "price": 79.9
      },
      {
        "title": "L / Orange",
        "selection": {
          "size": "L",
          "color": "Orange"
        },
        "image": "https://img.example.com/katalog/glovesORANGE.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "L / Green",
        "selection": {
          "size": "L",
          "color": "Green"
        },
        "image": "https://img.example.com/katalog/greengloves.png?v=1779365177",
        "price": 79.9
      },
      {
        "title": "L / Blue",
        "selection": {
          "size": "L",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/glovesblue_9e3d122b-7b51-4aa9-a957-8468f7811897.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "L / Pink",
        "selection": {
          "size": "L",
          "color": "Pink"
        },
        "image": "https://img.example.com/katalog/pinkgloves.png?v=1779365071",
        "price": 79.9
      },
      {
        "title": "XL / Black/Red",
        "selection": {
          "size": "XL",
          "color": "Black/Red"
        },
        "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XL / Red",
        "selection": {
          "size": "XL",
          "color": "Red"
        },
        "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
        "price": 79.9
      },
      {
        "title": "XL / Orange",
        "selection": {
          "size": "XL",
          "color": "Orange"
        },
        "image": "https://img.example.com/katalog/glovesORANGE.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XL / Green",
        "selection": {
          "size": "XL",
          "color": "Green"
        },
        "image": "https://img.example.com/katalog/greengloves.png?v=1779365177",
        "price": 79.9
      },
      {
        "title": "XL / Blue",
        "selection": {
          "size": "XL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/glovesblue_9e3d122b-7b51-4aa9-a957-8468f7811897.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XL / Pink",
        "selection": {
          "size": "XL",
          "color": "Pink"
        },
        "image": "https://img.example.com/katalog/pinkgloves.png?v=1779365071",
        "price": 79.9
      },
      {
        "title": "XXL / Black/Red",
        "selection": {
          "size": "XXL",
          "color": "Black/Red"
        },
        "image": "https://img.example.com/katalog/glovesred.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XXL / Red",
        "selection": {
          "size": "XXL",
          "color": "Red"
        },
        "image": "https://img.example.com/katalog/glovesblackred.png?v=1779365271",
        "price": 79.9
      },
      {
        "title": "XXL / Orange",
        "selection": {
          "size": "XXL",
          "color": "Orange"
        },
        "image": "https://img.example.com/katalog/glovesORANGE.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XXL / Green",
        "selection": {
          "size": "XXL",
          "color": "Green"
        },
        "image": "https://img.example.com/katalog/greengloves.png?v=1779365177",
        "price": 79.9
      },
      {
        "title": "XXL / Blue",
        "selection": {
          "size": "XXL",
          "color": "Blue"
        },
        "image": "https://img.example.com/katalog/glovesblue_9e3d122b-7b51-4aa9-a957-8468f7811897.png?v=1779365070",
        "price": 79.9
      },
      {
        "title": "XXL / Pink",
        "selection": {
          "size": "XXL",
          "color": "Pink"
        },
        "image": "https://img.example.com/katalog/pinkgloves.png?v=1779365071",
        "price": 79.9
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto™-airflow-breathable-motorcycle-jacket-black",
    "title": "Testmoto™ AirFlow Breathable Motorcycle Jacket (Black)",
    "status": "active",
    "price": 159,
    "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
    "options": [
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Black",
          "Gray"
        ]
      },
      {
        "key": "size",
        "label": "Size",
        "values": [
          "M",
          "L",
          "XL",
          "2XL",
          "3XL",
          "4XL",
          "5XL"
        ]
      }
    ],
    "variants": [
      {
        "title": "Black / M",
        "selection": {
          "color": "Black",
          "size": "M"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / L",
        "selection": {
          "color": "Black",
          "size": "L"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / XL",
        "selection": {
          "color": "Black",
          "size": "XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / 2XL",
        "selection": {
          "color": "Black",
          "size": "2XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / 3XL",
        "selection": {
          "color": "Black",
          "size": "3XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / 4XL",
        "selection": {
          "color": "Black",
          "size": "4XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / 5XL",
        "selection": {
          "color": "Black",
          "size": "5XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Gray / M",
        "selection": {
          "color": "Gray",
          "size": "M"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / L",
        "selection": {
          "color": "Gray",
          "size": "L"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / XL",
        "selection": {
          "color": "Gray",
          "size": "XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / 2XL",
        "selection": {
          "color": "Gray",
          "size": "2XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / 3XL",
        "selection": {
          "color": "Gray",
          "size": "3XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / 4XL",
        "selection": {
          "color": "Gray",
          "size": "4XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / 5XL",
        "selection": {
          "color": "Gray",
          "size": "5XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto™-airflow-breathable-motorcycle-jacket-gray",
    "title": "Testmoto™ AirFlow Breathable Motorcycle Jacket (Gray)",
    "status": "draft",
    "price": 159,
    "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
    "options": [
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Gray",
          "Black"
        ]
      },
      {
        "key": "size",
        "label": "Size",
        "values": [
          "XS (US 26)",
          "S (US 28)",
          "M (US 30)",
          "L (US 32)",
          "XL (US 34)",
          "2XL (US 36)",
          "3XL (US 38)",
          "4XL (US 40)",
          "5XL (US 42)"
        ]
      }
    ],
    "variants": [
      {
        "title": "Gray / XS (US 26)",
        "selection": {
          "color": "Gray",
          "size": "XS (US 26)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Gray / S (US 28)",
        "selection": {
          "color": "Gray",
          "size": "S (US 28)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Gray / M (US 30)",
        "selection": {
          "color": "Gray",
          "size": "M (US 30)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Gray / L (US 32)",
        "selection": {
          "color": "Gray",
          "size": "L (US 32)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Gray / XL (US 34)",
        "selection": {
          "color": "Gray",
          "size": "XL (US 34)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Gray / 2XL (US 36)",
        "selection": {
          "color": "Gray",
          "size": "2XL (US 36)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Gray / 3XL (US 38)",
        "selection": {
          "color": "Gray",
          "size": "3XL (US 38)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Gray / 4XL (US 40)",
        "selection": {
          "color": "Gray",
          "size": "4XL (US 40)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Gray / 5XL (US 42)",
        "selection": {
          "color": "Gray",
          "size": "5XL (US 42)"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew.png?v=1779017315",
        "price": 159
      },
      {
        "title": "Black / XS (US 26)",
        "selection": {
          "color": "Black",
          "size": "XS (US 26)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      },
      {
        "title": "Black / S (US 28)",
        "selection": {
          "color": "Black",
          "size": "S (US 28)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      },
      {
        "title": "Black / M (US 30)",
        "selection": {
          "color": "Black",
          "size": "M (US 30)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      },
      {
        "title": "Black / L (US 32)",
        "selection": {
          "color": "Black",
          "size": "L (US 32)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      },
      {
        "title": "Black / XL (US 34)",
        "selection": {
          "color": "Black",
          "size": "XL (US 34)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      },
      {
        "title": "Black / 2XL (US 36)",
        "selection": {
          "color": "Black",
          "size": "2XL (US 36)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      },
      {
        "title": "Black / 3XL (US 38)",
        "selection": {
          "color": "Black",
          "size": "3XL (US 38)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      },
      {
        "title": "Black / 4XL (US 40)",
        "selection": {
          "color": "Black",
          "size": "4XL (US 40)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      },
      {
        "title": "Black / 5XL (US 42)",
        "selection": {
          "color": "Black",
          "size": "5XL (US 42)"
        },
        "image": "https://img.example.com/katalog/fkofe_b932c3b4-8728-4906-95a6-28e86862c229.png?v=1779055897",
        "price": 159
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "testmoto™-airflow-breathable-motorcycle-jacket-gray-1",
    "title": "Testmoto™ AirFlow Breathable Motorcycle Jacket (Gray)",
    "status": "active",
    "price": 159,
    "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
    "options": [
      {
        "key": "color",
        "label": "Color",
        "values": [
          "Black",
          "Gray"
        ]
      },
      {
        "key": "size",
        "label": "Size",
        "values": [
          "M",
          "L",
          "XL",
          "2XL",
          "3XL",
          "4XL",
          "5XL"
        ]
      }
    ],
    "variants": [
      {
        "title": "Black / M",
        "selection": {
          "color": "Black",
          "size": "M"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / L",
        "selection": {
          "color": "Black",
          "size": "L"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / XL",
        "selection": {
          "color": "Black",
          "size": "XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / 2XL",
        "selection": {
          "color": "Black",
          "size": "2XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / 3XL",
        "selection": {
          "color": "Black",
          "size": "3XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / 4XL",
        "selection": {
          "color": "Black",
          "size": "4XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Black / 5XL",
        "selection": {
          "color": "Black",
          "size": "5XL"
        },
        "image": "https://img.example.com/katalog/fkofe_2f6f4437-3375-4522-ac30-c8d40fc3a6ef.png?v=1779016920",
        "price": 159
      },
      {
        "title": "Gray / M",
        "selection": {
          "color": "Gray",
          "size": "M"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / L",
        "selection": {
          "color": "Gray",
          "size": "L"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / XL",
        "selection": {
          "color": "Gray",
          "size": "XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / 2XL",
        "selection": {
          "color": "Gray",
          "size": "2XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / 3XL",
        "selection": {
          "color": "Gray",
          "size": "3XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / 4XL",
        "selection": {
          "color": "Gray",
          "size": "4XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      },
      {
        "title": "Gray / 5XL",
        "selection": {
          "color": "Gray",
          "size": "5XL"
        },
        "image": "https://img.example.com/katalog/mfmeoimfew_34d250f7-110a-49a9-9d9a-69cbfe707539.png?v=1779055779",
        "price": 159
      }
    ],
    "language": "en"
  },
  {
    "shopifyId": null,
    "handle": "roadarmor™-belt",
    "title": "Testmoto™ Gürtel",
    "status": "active",
    "price": 25,
    "image": "https://img.example.com/katalog/testmotobelt.png?v=1780500221",
    "options": [],
    "variants": [],
    "language": "de"
  }
];
