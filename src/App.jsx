import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProfileQrModal from "./ProfileQrModal";
import { makeQrDataUrl } from "./qrUtils";
import QrScanner from "./QrScanner";

const FOOD_OPTIONS = ["Rodent", "Insect", "Fish", "Greens", "Fruit", "Prepared diet", "Other"];
const EMPTY_FOOD_VALUE = "";
const CLEAN_OPTIONS = ["Full clean", "Partial clean"];
const BEDDING_OPTIONS = ["Aspen", "Cypress mulch", "Coconut fiber", "Paper towel", "Bioactive", "Other"];
const SEX_OPTIONS = ["Unknown", "Male", "Female"];
const EXCREMENT_OPTIONS = ["None observed", "Normal", "Loose", "Urates only", "Abnormal", "Other"];
const STATUS_OPTIONS = ["Active", "Inactive"];
const INACTIVE_REASON_OPTIONS = ["Sold", "Death", "Transferred", "Retired", "Holdback", "Other"];
const STORAGE_KEY = "reptile-notes-animal-tracker-v1";
const APP_NAME = "Reptile Notes";
const APP_VERSION = "1.0.0";

function loadSavedAppState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAppState(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: APP_VERSION, savedAt: new Date().toISOString() }));
  } catch {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: APP_VERSION, savedAt: new Date().toISOString() }));
  }
}

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function makeAnimalId(nextId) {
  return `A-${String(nextId).padStart(3, "0")}`;
}

function makeEggId(nextId) {
  return `E-${String(nextId).padStart(3, "0")}`;
}

function makeQrCode(id) {
  return `QR-${id}`;
}

function makeLocationId(nextId) {
  return `H-${String(nextId).padStart(3, "0")}`;
}

function makeLocationQrCode(id) {
  return `QR-${id}`;
}

function createStatus(status = "Active", reason = "", date = "", note = "") {
  return { status, reason, date, note };
}

function createPricing(purchasedPrice = "", approximatePrice = "", salePrice = "") {
  return { purchasedPrice, approximatePrice, salePrice };
}

function formatPrice(value) {
  if (value === undefined || value === null || value === "") return "-";
  const raw = String(value).trim();
  if (raw.startsWith("$")) return raw;
  const number = Number(raw);
  if (Number.isFinite(number)) return `$${number.toLocaleString()}`;
  return raw;
}

function createHousingLocation(id, name, type = "Enclosure", note = "") {
  return {
    id,
    qrCode: makeLocationQrCode(id),
    name,
    type,
    note,
    logs: [],
  };
}

function addLocationLogToList(locations, locationId, log) {
  return locations.map((location) =>
    location.id === locationId ? { ...location, logs: [log, ...(location.logs || [])] } : location
  );
}

function getLocationForAnimal(animal, locations) {
  return locations.find((location) => location.id === animal?.housing?.locationId) || null;
}

function createPedigreeNode(name = "", depth = 4) {
  const node = { name };
  if (depth > 0) {
    node.sire = createPedigreeNode("", depth - 1);
    node.dam = createPedigreeNode("", depth - 1);
  }
  if (depth === 4) node.notes = "";
  return node;
}

function mergePedigreeNode(target, source, depth = 4) {
  const next = target || createPedigreeNode("", depth);
  if (!source || depth < 0) return next;
  if (typeof source === "string") {
    next.name = source;
    return next;
  }
  next.name = source.name || next.name || "";
  if (depth > 0) {
    next.sire = mergePedigreeNode(next.sire || createPedigreeNode("", depth - 1), source.sire, depth - 1);
    next.dam = mergePedigreeNode(next.dam || createPedigreeNode("", depth - 1), source.dam, depth - 1);
  }
  return next;
}

function normalizePedigree(pedigree) {
  const normalized = createPedigreeNode(pedigree?.name || "", 4);
  normalized.notes = pedigree?.notes || "";
  if (typeof pedigree?.sire === "string") normalized.sire.name = pedigree.sire;
  else if (pedigree?.sire) normalized.sire = mergePedigreeNode(normalized.sire, pedigree.sire, 3);
  if (typeof pedigree?.dam === "string") normalized.dam.name = pedigree.dam;
  else if (pedigree?.dam) normalized.dam = mergePedigreeNode(normalized.dam, pedigree.dam, 3);
  return normalized;
}

function getPedigreeNameAtPath(pedigree, path) {
  let target = normalizePedigree(pedigree);
  path.forEach((part) => {
    target = target?.[part];
  });
  return target?.name || "";
}

function setPedigreeNameAtPath(pedigree, path, value) {
  const next = normalizePedigree(pedigree);
  let target = next;
  path.forEach((part) => {
    if (!target[part]) target[part] = createPedigreeNode("", 1);
    target = target[part];
  });
  target.name = value;
  return next;
}

function copyAncestorBranch(sourceNode, depth = 3) {
  const branch = createPedigreeNode(sourceNode?.name || "", depth);
  if (!sourceNode || depth <= 0) return branch;
  branch.sire = copyAncestorBranch(sourceNode.sire, depth - 1);
  branch.dam = copyAncestorBranch(sourceNode.dam, depth - 1);
  return branch;
}

function shiftPedigreeIntoParentSlot(parentAnimal, depth = 3) {
  const parentSlot = createPedigreeNode(parentAnimal?.name || "", depth);
  if (!parentAnimal) return parentSlot;
  const parentPedigree = normalizePedigree(parentAnimal.pedigree);
  parentSlot.name = parentAnimal.name || parentPedigree.name || "";
  parentSlot.sire = copyAncestorBranch(parentPedigree.sire, depth - 1);
  parentSlot.dam = copyAncestorBranch(parentPedigree.dam, depth - 1);
  return parentSlot;
}

function buildPedigreeFromParents(sireAnimal, damAnimal, childName = "", notes = "") {
  const pedigree = createPedigreeNode(childName, 4);
  pedigree.sire = shiftPedigreeIntoParentSlot(sireAnimal, 3);
  pedigree.dam = shiftPedigreeIntoParentSlot(damAnimal, 3);
  pedigree.notes = notes;
  return pedigree;
}

function parentName(pedigree, role) {
  return normalizePedigree(pedigree)[role]?.name || "";
}

function isActiveProfile(animal) {
  return (animal?.statusInfo?.status || "Active") === "Active";
}

function isFemale(animal) {
  return animal?.sex === "Female";
}

function isMale(animal) {
  return animal?.sex === "Male";
}

function sanitizeReproductiveFields(animal) {
  if (isFemale(animal)) return animal;
  return { ...animal, gravid: false, eggsLaid: "0" };
}

function canTrackEggProduction(animal) {
  return isFemale(animal);
}

function getPossibleDams(group, animalMap) {
  return group.animalIds.filter((id) => isFemale(animalMap[id]) && isActiveProfile(animalMap[id]));
}

function getPossibleSires(group, animalMap) {
  return group.animalIds.filter((id) => isMale(animalMap[id]) && isActiveProfile(animalMap[id]));
}

function canCreateEggFromGroup(group, animalMap) {
  return getPossibleDams(group, animalMap).length > 0 && getPossibleSires(group, animalMap).length > 0;
}

function pickParents(group, animalMap) {
  const possibleDams = getPossibleDams(group, animalMap);
  const possibleSires = getPossibleSires(group, animalMap);
  return { possibleDams, possibleSires, selectedDam: possibleDams[0] || "", selectedSire: possibleSires[0] || "" };
}

function deleteBreedingGroupById(groups, groupId) {
  return groups.filter((group) => group.id !== groupId);
}
function deleteAnimalById(animals, animalId) {
  return animals.filter((animal) => animal.id !== animalId);
}

function removeAnimalFromBreedingGroups(groups, animalId) {
  return groups
    .map((group) => ({
      ...group,
      animalIds: group.animalIds.filter((id) => id !== animalId),
    }))
    .filter((group) => group.animalIds.length > 0);
}

function makePhoto(id, title, note = "", dataUrl = "") {
  return { id, title, note, dataUrl, dateAdded: formatDate(new Date()) };
}

function getPhotoCount(animal) {
  return (animal?.photos || []).length;
}

function getPhotoPreview(photo) {
  return photo?.dataUrl || "";
}

