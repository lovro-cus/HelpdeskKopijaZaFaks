// Testi, ki računajo s katalogom, delajo na testnem katalogu (motoristična
// oprema več trgov). Uvoz tega modula nastavi posnetek pred testi.
import { setCatalogSnapshot } from "../../src/lib/catalog-registry";
import { snapshotOf } from "../../src/lib/catalog-seed";
import { FIXTURE_GROUPS } from "./catalog-fixture";
import { FIXTURE_PRODUCTS } from "./catalog-fixture-products";

setCatalogSnapshot(snapshotOf(FIXTURE_PRODUCTS, FIXTURE_GROUPS));
