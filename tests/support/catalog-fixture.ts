// Skupine testnega kataloga (glej catalog-fixture-products.ts).
import type { SeedGroup } from "../../src/lib/catalog-seed";

export const FIXTURE_GROUPS: SeedGroup[] = [
  {
    key: "trailshield-pants",
    label: "TrailShield hlače",
    // Moški in ženski kroj sta isti kos: moško vračilo pokrije žensko menjavo.
    genderAgnostic: true,
    titles: [
      "Testmoto TrailShield™ Motorcycle Pants",
      "Testmoto TrailShield™ Black Motorcycle Pants",
      "Testmoto TrailShield™ Green Motorcycle Pants",
      "Testmoto TrailShield™ Camouflage Motorcycle Pants",
      "Testmoto ScudoStrada™ Pantaloni da Moto",
      "Testmoto Schutzwerk™ Motorradhose",
    ],
  },
  {
    key: "flexarmor-jeans",
    label: "FlexArmor jeans",
    genderAgnostic: false,
    titles: [
      "Testmoto FlexArmor™ Motorcycle Jeans",
      "Testmoto FlexArmor™ Black Motorcycle Jeans",
      "Testmoto FlexArmor™ Blue Motorcycle Jeans",
      "Testmoto FlexArmor™ Khaki Motorcycle Jeans",
    ],
  },
  { key: "impactweave-jeans", label: "ImpactWeave jeans", genderAgnostic: false, titles: ["Testmoto ImpactWeave™ Motorcycle Jeans"] },
  {
    key: "airflow-jacket",
    label: "AirFlow jakna",
    genderAgnostic: false,
    titles: [
      "Testmoto™ AirFlow Breathable Motorcycle Jacket (Black)",
      "Testmoto™ AirFlow Breathable Motorcycle Jacket (Gray)",
      "Testmoto™ AirFlow Breathable Motorcycle Jacket",
      "Testmoto™ AirFlow Atmungsaktive Motorradjacke",
    ],
  },
  {
    key: "griplite-gloves",
    label: "GripLite rokavice",
    genderAgnostic: false,
    titles: ["Testmoto™ GripLite Red Gloves", "Testmoto™ GripLite Black/Red Gloves", "Testmoto™ GripLite Gloves"],
  },
  {
    key: "night-glasses",
    label: "Nočna očala",
    genderAgnostic: false,
    titles: ["Testmoto Blendschutz-Nachtfahrbrille", "Testmoto Anti-Glare Night Driving Glasses"],
  },
  { key: "belt", label: "Pas", genderAgnostic: false, titles: ["Testmoto™ Gürtel", "Testmoto™ Belt", "Testmoto™ Cintura"] },
];