function functionSafeId(value) {
  return String(value || "item").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function getLinkedSireId(animal, animalMap) {
  if (animal?.selectedParents?.sire) return animal.selectedParents.sire;
  const sireName = parentName(animal?.pedigree, "sire");
  return Object.values(animalMap).find((candidate) => candidate.name === sireName && candidate.sex === "Male")?.id || "";
}

function getLinkedDamId(animal, animalMap) {
  if (animal?.selectedParents?.dam) return animal.selectedParents.dam;
  const damName = parentName(animal?.pedigree, "dam");
  return Object.values(animalMap).find((candidate) => candidate.name === damName && candidate.sex === "Female")?.id || "";
}

function buildChildPedigreeFromParentIds(childAnimal, sireId, damId, animalMap, notes = "Auto-filled from linked parents") {
  return buildPedigreeFromParents(animalMap[sireId], animalMap[damId], childAnimal?.name || "", notes);
}

function getParentMorphNotes(animal, animalMap) {
  const sire = animalMap[animal?.selectedParents?.sire];
  const dam = animalMap[animal?.selectedParents?.dam];
  const sireMorph = sire?.morph || "Unknown morph";
  const damMorph = dam?.morph || "Unknown morph";
  return `Parent morphs - Sire: ${sire?.name || "Unknown sire"} (${sireMorph}); Dam: ${dam?.name || "Unknown dam"} (${damMorph})`;
}

function buildFoodSelectionLog(food, date) {
  return `Food selected: ${food} - feeding date auto-filled to ${date}`;
}

function getProfileSnapshot(animal) {
  return {
    name: animal?.name || "",
    species: animal?.species || "",
    morph: animal?.morph || "",
    sex: animal?.sex || "",
    age: animal?.age || "",
    birthDate: animal?.birthDate || "",
    hatchDate: animal?.hatchDate || "",
    weight: animal?.weight || "",
    length: animal?.length || "",
    lastFeeding: {
      date: animal?.lastFeeding?.date || "",
      food: animal?.lastFeeding?.food || "",
      note: animal?.lastFeeding?.note || "",
    },
    excrementObserved: animal?.excrementObserved || "",
    gravid: Boolean(animal?.gravid),
    eggsLaid: animal?.eggsLaid || "0",
    pricing: {
      purchasedPrice: animal?.pricing?.purchasedPrice || "",
      approximatePrice: animal?.pricing?.approximatePrice || "",
      salePrice: animal?.pricing?.salePrice || "",
    },
    statusInfo: {
      status: animal?.statusInfo?.status || "Active",
      reason: animal?.statusInfo?.reason || "",
      date: animal?.statusInfo?.date || "",
      note: animal?.statusInfo?.note || "",
    },
  };
}

function buildProfileSaveSummary(animal) {
  const prev = animal._lastSaved || getProfileSnapshot(animal);
  const changes = [];
  function check(label, current, previous) {
    if (String(current ?? "") !== String(previous ?? "")) changes.push(`${label}: ${previous || "-"} -> ${current || "-"}`);
  }
  check("Name", animal.name, prev.name);
  check("Species", animal.species, prev.species);
  check("Morph", animal.morph, prev.morph);
  check("Sex", animal.sex, prev.sex);
  check("Age", animal.age, prev.age);
  check("Birth/Hatch date", animal.birthDate || animal.hatchDate, prev.birthDate || prev.hatchDate);
  check("Weight", animal.weight, prev.weight);
  check("Length", animal.length, prev.length);
  check("Excrement", animal.excrementObserved, prev.excrementObserved);
  check("Gravid", animal.gravid ? "Yes" : "No", prev.gravid ? "Yes" : "No");
  check("Eggs laid", animal.eggsLaid, prev.eggsLaid);
  const pricing = animal.pricing || {};
  const prevPricing = prev.pricing || {};
  check("Purchased price", pricing.purchasedPrice, prevPricing.purchasedPrice);
  check("Approx price", pricing.approximatePrice, prevPricing.approximatePrice);
  check("Sale price", pricing.salePrice, prevPricing.salePrice);
  const status = animal.statusInfo || {};
  const prevStatus = prev.statusInfo || {};
  check("Status", status.status, prevStatus.status);
  check("Status reason", status.reason, prevStatus.reason);
  check("Status date", status.date, prevStatus.date);
  check("Status note", status.note, prevStatus.note);
  if (changes.length === 0) return "No changes made";
  return `Profile updated for ${animal.name}: ${changes.join(" | ")}`;
}

function buildFeedingLog(animal, today) {
  const date = animal?.lastFeeding?.date || today;
  const food = animal?.lastFeeding?.food;
  const note = animal?.lastFeeding?.note;
  if ((!food || food === EMPTY_FOOD_VALUE) && !note) return null;
  return {
    type: "feeding",
    date,
    summary: `Feeding date: ${date} | Food given: ${food && food !== EMPTY_FOOD_VALUE ? food : "-"} | Feeding notes: ${note || "-"}`,
  };
}

function createEggFromGroup(group, animals, animalMap, today = new Date()) {
  const eggNumber = animals.filter((animal) => animal.id.startsWith("E-")).length + 1;
  const id = makeEggId(eggNumber);
  const { possibleDams, possibleSires, selectedDam, selectedSire } = pickParents(group, animalMap);
  return {
    id,
    qrCode: makeQrCode(id),
    name: `${group.name} Egg`,
    species: animalMap[group.animalIds[0]]?.species || "",
    morph: "Unknown until hatch",
    stage: "egg",
    statusInfo: createStatus("Active"),
    dateLaid: formatDate(today),
    approximateHatchDate: formatDate(addDays(today, 55)),
    possibleParents: { sire: possibleSires, dam: possibleDams },
    selectedParents: { sire: selectedSire, dam: selectedDam },
    pricing: createPricing("", "", ""),
    pedigree: buildPedigreeFromParents(animalMap[selectedSire], animalMap[selectedDam], `${group.name} Egg`, `Auto-populated up to 4 generations from ${group.name}`),
    housing: { locationId: "", enclosure: "Incubator", temperature: "", humidity: "", lastCleaned: { date: formatDate(today), type: "Full clean", note: "Egg box prepared" }, bedding: "Other" },
    logs: [{ type: "egg", date: formatDate(today), summary: `Egg profile created from ${group.name}` }],
    photos: [],
  };
}

function runSelfTests() {
  const testAnimals = [
    { id: "A-001", name: "Dam", sex: "Female", morph: "Normal", species: "Test Species", statusInfo: createStatus("Active") },
    { id: "A-002", name: "Sire", sex: "Male", morph: "Pastel", species: "Test Species", statusInfo: createStatus("Active") },
    { id: "A-003", name: "Unknown Sex", sex: "Unknown", species: "Test Species", statusInfo: createStatus("Active") },
    { id: "A-004", name: "Inactive Male", sex: "Male", species: "Test Species", statusInfo: createStatus("Inactive", "Sold", "2026-04-01", "Sold") },
  ];
  const testMap = Object.fromEntries(testAnimals.map((animal) => [animal.id, animal]));
  const group = { id: "B-001", name: "Test Pair", animalIds: ["A-001", "A-002", "A-003", "A-004"] };
  const egg = createEggFromGroup(group, [{ id: "E-001" }, ...testAnimals], testMap, new Date("2026-04-28T12:00:00Z"));
  console.assert(makeAnimalId(7) === "A-007", "makeAnimalId pads IDs correctly");
  console.assert(makeEggId(2) === "E-002", "makeEggId pads IDs correctly");
  console.assert(makeLocationId(3) === "H-003", "makeLocationId pads housing IDs correctly");
  console.assert(makeQrCode("A-007") === "QR-A-007", "makeQrCode prefixes IDs correctly");
  console.assert(makeLocationQrCode("H-003") === "QR-H-003", "makeLocationQrCode prefixes housing IDs correctly");
  console.assert(egg.selectedParents.dam === "A-001", "egg creation selects female dam");
  console.assert(egg.selectedParents.sire === "A-002", "egg creation selects male sire");
  console.assert(!egg.possibleParents.sire.includes("A-004"), "inactive males are excluded from sires");
  console.assert(!canCreateEggFromGroup({ id: "B-002", name: "No Male", animalIds: ["A-001", "A-003", "A-004"] }, testMap), "egg creation blocks groups without active male");
  const sanitized = sanitizeReproductiveFields({ sex: "Male", gravid: true, eggsLaid: "6" });
  console.assert(sanitized.gravid === false && sanitized.eggsLaid === "0", "non-female reproductive fields reset");
  const testLocation = createHousingLocation("H-010", "Rack 9 / Tub 1", "Tub", "Test location");
  console.assert(addLocationLogToList([testLocation], "H-010", { type: "scan", date: "2026-04-28", summary: "Scanned" })[0].logs.length === 1, "location logs add correctly");
  const photo = makePhoto("P-001", "Test Photo", "Testing photo", "data:image/png;base64,test");
  console.assert(getPhotoCount({ photos: [photo] }) === 1, "photo count works");
  console.assert(getPhotoPreview(photo).startsWith("data:image"), "photo preview works");
  console.assert(formatPrice("250") === "$250", "price formats numeric strings");
  console.assert(buildFoodSelectionLog("Rodent", "2026-04-28") === "Food selected: Rodent - feeding date auto-filled to 2026-04-28", "food selection text formats");
  console.assert(buildFeedingLog({ lastFeeding: { food: "", note: "Observed strike", date: "2026-04-28" } }, "2026-04-28").summary.includes("Observed strike"), "feeding note logs without food");
  console.assert(buildFeedingLog({ lastFeeding: { food: "Rodent", note: "", date: "2026-04-28" } }, "2026-04-28").summary.includes("Rodent"), "feeding food logs with food");
  const baseline = { name: "Test", species: "Snake", morph: "Normal", sex: "Female", pricing: createPricing("50", "100", "150"), statusInfo: createStatus("Active") };
  console.assert(buildProfileSaveSummary({ ...baseline, morph: "Pastel", _lastSaved: getProfileSnapshot(baseline) }).includes("Morph: Normal -> Pastel"), "change-only profile summary works");
  const deepPedigree = setPedigreeNameAtPath(createPedigreeNode("Test"), ["sire", "dam", "sire", "dam"], "Fourth Gen Ancestor");
  console.assert(getPedigreeNameAtPath(deepPedigree, ["sire", "dam", "sire", "dam"]) === "Fourth Gen Ancestor", "fourth generation pedigree works");
}

if (typeof window !== "undefined" && import.meta.env?.DEV && !window.__ANIMAL_QR_TRACKER_TESTED__) {
  window.__ANIMAL_QR_TRACKER_TESTED__ = true;
  runSelfTests();
}

const initialAnimals = [
  {
    id: "A-001",
    qrCode: "QR-A-001",
    name: "Juno",
    species: "Ball Python",
    morph: "Pastel het Pied",
    stage: "animal",
    statusInfo: createStatus("Active"),
    age: "3 years",
    birthDate: "2023-04-12",
    hatchDate: "2023-04-12",
    sex: "Female",
    weight: "1820 g",
    length: "48 in",
    lastFeeding: { date: "", food: EMPTY_FOOD_VALUE, note: "" },
    excrementObserved: "Normal",
    gravid: true,
    eggsLaid: "0",
    pricing: createPricing("450", "900", "1200"),
    pedigree: { sire: "Orion", dam: "Nova", notes: "Pastel het pied line" },
    housing: { locationId: "H-001", enclosure: "Rack 2 / Tub 7", temperature: "89F hot spot / 78F ambient", humidity: "62%", lastCleaned: { date: "2026-04-20", type: "Partial clean", note: "Spot cleaned water side" }, bedding: "Coconut fiber" },
    logs: [{ type: "cleaning", date: "2026-04-20", summary: "Partial clean - Spot cleaned water side" }],
    photos: [makePhoto("P-A-001-1", "Profile reference", "Main reference photo placeholder")],
  },
  {
    id: "A-002",
    qrCode: "QR-A-002",
    name: "Atlas",
    species: "Ball Python",
    morph: "Clown line",
    stage: "animal",
    statusInfo: createStatus("Active"),
    age: "4 years",
    birthDate: "2022-05-01",
    hatchDate: "2022-05-01",
    sex: "Male",
    weight: "980 g",
    length: "42 in",
    lastFeeding: { date: "", food: EMPTY_FOOD_VALUE, note: "" },
    excrementObserved: "Normal",
    gravid: false,
    eggsLaid: "0",
    pricing: createPricing("300", "650", "850"),
    pedigree: { sire: "Titan", dam: "Echo", notes: "Clown line" },
    housing: { locationId: "H-002", enclosure: "Rack 1 / Tub 3", temperature: "88F hot spot / 79F ambient", humidity: "58%", lastCleaned: { date: "2026-04-21", type: "Full clean", note: "Changed all bedding" }, bedding: "Aspen" },
    logs: [],
    photos: [],
  },
  {
    id: "E-001",
    qrCode: "QR-E-001",
    name: "Juno x Atlas Clutch 1 Egg 1",
    species: "Ball Python",
    morph: "Unknown until hatch",
    stage: "egg",
    statusInfo: createStatus("Active"),
    dateLaid: "2026-04-24",
    approximateHatchDate: "2026-06-18",
    possibleParents: { sire: ["A-002"], dam: ["A-001"] },
    selectedParents: { sire: "A-002", dam: "A-001" },
    pricing: createPricing("", "", ""),
    pedigree: { sire: "Atlas", dam: "Juno", notes: "Auto-populated from breeding group B-001" },
    housing: { locationId: "H-003", enclosure: "Incubator / Box 4", temperature: "88.5F", humidity: "92%", lastCleaned: { date: "2026-04-24", type: "Full clean", note: "Fresh incubation media" }, bedding: "Other" },
    logs: [{ type: "egg", date: "2026-04-24", summary: "Egg laid and incubated" }],
    photos: [],
  },
];

const initialBreedingGroups = [
  { id: "B-001", name: "Juno x Atlas 2026", animalIds: ["A-001", "A-002"], notes: "Observed locks in February and March.", status: "Active" },
];

const initialHousingLocations = [
  { ...createHousingLocation("H-001", "Rack 2 / Tub 7", "Tub", "Adult female ball python tub"), logs: [{ type: "cleaning", date: "2026-04-20", summary: "Partial clean - Spot cleaned water side" }] },
  { ...createHousingLocation("H-002", "Rack 1 / Tub 3", "Tub", "Adult male ball python tub"), logs: [{ type: "cleaning", date: "2026-04-21", summary: "Full clean - Changed all bedding" }] },
  { ...createHousingLocation("H-003", "Incubator / Box 4", "Incubator", "Egg incubation box"), logs: [{ type: "setup", date: "2026-04-24", summary: "Fresh incubation media prepared" }] },
];

function blankAnimal(nextId) {
  const id = makeAnimalId(nextId);
  return {
    id,
    qrCode: makeQrCode(id),
    name: "New Animal",
    species: "",
    morph: "",
    stage: "animal",
    statusInfo: createStatus("Active"),
    age: "",
    birthDate: "",
    hatchDate: "",
    sex: "Unknown",
    weight: "",
    length: "",
    lastFeeding: { date: "", food: EMPTY_FOOD_VALUE, note: "" },
    excrementObserved: "None observed",
    gravid: false,
    eggsLaid: "0",
    pricing: createPricing("", "", ""),
    pedigree: createPedigreeNode("New Animal"),
    housing: { locationId: "", enclosure: "", temperature: "", humidity: "", lastCleaned: { date: "", type: "Partial clean", note: "" }, bedding: "Aspen" },
    logs: [],
    photos: [],
  };
}

function Icon({ name, className = "h-5 w-5" }) {
  const icons = { qr: "QR", search: "S", plus: "+", paw: "P", home: "H", heart: "B", egg: "E", baby: "*", clipboard: "L", branch: "T", save: "OK", close: "X", length: "L", temp: "T", drop: "%", photo: "I", money: "$", status: "S" };
  return <span aria-hidden="true" className={`inline-flex items-center justify-center font-bold leading-none ${className}`}>{icons[name] || "*"}</span>;
}

function Field({ label, children }) {
  return <label className="space-y-1 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}

function Input(props) {
  return <input {...props} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500" />;
}

function Select({ children, ...props }) {
  return <select {...props} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500">{children}</select>;
}

function Textarea(props) {
  return <textarea {...props} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500" />;
}

function StatCard({ icon, label, value }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <div className="rounded-2xl bg-slate-100 p-2"><Icon name={icon} className="h-4 w-4 text-slate-700" /></div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 sm:text-xs">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{value || "-"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileSectionTitle({ icon, title, subtitle }) {
  return (
    <div className="space-y-1">
      <h3 className="flex items-center gap-2 text-lg font-bold sm:text-xl"><Icon name={icon} /> {title}</h3>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function PedigreeInput({ pedigree, path, label, onChange }) {
  return <Field label={label}><Input value={getPedigreeNameAtPath(pedigree, path)} onChange={(event) => onChange(path, event.target.value)} /></Field>;
}

export default function AnimalQrTrackingApp() {
  const savedState = loadSavedAppState();
  const [animals, setAnimals] = useState(() => savedState?.animals || initialAnimals.map((animal) => ({ ...animal, _lastSaved: getProfileSnapshot(animal) })));
  const [breedingGroups, setBreedingGroups] = useState(() => savedState?.breedingGroups || initialBreedingGroups);
  const [housingLocations, setHousingLocations] = useState(() => savedState?.housingLocations || initialHousingLocations);
  const [selectedId, setSelectedId] = useState("A-001");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [showPedigree, setShowPedigree] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showLocationQr, setShowLocationQr] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [realQrProfile, setRealQrProfile] = useState(null);
  const [scanValue, setScanValue] = useState("QR-A-001");
  const [scanMessage, setScanMessage] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("H-001");
  const [locationDraft, setLocationDraft] = useState({ name: "", type: "Enclosure", note: "" });
  const [locationLogDraft, setLocationLogDraft] = useState({ type: "scan", summary: "" });
  const [groupDraft, setGroupDraft] = useState({ name: "", animalIds: [], notes: "" });
  const [photoDraft, setPhotoDraft] = useState({ title: "", note: "" });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const selected = animals.find((animal) => animal.id === selectedId) || animals[0];
  const animalMap = useMemo(() => Object.fromEntries(animals.map((animal) => [animal.id, animal])), [animals]);
  const activeAnimals = animals.filter((animal) => animal.stage === "animal" && isActiveProfile(animal));
  const selectedLocation = housingLocations.find((location) => location.id === selectedLocationId) || housingLocations[0];
  const selectedAnimalLocation = getLocationForAnimal(selected, housingLocations);

  const filteredAnimals = animals.filter((animal) =>
    [animal.name, animal.id, animal.qrCode, animal.species, animal.stage, animal.statusInfo?.status, animal.statusInfo?.reason]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  useEffect(() => {
    saveAppState({ animals, breedingGroups, housingLocations });
  }, [animals, breedingGroups, housingLocations]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function updateSelected(path, value) {
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      const copy = clone(animal);
      const parts = path.split(".");
      let target = copy;
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
      return sanitizeReproductiveFields(copy);
    }));
  }

  function updateSelectedMany(updates) {
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      const copy = clone(animal);
      updates.forEach(({ path, value }) => {
        const parts = path.split(".");
        let target = copy;
        for (let i = 0; i < parts.length - 1; i += 1) {
          if (!target[parts[i]]) target[parts[i]] = {};
          target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;
      });
      return sanitizeReproductiveFields(copy);
    }));
  }

  function addLog(type, summary) {
    const today = formatDate(new Date());
    setAnimals((prev) => prev.map((animal) => animal.id === selected.id ? { ...animal, logs: [{ type, date: today, summary }, ...(animal.logs || [])] } : animal));
  }

  function selectFoodAndLog(food) {
    if (!food) {
      updateSelected("lastFeeding.food", EMPTY_FOOD_VALUE);
      return;
    }
    const today = formatDate(new Date());
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      return sanitizeReproductiveFields({
        ...animal,
        lastFeeding: { ...(animal.lastFeeding || {}), food, date: today },
      });
    }));
  }

  function saveProfileLog() {
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      const today = formatDate(new Date());
      const logs = [];
      const feedingLog = buildFeedingLog(animal, today);
      const summary = buildProfileSaveSummary(animal);
      if (feedingLog) logs.push(feedingLog);
      if (summary !== "No changes made") logs.push({ type: "profile", date: today, summary });
      const next = {
        ...animal,
        lastFeeding: { ...(animal.lastFeeding || {}), food: EMPTY_FOOD_VALUE, note: "" },
        _lastSaved: getProfileSnapshot({ ...animal, lastFeeding: { ...(animal.lastFeeding || {}), food: EMPTY_FOOD_VALUE, note: "" } }),
      };
      if (logs.length === 0) return next;
      return { ...next, logs: [...logs, ...(animal.logs || [])] };
    }));
  }

  function updateStatus(status, reason = selected.statusInfo?.reason || "", note = selected.statusInfo?.note || "") {
    const today = formatDate(new Date());
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      const nextStatus = status === "Active" ? createStatus("Active", "", "", "") : createStatus("Inactive", reason || "Other", animal.statusInfo?.date || today, note);
      return { ...animal, statusInfo: nextStatus, logs: [{ type: "status", date: today, summary: status === "Active" ? "Profile marked active" : `Profile marked inactive: ${nextStatus.reason}` }, ...(animal.logs || [])] };
    }));
  }
  
  function openScannedCode(value) {
    const normalized = String(value || "").trim().toLowerCase();
    const animalMatch = animals.find((animal) => animal.qrCode.toLowerCase() === normalized || animal.id.toLowerCase() === normalized);
    if (animalMatch) {
      setSelectedId(animalMatch.id);
      setActiveTab(animalMatch.stage === "egg" ? "egg" : "profile");
      setScanMessage(`Opened ${animalMatch.name}.`);
      return true;
    }
    const locationMatch = housingLocations.find((location) => location.qrCode.toLowerCase() === normalized || location.id.toLowerCase() === normalized);
    if (locationMatch) {
      setSelectedLocationId(locationMatch.id);
      setActiveTab("locations");
      setScanMessage(`Opened housing location ${locationMatch.name}.`);
      addHousingLocationLog(locationMatch.id, "scan", `QR scanned for ${locationMatch.name}`);
      return true;
    }
    setScanMessage("No animal, egg, or housing location matched that QR code.");
    return false;
  }

  function scanQr() {
    openScannedCode(scanValue);
  }
  
  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  function addHousingLocation() {
    if (!locationDraft.name.trim()) return;
    const id = makeLocationId(housingLocations.length + 1);
    const location = createHousingLocation(id, locationDraft.name.trim(), locationDraft.type || "Enclosure", locationDraft.note);
    setHousingLocations((prev) => [location, ...prev]);
    setSelectedLocationId(id);
    setLocationDraft({ name: "", type: "Enclosure", note: "" });
  }

  function updateHousingLocation(locationId, path, value) {
    setHousingLocations((prev) => prev.map((location) => location.id === locationId ? { ...location, [path]: value } : location));
  }
  
  function deleteSelectedHousingLocation() {
  if (!selectedLocation || housingLocations.length <= 1) return;

  const deletedId = selectedLocation.id;
  const remainingLocations = housingLocations.filter(
    (location) => location.id !== deletedId
  );

  setHousingLocations(remainingLocations);

  setAnimals((prev) =>
    prev.map((animal) =>
      animal.housing?.locationId === deletedId
        ? {
            ...animal,
            housing: {
              ...(animal.housing || {}),
              locationId: "",
              enclosure: "",
            },
          }
        : animal
    )
  );

  setSelectedLocationId(remainingLocations[0]?.id || "");
}

  function addHousingLocationLog(locationId, type = locationLogDraft.type, summary = locationLogDraft.summary) {
    if (!locationId) return;
    const today = formatDate(new Date());
    const relatedAnimals = animals.filter((animal) => animal.housing?.locationId === locationId);
    const firstAnimal = relatedAnimals[0];
    const envDetails = firstAnimal?.housing?.temperature || firstAnimal?.housing?.humidity ? ` (Temp: ${firstAnimal?.housing?.temperature || "-"}, Humidity: ${firstAnimal?.housing?.humidity || "-"})` : "";
    const log = { type: type || "note", date: today, summary: `${summary || "Location checked"}${envDetails}` };
    setHousingLocations((prev) => addLocationLogToList(prev, locationId, log));
    setLocationLogDraft({ type: "scan", summary: "" });
  }

  function assignSelectedAnimalToLocation(locationId) {
    const location = housingLocations.find((item) => item.id === locationId);
    updateSelectedMany([{ path: "housing.locationId", value: locationId }, { path: "housing.enclosure", value: location?.name || "" }]);
    if (location) addHousingLocationLog(locationId, "assignment", `${selected.name} assigned to ${location.name}`);
  }

  function addAnimal() {
    const nextNumber = animals.filter((animal) => animal.id.startsWith("A-")).length + 1;
    const newAnimal = { ...blankAnimal(nextNumber) };
    newAnimal._lastSaved = getProfileSnapshot(newAnimal);
    setAnimals((prev) => [newAnimal, ...prev]);
    setSelectedId(newAnimal.id);
    setActiveTab("profile");
  }
  
  function requestDeleteSelectedAnimal() {
  if (!selected || animals.length <= 1) return;
  setShowDeleteConfirm(true);
}

function deleteSelectedAnimal() {
  if (!selected || animals.length <= 1) return;

  const remainingAnimals = deleteAnimalById(animals, selected.id);
  const nextSelected = remainingAnimals[0];

  setAnimals(remainingAnimals);
  setBreedingGroups((prev) =>
    removeAnimalFromBreedingGroups(prev, selected.id)
  );

  setSelectedId(nextSelected?.id || "");
  setActiveTab(nextSelected?.stage === "egg" ? "egg" : "profile");

  setShowDeleteConfirm(false);
  setShowQr(false);
  setShowPedigree(false);
  setRealQrProfile(null);
}
  
  function toggleGroupAnimal(id) {
    setGroupDraft((draft) => ({
      ...draft,
      animalIds: draft.animalIds.includes(id) ? draft.animalIds.filter((animalId) => animalId !== id) : draft.animalIds.length < 4 ? [...draft.animalIds, id] : draft.animalIds,
    }));
  }

  function createBreedingGroup() {
    if (groupDraft.animalIds.length < 2) return;
    const group = { id: `B-${String(breedingGroups.length + 1).padStart(3, "0")}`, name: groupDraft.name || `Breeding Group ${breedingGroups.length + 1}`, animalIds: groupDraft.animalIds, notes: groupDraft.notes, status: "Active" };
    setBreedingGroups((prev) => [group, ...prev]);
    setGroupDraft({ name: "", animalIds: [], notes: "" });
    setActiveTab("breeding");
  }

  function createEggProfile(group) {
    if (!canCreateEggFromGroup(group, animalMap)) return;
    const egg = createEggFromGroup(group, animals, animalMap, new Date());
    setAnimals((prev) => [{ ...egg, _lastSaved: getProfileSnapshot(egg) }, ...prev]);
    setSelectedId(egg.id);
    setActiveTab("egg");
  }

  function deleteBreedingGroup(groupId) {
    setBreedingGroups((prev) => deleteBreedingGroupById(prev, groupId));
  }

  function hatchEgg() {
    const today = formatDate(new Date());
    setAnimals((prev) => prev.map((animal) => animal.id === selected.id ? {
      ...animal,
      stage: "animal",
      statusInfo: createStatus("Active"),
      birthDate: today,
      hatchDate: today,
      age: "0 days",
      sex: "Unknown",
      morph: animal.morph && animal.morph !== "Unknown until hatch" ? animal.morph : "",
      weight: "",
      length: "",
      lastFeeding: { date: "", food: EMPTY_FOOD_VALUE, note: "" },
      excrementObserved: "None observed",
      gravid: false,
      eggsLaid: "0",
      logs: [{ type: "hatch", date: today, summary: `Egg hatched; converted to full animal profile. ${getParentMorphNotes(animal, animalMap)}` }, ...(animal.logs || [])],
    } : animal));
    setActiveTab("profile");
  }

  function updateEggParent(role, id) {
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      const nextSelectedParents = { ...(animal.selectedParents || {}), [role]: id };
      const pedigree = buildChildPedigreeFromParentIds(animal, nextSelectedParents.sire, nextSelectedParents.dam, animalMap, normalizePedigree(animal.pedigree).notes || "Auto-populated from selected parents");
      return { ...animal, selectedParents: nextSelectedParents, pedigree };
    }));
  }

  function linkParentAndAutofill(role, id) {
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      const nextSelectedParents = { ...(animal.selectedParents || {}), [role]: id };
      const pedigree = buildChildPedigreeFromParentIds(animal, nextSelectedParents.sire, nextSelectedParents.dam, animalMap, "Auto-filled from linked parents");
      return { ...animal, selectedParents: nextSelectedParents, pedigree };
    }));
  }

  function refillSelectedPedigreeFromParents() {
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      const sireId = animal.selectedParents?.sire || getLinkedSireId(animal, animalMap);
      const damId = animal.selectedParents?.dam || getLinkedDamId(animal, animalMap);
      if (!sireId && !damId) return animal;
      return { ...animal, selectedParents: { ...(animal.selectedParents || {}), sire: sireId, dam: damId }, pedigree: buildChildPedigreeFromParentIds(animal, sireId, damId, animalMap, "Auto-refilled up to 4 generations from selected parents") };
    }));
  }

  function updatePedigreeName(path, value) {
    setAnimals((prev) => prev.map((animal) => animal.id === selected.id ? { ...animal, pedigree: setPedigreeNameAtPath(animal.pedigree, path, value) } : animal));
  }

  function updatePedigreeNotes(value) {
    setAnimals((prev) => prev.map((animal) => {
      if (animal.id !== selected.id) return animal;
      const pedigree = normalizePedigree(animal.pedigree);
      pedigree.notes = value;
      return { ...animal, pedigree };
    }));
  }

  function addPhotoFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const photoId = `P-${functionSafeId(selected.id)}-${Date.now()}`;
      const photo = makePhoto(photoId, photoDraft.title || file.name || "Animal photo", photoDraft.note, String(reader.result || ""));
      setAnimals((prev) => prev.map((animal) => animal.id === selected.id ? { ...animal, photos: [photo, ...(animal.photos || [])] } : animal));
      setPhotoDraft({ title: "", note: "" });
      addLog("photo", `Added photo: ${photo.title}`);
    };
    reader.readAsDataURL(file);
  }

  function updatePhoto(photoId, field, value) {
    setAnimals((prev) => prev.map((animal) => animal.id === selected.id ? { ...animal, photos: (animal.photos || []).map((photo) => photo.id === photoId ? { ...photo, [field]: value } : photo) } : animal));
  }

  function removePhoto(photoId) {
    setAnimals((prev) => prev.map((animal) => animal.id === selected.id ? { ...animal, photos: (animal.photos || []).filter((photo) => photo.id !== photoId) } : animal));
  }

 async function printQrCode() {
  const qrUrl = await makeQrDataUrl(selected.qrCode);
  const printWindow = window.open("", "_blank", "width=420,height=560");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${selected.name} QR Code</title>
      </head>
      <body style="font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;">
        <main style="text-align:center;border:1px solid #e5e7eb;border-radius:24px;padding:32px;">
          <h1 style="font-size:24px;margin:0 0 8px;">${selected.name}</h1>
          <p style="margin:0 0 16px;color:#475569;">${selected.id} - ${selected.species || "Species not set"}</p>
          <img src="${qrUrl}" alt="${selected.qrCode}" style="width:260px;height:260px;image-rendering:pixelated;background:white;" />
          <p style="font-size:20px;font-weight:700;margin:16px 0 4px;">${selected.qrCode}</p>
          <p style="font-size:12px;color:#64748b;margin:0;">Scan or enter this code to open the animal profile.</p>
        </main>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

  async function printLocationQrCode() {
  if (!selectedLocation) return;

  const qrUrl = await makeQrDataUrl(selectedLocation.qrCode);
  const printWindow = window.open("", "_blank", "width=420,height=560");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${selectedLocation.name} Housing QR Code</title>
      </head>
      <body style="font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;">
        <main style="text-align:center;border:1px solid #e5e7eb;border-radius:24px;padding:32px;">
          <h1 style="font-size:24px;margin:0 0 8px;">${selectedLocation.name}</h1>
          <p style="margin:0 0 16px;color:#475569;">${selectedLocation.id} - ${selectedLocation.type || "Housing location"}</p>
          <img src="${qrUrl}" alt="${selectedLocation.qrCode}" style="width:260px;height:260px;image-rendering:pixelated;background:white;" />
          <p style="font-size:20px;font-weight:700;margin:16px 0 4px;">${selectedLocation.qrCode}</p>
          <p style="font-size:12px;color:#64748b;margin:0;">Scan or enter this code to open and log this housing location.</p>
        </main>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

  return (
    <div className="min-h-screen bg-slate-50 p-3 pb-24 text-slate-900 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-4 text-white shadow-xl sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-300">{APP_NAME}</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl md:text-5xl">Animal tracking, husbandry, breeding, and pedigree records</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">Scan a QR code, open the exact animal or egg profile, and preserve every record even when an animal is sold, deceased, transferred, or retired.</p>
              </div>
          <div className="rounded-3xl bg-white/10 p-4 backdrop-blur"><Icon name="qr" className="h-16 w-16 text-5xl" /></div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-3 sm:p-4">
                <div className="flex items-center gap-2 font-semibold"><Icon name="qr" /> QR scan / lookup</div>
                <div className="flex gap-2">
                  <Input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="Scan or type QR-A-001" />
                  <Button onClick={scanQr} className="rounded-xl">Open</Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                 <Button
                   variant="outline"
                   onClick={() => setShowScanner(true)}
                  className="rounded-xl"
                >
                  Scan QR
                </Button>
                  <Button variant="outline" onClick={installApp} className="rounded-xl" disabled={!installPrompt}>Install app</Button>
                </div>
                <p className="text-xs text-slate-500">Scanner accepts animal ID, location ID, QR value, or camera QR scan when supported.</p>
                {scanMessage && <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">{scanMessage}</p>}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold"><Icon name="search" /> Animals & eggs</div>
                  <Button onClick={addAnimal} size="sm" className="rounded-xl"><Icon name="plus" className="mr-1 h-4 w-4" /> Add</Button>
                </div>
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, status..." />
                <div className="max-h-[45vh] space-y-2 overflow-auto pr-1 lg:max-h-[560px]">
                  {filteredAnimals.map((animal) => (
                    <button key={animal.id} onClick={() => { setSelectedId(animal.id); setActiveTab(animal.stage === "egg" ? "egg" : "profile"); }} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === animal.id ? "border-slate-900 bg-white shadow-sm" : "border-slate-200 bg-white/70 hover:bg-white"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">{animal.name}</div>
                        <span className={`rounded-full px-2 py-1 text-xs ${!isActiveProfile(animal) ? "bg-slate-200 text-slate-700" : animal.stage === "egg" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{!isActiveProfile(animal) ? `inactive - ${animal.statusInfo?.reason || "archived"}` : animal.stage}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{animal.id} - {animal.qrCode} - {animal.species || "No species"}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key={selected?.id}>
              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3"><Icon name={selected.stage === "egg" ? "egg" : "paw"} className="h-6 w-6" /></div>
                      <div>
                        <h2 className="text-xl font-bold leading-tight sm:text-2xl">{selected.name}</h2>
                        <p className="text-sm text-slate-500">{selected.id} - {selected.qrCode} - {selected.species || "Species not set"}</p>
                        {!isActiveProfile(selected) && <p className="mt-1 w-fit rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Inactive: {selected.statusInfo?.reason || "Archived"} {selected.statusInfo?.date ? `on ${selected.statusInfo.date}` : ""}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
                      {["profile", "housing", "locations", "photos", "breeding", "logs", selected.stage === "egg" ? "egg" : null].filter(Boolean).map((tab) => <Button key={tab} variant={activeTab === tab ? "default" : "outline"} onClick={() => setActiveTab(tab)} className="shrink-0 rounded-xl capitalize">{tab}</Button>)}
                     <Button variant="outline" onClick={() => setRealQrProfile(selected)} className="rounded-xl">
  <Icon name="qr" className="mr-2 h-4 w-4" /> QR Code
</Button>
                      <Button variant="outline" onClick={() => setShowPedigree(true)} className="rounded-xl"><Icon name="branch" className="mr-2 h-4 w-4" /> Pedigree</Button>
                    <Button
          variant="outline"
              onClick={requestDeleteSelectedAnimal}
            className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
          disabled={animals.length <= 1}
          >
              Delete Animal
          </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {activeTab === "profile" && selected.stage !== "egg" && (
              <section className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard icon="clipboard" label="Last feeding" value={`${selected.lastFeeding?.date || "-"} ${selected.lastFeeding?.food || ""}`} />
                  <StatCard icon="paw" label="Weight" value={selected.weight} />
                  <StatCard icon="length" label="Length" value={selected.length} />
                  <StatCard icon="egg" label="Gravid / eggs" value={`${selected.gravid ? "Gravid" : "Not gravid"} - ${selected.eggsLaid || 0}`} />
                  <StatCard icon="photo" label="Photos" value={`${getPhotoCount(selected)} stored`} />
                  <StatCard icon="money" label="Approx. value" value={formatPrice(selected.pricing?.approximatePrice)} />
                  <StatCard icon="status" label="Status" value={isActiveProfile(selected) ? "Active" : `Inactive - ${selected.statusInfo?.reason || "Archived"}`} />
                </div>
                <Card className="rounded-3xl border-slate-200 shadow-sm">
                  <CardContent className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
                    <Field label="Name"><Input value={selected.name} onChange={(event) => updateSelected("name", event.target.value)} /></Field>
                    <Field label="Species"><Input value={selected.species} onChange={(event) => updateSelected("species", event.target.value)} /></Field>
                    <Field label="Morph"><Input value={selected.morph || ""} onChange={(event) => updateSelected("morph", event.target.value)} placeholder="Example: Pastel, Clown, Pied, Normal" /></Field>
                    <Field label="Age"><Input value={selected.age} onChange={(event) => updateSelected("age", event.target.value)} /></Field>
                    <Field label="Birth date / hatch date"><Input type="date" value={selected.birthDate || selected.hatchDate || ""} onChange={(event) => updateSelectedMany([{ path: "birthDate", value: event.target.value }, { path: "hatchDate", value: event.target.value }])} /></Field>
                    <Field label="Sex"><Select value={selected.sex} onChange={(event) => updateSelected("sex", event.target.value)}>{SEX_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field>
                    <Field label="Weight"><Input value={selected.weight} onChange={(event) => updateSelected("weight", event.target.value)} /></Field>
                    <Field label="Length"><Input value={selected.length} onChange={(event) => updateSelected("length", event.target.value)} /></Field>
                    <Field label="Last feeding date"><Input type="date" value={selected.lastFeeding?.date || ""} onChange={(event) => updateSelected("lastFeeding.date", event.target.value)} /></Field>
                    <Field label="Food given"><Select value={selected.lastFeeding?.food || EMPTY_FOOD_VALUE} onChange={(event) => selectFoodAndLog(event.target.value)}><option value="">Select food</option>{FOOD_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                    <Field label="Feeding note"><Textarea value={selected.lastFeeding?.note || ""} onChange={(event) => updateSelected("lastFeeding.note", event.target.value)} /></Field>
                    <Field label="Excrement observed"><Select value={selected.excrementObserved} onChange={(event) => updateSelected("excrementObserved", event.target.value)}>{EXCREMENT_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field>
                    <Field label="Gravid"><Select value={canTrackEggProduction(selected) && selected.gravid ? "Yes" : "No"} onChange={(event) => updateSelected("gravid", event.target.value === "Yes")} disabled={!canTrackEggProduction(selected)}><option>Yes</option><option>No</option></Select></Field>
                    <Field label="Eggs laid"><Input value={canTrackEggProduction(selected) ? selected.eggsLaid : "0"} onChange={(event) => updateSelected("eggsLaid", event.target.value)} disabled={!canTrackEggProduction(selected)} /></Field>
                    {!canTrackEggProduction(selected) && <div className="md:col-span-2 rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">Only animals marked as Female can be marked gravid or have eggs laid recorded.</div>}

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Icon name="status" /> Profile status</h3>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Status"><Select value={selected.statusInfo?.status || "Active"} onChange={(event) => updateStatus(event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field>
                        <Field label="Inactive reason"><Select value={selected.statusInfo?.reason || "Other"} onChange={(event) => updateStatus("Inactive", event.target.value, selected.statusInfo?.note || "")} disabled={isActiveProfile(selected)}>{INACTIVE_REASON_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field>
                        <Field label="Inactive date"><Input type="date" value={selected.statusInfo?.date || ""} onChange={(event) => updateSelected("statusInfo.date", event.target.value)} disabled={isActiveProfile(selected)} /></Field>
                        <div className="md:col-span-3"><Field label="Inactive note"><Textarea value={selected.statusInfo?.note || ""} onChange={(event) => updateSelected("statusInfo.note", event.target.value)} disabled={isActiveProfile(selected)} /></Field></div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Icon name="money" /> Pricing</h3>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Purchased price"><Input inputMode="decimal" value={selected.pricing?.purchasedPrice || ""} onChange={(event) => updateSelected("pricing.purchasedPrice", event.target.value)} /></Field>
                        <Field label="Approximate price / value"><Input inputMode="decimal" value={selected.pricing?.approximatePrice || ""} onChange={(event) => updateSelected("pricing.approximatePrice", event.target.value)} /></Field>
                        <Field label="Sale price"><Input inputMode="decimal" value={selected.pricing?.salePrice || ""} onChange={(event) => updateSelected("pricing.salePrice", event.target.value)} /></Field>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end"><Button onClick={saveProfileLog} className="rounded-xl"><Icon name="save" className="mr-2 h-4 w-4" /> Save profile log</Button></div>
                  </CardContent>
                </Card>
              </section>
            )}

            {activeTab === "locations" && (
              <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
                <Card className="rounded-3xl border-slate-200 shadow-sm">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <MobileSectionTitle icon="home" title="Housing locations" subtitle="Each housing location has its own QR code and individual log history." />
                      <Button onClick={() => setShowLocationQr(true)} className="rounded-xl" disabled={!selectedLocation}><Icon name="qr" className="mr-2 h-4 w-4" /> View QR</Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {housingLocations.map((location) => {
                        const assignedAnimals = animals.filter((animal) => animal.housing?.locationId === location.id);
                        return (
                          <button key={location.id} onClick={() => setSelectedLocationId(location.id)} className={`rounded-2xl border p-4 text-left transition ${selectedLocationId === location.id ? "border-slate-900 bg-white shadow-sm" : "border-slate-200 bg-white/70 hover:bg-white"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div><p className="font-bold">{location.name}</p><p className="text-xs text-slate-500">{location.id} - {location.qrCode} - {location.type}</p></div>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{assignedAnimals.length} animal{assignedAnimals.length === 1 ? "" : "s"}</span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{location.note || "No location note"}</p>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-4 sm:p-5"><MobileSectionTitle icon="plus" title="Add housing location" subtitle="Create printable QR codes for racks, tubs, cages, bins, shelves, or incubator boxes." /><Field label="Location name"><Input value={locationDraft.name} onChange={(event) => setLocationDraft({ ...locationDraft, name: event.target.value })} /></Field><Field label="Location type"><Input value={locationDraft.type} onChange={(event) => setLocationDraft({ ...locationDraft, type: event.target.value })} /></Field><Field label="Location note"><Textarea value={locationDraft.note} onChange={(event) => setLocationDraft({ ...locationDraft, note: event.target.value })} /></Field><Button onClick={addHousingLocation} className="w-full rounded-xl py-5 sm:py-2" disabled={!locationDraft.name.trim()}>Add location</Button></CardContent></Card>
                  {selectedLocation && <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-4 sm:p-5"><MobileSectionTitle icon="qr" title={selectedLocation.name} subtitle={`${selectedLocation.id} - ${selectedLocation.qrCode}`} /><Field label="Location name"><Input value={selectedLocation.name} onChange={(event) => updateHousingLocation(selectedLocation.id, "name", event.target.value)} /></Field><Field label="Location type"><Input value={selectedLocation.type || ""} onChange={(event) => updateHousingLocation(selectedLocation.id, "type", event.target.value)} /></Field><Field label="Location note"><Textarea value={selectedLocation.note || ""} onChange={(event) => updateHousingLocation(selectedLocation.id, "note", event.target.value)} /></Field>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowLocationQr(true)}
                        className="rounded-xl"
                      >
                        <Icon name="qr" className="mr-2 h-4 w-4" /> View / print QR
                      </Button>

                      <Button
                        onClick={() => addHousingLocationLog(selectedLocation.id)}
                        className="rounded-xl"
                      >
                        <Icon name="save" className="mr-2 h-4 w-4" /> Quick check log
                      </Button>

                      <Button
                        variant="outline"
                        onClick={deleteSelectedHousingLocation}
                        className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                        disabled={housingLocations.length <= 1}
                      >
                        Delete Location
                      </Button>
                    </div>
                  </CardContent>
                </Card>}

                {selectedLocation && <Card className="rounded-3xl border-slate-200 shadow-sm xl:col-span-2">

            {activeTab === "photos" && (
              <section className="space-y-4"><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-5"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><MobileSectionTitle icon="photo" title="Photos" subtitle={`Store profile and husbandry pictures for ${selected.name}.`} /><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{getPhotoCount(selected)} stored</span></div><div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Photo title"><Input value={photoDraft.title} onChange={(event) => setPhotoDraft({ ...photoDraft, title: event.target.value })} /></Field><Field label="Choose image"><Input type="file" accept="image/*" onChange={(event) => addPhotoFromFile(event.target.files?.[0])} /></Field><div className="md:col-span-2"><Field label="Photo note"><Textarea value={photoDraft.note} onChange={(event) => setPhotoDraft({ ...photoDraft, note: event.target.value })} /></Field></div></div></div></CardContent></Card>{(selected.photos || []).length === 0 ? <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-8 text-center text-slate-500"><p className="font-semibold text-slate-700">No photos stored yet</p></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(selected.photos || []).map((photo) => <Card key={photo.id} className="overflow-hidden rounded-3xl border-slate-200 shadow-sm"><div className="flex aspect-video items-center justify-center bg-slate-100">{getPhotoPreview(photo) ? <img src={getPhotoPreview(photo)} alt={photo.title || "Animal photo"} className="h-full w-full object-cover" /> : <div className="text-center text-slate-500">Photo placeholder</div>}</div><CardContent className="space-y-3 p-3 sm:p-4"><Field label="Title"><Input value={photo.title || ""} onChange={(event) => updatePhoto(photo.id, "title", event.target.value)} /></Field><Field label="Note"><Textarea value={photo.note || ""} onChange={(event) => updatePhoto(photo.id, "note", event.target.value)} /></Field><div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>Added {photo.dateAdded || "-"}</span><Button variant="outline" onClick={() => removePhoto(photo.id)} className="rounded-xl"><Icon name="close" className="mr-2 h-4 w-4" /> Remove</Button></div></CardContent></Card>)}</div>}</section>
            )}

            {activeTab === "housing" && (
              <section className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><StatCard icon="temp" label="Temperature" value={selected.housing?.temperature} /><StatCard icon="drop" label="Humidity" value={selected.housing?.humidity} /><StatCard icon="home" label="Last cleaned" value={`${selected.housing?.lastCleaned?.date || "-"} - ${selected.housing?.lastCleaned?.type || ""}`} /><StatCard icon="qr" label="Housing QR" value={selectedAnimalLocation?.qrCode || "No location"} /></div><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="grid gap-4 p-4 sm:p-5 md:grid-cols-2"><Field label="Assigned housing location"><Select value={selected.housing?.locationId || ""} onChange={(event) => assignSelectedAnimalToLocation(event.target.value)}><option value="">No linked location</option>{housingLocations.map((location) => <option key={location.id} value={location.id}>{location.name} - {location.qrCode}</option>)}</Select></Field><Field label="Enclosure / housing location"><Input value={selected.housing?.enclosure || ""} onChange={(event) => updateSelected("housing.enclosure", event.target.value)} /></Field><Field label="Bedding type"><Select value={selected.housing?.bedding || "Aspen"} onChange={(event) => updateSelected("housing.bedding", event.target.value)}>{BEDDING_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field><Field label="Temperature"><Input value={selected.housing?.temperature || ""} onChange={(event) => updateSelected("housing.temperature", event.target.value)} /></Field><Field label="Humidity"><Input value={selected.housing?.humidity || ""} onChange={(event) => updateSelected("housing.humidity", event.target.value)} /></Field><Field label="Last cleaned"><Input type="date" value={selected.housing?.lastCleaned?.date || ""} onChange={(event) => updateSelected("housing.lastCleaned.date", event.target.value)} /></Field><Field label="Clean type"><Select value={selected.housing?.lastCleaned?.type || "Partial clean"} onChange={(event) => updateSelected("housing.lastCleaned.type", event.target.value)}>{CLEAN_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field><Field label="Cleaning note"><Textarea value={selected.housing?.lastCleaned?.note || ""} onChange={(event) => updateSelected("housing.lastCleaned.note", event.target.value)} /></Field><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end"><Button variant="outline" onClick={() => { if (selected.housing?.locationId) { setSelectedLocationId(selected.housing.locationId); setShowLocationQr(true); } }} className="rounded-xl" disabled={!selected.housing?.locationId}><Icon name="qr" className="mr-2 h-4 w-4" /> View location QR</Button><Button onClick={() => { addLog("cleaning", `${selected.housing?.lastCleaned?.type || "Clean"} - ${selected.housing?.lastCleaned?.note || "housing cleaned"}`); if (selected.housing?.locationId) addHousingLocationLog(selected.housing.locationId, "cleaning", `${selected.housing?.lastCleaned?.type || "Clean"} - ${selected.housing?.lastCleaned?.note || "housing cleaned"}`); }} className="rounded-xl"><Icon name="save" className="mr-2 h-4 w-4" /> Save housing log</Button></div></CardContent></Card></section>
            )}

            {activeTab === "breeding" && (
              <section className="grid gap-4 xl:grid-cols-[1fr_380px]"><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-5"><h3 className="flex items-center gap-2 text-xl font-bold"><Icon name="heart" /> Breeding groups</h3>{breedingGroups.map((group) => <div key={group.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h4 className="font-bold">{group.name}</h4><p className="text-sm text-slate-500">{group.id} - active animals only for egg creation</p><div className="mt-3 flex flex-wrap gap-2">{group.animalIds.map((id) => <span key={id} className={`rounded-full px-3 py-1 text-sm ${isActiveProfile(animalMap[id]) ? "bg-slate-100" : "bg-slate-200 text-slate-500"}`}>{animalMap[id]?.name || id}{!isActiveProfile(animalMap[id]) ? " - inactive" : ""}</span>)}</div><p className="mt-3 text-sm text-slate-600">{group.notes || "No notes"}</p></div><div className="flex flex-col gap-2 text-left sm:text-right"><Button onClick={() => createEggProfile(group)} className="w-full rounded-xl sm:w-auto" disabled={!canCreateEggFromGroup(group, animalMap)}><Icon name="egg" className="mr-2 h-4 w-4" /> Eggs found</Button><Button variant="outline" onClick={() => deleteBreedingGroup(group.id)} className="w-full rounded-xl sm:w-auto"><Icon name="close" className="mr-2 h-4 w-4" /> Delete group</Button>{!canCreateEggFromGroup(group, animalMap) && <p className="max-w-full text-xs text-slate-500 sm:max-w-56">Egg profiles require at least one active female dam and one active male sire in the group.</p>}</div></div></div>)}</CardContent></Card><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-5"><h3 className="font-bold">Create breeding group</h3><Field label="Group name"><Input value={groupDraft.name} onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })} /></Field><div className="space-y-2"><p className="text-sm font-medium text-slate-700">Select 2 to 4 active animals</p>{activeAnimals.map((animal) => <button key={animal.id} onClick={() => toggleGroupAnimal(animal.id)} className={`flex w-full items-center justify-between rounded-xl border p-2 text-left text-sm ${groupDraft.animalIds.includes(animal.id) ? "border-slate-900 bg-slate-100" : "border-slate-200 bg-white"}`}><span>{animal.name} - {animal.sex}</span><span>{groupDraft.animalIds.includes(animal.id) ? "Selected" : "Add"}</span></button>)}</div><Field label="Pairing notes"><Textarea value={groupDraft.notes} onChange={(event) => setGroupDraft({ ...groupDraft, notes: event.target.value })} /></Field><Button onClick={createBreedingGroup} className="w-full rounded-xl py-5 sm:py-2" disabled={groupDraft.animalIds.length < 2}>Create group</Button></CardContent></Card></section>
            )}

            {activeTab === "egg" && selected.stage === "egg" && (
              <section className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><StatCard icon="egg" label="Date laid" value={selected.dateLaid} /><StatCard icon="baby" label="Approx. hatch" value={selected.approximateHatchDate} /><StatCard icon="branch" label="Pedigree" value={`${parentName(selected.pedigree, "sire") || "-"} x ${parentName(selected.pedigree, "dam") || "-"}`} /></div><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="grid gap-4 p-4 sm:p-5 md:grid-cols-2"><Field label="Egg name"><Input value={selected.name} onChange={(event) => updateSelected("name", event.target.value)} /></Field><Field label="Expected / observed morph"><Input value={selected.morph || ""} onChange={(event) => updateSelected("morph", event.target.value)} /></Field><Field label="Date laid"><Input type="date" value={selected.dateLaid || ""} onChange={(event) => updateSelected("dateLaid", event.target.value)} /></Field><Field label="Approximate hatch date"><Input type="date" value={selected.approximateHatchDate || ""} onChange={(event) => updateSelected("approximateHatchDate", event.target.value)} /></Field><Field label="Possible sire"><Select value={selected.selectedParents?.sire || ""} onChange={(event) => updateEggParent("sire", event.target.value)}>{(selected.possibleParents?.sire || []).filter((id) => isActiveProfile(animalMap[id])).map((id) => <option key={id} value={id}>{animalMap[id]?.name || id}</option>)}</Select></Field><Field label="Possible dam"><Select value={selected.selectedParents?.dam || ""} onChange={(event) => updateEggParent("dam", event.target.value)}>{(selected.possibleParents?.dam || []).filter((id) => isActiveProfile(animalMap[id])).map((id) => <option key={id} value={id}>{animalMap[id]?.name || id}</option>)}</Select></Field><div className="md:col-span-2 flex justify-end"><Button onClick={hatchEgg} className="rounded-xl"><Icon name="baby" className="mr-2 h-4 w-4" /> Mark as hatched</Button></div></CardContent></Card></section>
            )}

            {activeTab === "logs" && (
              <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="space-y-3 p-5"><h3 className="text-xl font-bold">Activity log</h3>{(selected.logs || []).length === 0 && <p className="text-sm text-slate-500">No logs yet.</p>}{(selected.logs || []).map((log, index) => <div key={`${log.date}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="font-semibold capitalize">{log.type}</span><span className="text-sm text-slate-500">{log.date}</span></div><p className="mt-2 text-sm text-slate-600">{log.summary}</p></div>)}</CardContent></Card>
            )}
          </main>
        </section>
      </div>

     {showQr && selected && (
      <ProfileQrModal
        selected={selected}
        onClose={() => setShowQr(false)}
      />
    )}

      {showLocationQr && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"><Card className="max-h-[92vh] w-full max-w-md overflow-auto rounded-t-3xl border-slate-200 shadow-2xl sm:rounded-3xl"><CardContent className="space-y-5 p-4 text-center sm:p-6"><div className="flex items-center justify-between gap-4 text-left"><div><h3 className="flex items-center gap-2 text-2xl font-bold"><Icon name="qr" className="h-6 w-6" /> Housing QR code</h3><p className="text-sm text-slate-500">{selectedLocation.name} - {selectedLocation.id}</p></div><Button variant="ghost" onClick={() => setShowLocationQr(false)} className="rounded-xl"><Icon name="close" className="h-5 w-5" /></Button></div><div className="mx-auto w-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid grid-cols-[repeat(13,12px)] gap-0.5 rounded-xl bg-white p-3 ring-1 ring-slate-900">{buildQrCells(selectedLocation.qrCode).map((filled, index) => <span key={index} className={`h-3 w-3 ${filled ? "bg-slate-900" : "bg-white"}`} />)}</div><p className="mt-4 text-xl font-bold tracking-wide">{selectedLocation.qrCode}</p><p className="text-xs text-slate-500">Unique code for this housing location</p></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowLocationQr(false)} className="rounded-xl">Close</Button><Button onClick={printLocationQrCode} className="rounded-xl"><Icon name="save" className="mr-2 h-4 w-4" /> Print QR code</Button></div></CardContent></Card></div>
      )}

      {showPedigree && selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"><Card className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-t-3xl border-slate-200 shadow-2xl sm:rounded-3xl"><CardContent className="space-y-5 p-4 sm:p-6"><div className="flex items-center justify-between gap-4"><div><h3 className="flex items-center gap-2 text-2xl font-bold"><Icon name="branch" className="h-6 w-6" /> Editable 4-generation pedigree</h3><p className="text-sm text-slate-500">Track parents, grandparents, great-grandparents, and great-great-grandparents for {selected.name}.</p></div><Button variant="ghost" onClick={() => setShowPedigree(false)} className="rounded-xl"><Icon name="close" className="h-5 w-5" /></Button></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-100 p-4 text-center"><p className="text-xs uppercase tracking-widest text-slate-500">Sire</p><p className="mt-2 text-lg font-bold">{parentName(selected.pedigree, "sire") || "Unknown"}</p></div><div className="rounded-2xl bg-white p-4 text-center ring-1 ring-slate-200"><p className="text-xs uppercase tracking-widest text-slate-500">Animal / Egg</p><p className="mt-2 text-lg font-bold">{selected.name}</p></div><div className="rounded-2xl bg-slate-100 p-4 text-center"><p className="text-xs uppercase tracking-widest text-slate-500">Dam</p><p className="mt-2 text-lg font-bold">{parentName(selected.pedigree, "dam") || "Unknown"}</p></div></div><div className="space-y-4"><div className="rounded-3xl border border-slate-200 bg-white p-4"><div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h4 className="font-bold">Link parents and auto-fill child pedigree</h4><p className="text-sm text-slate-500">Choose an existing active male sire and active female dam.</p></div><Button variant="outline" onClick={refillSelectedPedigreeFromParents} className="rounded-xl"><Icon name="branch" className="mr-2 h-4 w-4" /> Refill from linked parents</Button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Linked sire - active male only"><Select value={selected.selectedParents?.sire || getLinkedSireId(selected, animalMap)} onChange={(event) => linkParentAndAutofill("sire", event.target.value)}><option value="">Select sire</option>{activeAnimals.filter((animal) => animal.id !== selected.id && animal.sex === "Male").map((animal) => <option key={animal.id} value={animal.id}>{animal.name} - {animal.id}</option>)}</Select></Field><Field label="Linked dam - active female only"><Select value={selected.selectedParents?.dam || getLinkedDamId(selected, animalMap)} onChange={(event) => linkParentAndAutofill("dam", event.target.value)}><option value="">Select dam</option>{activeAnimals.filter((animal) => animal.id !== selected.id && animal.sex === "Female").map((animal) => <option key={animal.id} value={animal.id}>{animal.name} - {animal.id}</option>)}</Select></Field></div></div><div className="rounded-3xl border border-slate-200 bg-white p-4"><h4 className="mb-3 font-bold">Generation 1 - Parents</h4><div className="grid gap-4 sm:grid-cols-2"><PedigreeInput pedigree={selected.pedigree} path={["sire"]} label="Sire" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["dam"]} label="Dam" onChange={updatePedigreeName} /></div></div><div className="rounded-3xl border border-slate-200 bg-white p-4"><h4 className="mb-3 font-bold">Generation 2 - Grandparents</h4><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><PedigreeInput pedigree={selected.pedigree} path={["sire", "sire"]} label="Sire's sire" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["sire", "dam"]} label="Sire's dam" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["dam", "sire"]} label="Dam's sire" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["dam", "dam"]} label="Dam's dam" onChange={updatePedigreeName} /></div></div><div className="rounded-3xl border border-slate-200 bg-white p-4"><h4 className="mb-3 font-bold">Generation 3 - Great-grandparents</h4><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><PedigreeInput pedigree={selected.pedigree} path={["sire", "sire", "sire"]} label="Sire's sire's sire" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["sire", "sire", "dam"]} label="Sire's sire's dam" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["sire", "dam", "sire"]} label="Sire's dam's sire" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["sire", "dam", "dam"]} label="Sire's dam's dam" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["dam", "sire", "sire"]} label="Dam's sire's sire" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["dam", "sire", "dam"]} label="Dam's sire's dam" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["dam", "dam", "sire"]} label="Dam's dam's sire" onChange={updatePedigreeName} /><PedigreeInput pedigree={selected.pedigree} path={["dam", "dam", "dam"]} label="Dam's dam's dam" onChange={updatePedigreeName} /></div></div><div className="rounded-3xl border border-slate-200 bg-white p-4"><h4 className="mb-3 font-bold">Generation 4 - Great-great-grandparents</h4><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["sire","sire","sire","sire"],["sire","sire","sire","dam"],["sire","sire","dam","sire"],["sire","sire","dam","dam"],["sire","dam","sire","sire"],["sire","dam","sire","dam"],["sire","dam","dam","sire"],["sire","dam","dam","dam"],["dam","sire","sire","sire"],["dam","sire","sire","dam"],["dam","sire","dam","sire"],["dam","sire","dam","dam"],["dam","dam","sire","sire"],["dam","dam","sire","dam"],["dam","dam","dam","sire"],["dam","dam","dam","dam"]].map((path) => <PedigreeInput key={path.join("")} pedigree={selected.pedigree} path={path} label={path.map((part) => part === "sire" ? "S" : "D").join("")} onChange={updatePedigreeName} />)}</div></div><div className="rounded-3xl border border-slate-200 bg-white p-4"><Field label="Pedigree notes"><Textarea value={normalizePedigree(selected.pedigree).notes || ""} onChange={(event) => updatePedigreeNotes(event.target.value)} /></Field></div></div><div className="flex flex-col gap-2 md:flex-row md:justify-end"><Button variant="outline" onClick={refillSelectedPedigreeFromParents} className="rounded-xl"><Icon name="branch" className="mr-2 h-4 w-4" /> Auto-fill from selected parents</Button><Button onClick={() => setShowPedigree(false)} className="rounded-xl"><Icon name="save" className="mr-2 h-4 w-4" /> Save pedigree</Button></div></CardContent></Card></div>
      )}

      {showDeleteConfirm && selected && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">Delete animal?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove <strong>{selected.name}</strong> from animals/eggs and remove it from breeding groups.
            </p>

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={deleteSelectedAnimal}
                className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700"
                disabled={animals.length <= 1}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
  <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-900/70 p-0 sm:items-center sm:p-4">
    <Card className="max-h-[92vh] w-full max-w-md overflow-auto rounded-t-3xl border-slate-200 shadow-2xl sm:rounded-3xl">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">Scan QR</h3>
            <p className="text-sm text-slate-500">
              Point the camera at an animal, egg, or housing QR code.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => setShowScanner(false)}
            className="rounded-xl"
          >
            <Icon name="close" className="h-5 w-5" />
          </Button>
        </div>

        <QrScanner
          onScan={(value) => {
            setScanValue(value);
            const opened = openScannedCode(value);
            if (opened) setShowScanner(false);
          }}
        />
      </CardContent>
    </Card>
  </div>
)}
      
     {realQrProfile && (
      <ProfileQrModal
        selected={realQrProfile}
        onClose={() => setRealQrProfile(null)}
       />
      )}
    </div>
  );
}
