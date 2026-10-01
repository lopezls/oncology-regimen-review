/**
 * Synthetic patients. Each scenario is built to trip (or pass) specific
 * lenalidomide rule checks so the demo and the unit tests share one source.
 * All names, numbers and addresses are fictional.
 */
import type { CheckStatus } from "../src/rules/types";

export interface Scenario {
  key: string;
  description: string;
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
  rx: {
    drugName: string;
    strength: string;
    directions: string;
    quantity: number;
    daysSupply: number;
    diagnosis: string;
    prescriber: string;
    startDate: string;
  };
  claims: {
    drugName: string;
    strength: string;
    directions: string | null;
    fillDate: string;
    daysSupply: number;
    quantity: number;
    status: string;
  }[];
  chart: ChartData;
  /** expected check statuses (ids from lenalidomide rules) */
  expected: Record<string, CheckStatus>;
}

export interface ChartData {
  diagnosisLine: string | null; // null = omitted from chart
  crcl: number | null;
  anc: string | null;
  platelets: string | null;
  rems: string | null;
  meds: string[];
  plan: string[];
  weightKg: number;
  scr: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (today: Date, n: number) =>
  iso(new Date(today.getTime() - n * 86_400_000));

export function buildScenarios(today: Date): Scenario[] {
  const ago = (n: number) => daysAgo(today, n);

  const len = (strength: string, fillAgo: number) => ({
    drugName: "Lenalidomide",
    strength,
    directions: `Take 1 capsule daily days 1-21 of each 28-day cycle`,
    fillDate: ago(fillAgo),
    daysSupply: 28,
    quantity: 21,
    status: "paid",
  });
  const dex = (weeklyMg: number, fillAgo: number) => ({
    drugName: "Dexamethasone",
    strength: "4 mg",
    directions: `Take ${weeklyMg} mg (${weeklyMg / 4} x 4 mg tablets) by mouth once weekly`,
    fillDate: ago(fillAgo),
    daysSupply: 28,
    quantity: (weeklyMg / 4) * 4,
    status: "paid",
  });
  const asa = (fillAgo: number) => ({
    drugName: "Aspirin EC",
    strength: "81 mg",
    directions: "Take 1 tablet daily",
    fillDate: ago(fillAgo),
    daysSupply: 30,
    quantity: 30,
    status: "paid",
  });
  const apixaban = (fillAgo: number) => ({
    drugName: "Apixaban",
    strength: "2.5 mg",
    directions: "Take 1 tablet twice daily",
    fillDate: ago(fillAgo),
    daysSupply: 30,
    quantity: 60,
    status: "paid",
  });
  const metformin = (fillAgo: number) => ({
    drugName: "Metformin",
    strength: "500 mg",
    directions: "Take 1 tablet twice daily with meals",
    fillDate: ago(fillAgo),
    daysSupply: 30,
    quantity: 60,
    status: "paid",
  });
  const lisinopril = (fillAgo: number) => ({
    drugName: "Lisinopril",
    strength: "10 mg",
    directions: "Take 1 tablet daily",
    fillDate: ago(fillAgo),
    daysSupply: 30,
    quantity: 30,
    status: "paid",
  });

  const mmDx = "Multiple myeloma, IgG kappa (ICD-10 C90.00)";
  const rems = "REVLIMID REMS authorization on file - approved";
  const baseRx = (strength: string, prescriber: string, startAgo: number) => ({
    drugName: "Lenalidomide",
    strength,
    directions: "Take 1 capsule by mouth daily on days 1-21 of each 28-day cycle",
    quantity: 21,
    daysSupply: 28,
    diagnosis: "Multiple myeloma",
    prescriber,
    startDate: ago(startAgo),
  });

  return [
    {
      key: "complete",
      description: "Complete regimen, correct doses",
      patient: {
        firstName: "Maria", lastName: "Gonzalez", dob: "1957-03-14",
        address: "412 Maple Ridge Dr", city: "Columbus", state: "OH", zip: "43215",
        phone: "(614) 555-0142",
      },
      rx: baseRx("25 mg", "Dr. Anita Rao, MD", 180),
      claims: [len("25 mg", 10), dex(40, 10), asa(10), metformin(12), lisinopril(5)],
      chart: {
        diagnosisLine: mmDx, crcl: 78, anc: "2.4 x10^9/L", platelets: "198 x10^9/L",
        rems, weightKg: 71, scr: 0.9,
        meds: ["Lenalidomide 25 mg daily d1-21 q28d", "Dexamethasone 40 mg weekly", "Aspirin 81 mg daily", "Metformin 500 mg BID", "Lisinopril 10 mg daily"],
        plan: ["Continue lenalidomide + dexamethasone.", "Aspirin for VTE prophylaxis.", "Monthly CBC."],
      },
      expected: {
        diagnosis: "pass", steroid: "pass", "steroid-dose": "pass", vte: "pass",
        dose: "pass", labs: "pass", rems: "pass", refill: "pass",
      },
    },
    {
      key: "no-dex",
      description: "Dexamethasone planned in chart but never filled",
      patient: {
        firstName: "Robert", lastName: "Chen", dob: "1960-11-02",
        address: "88 Harbor View Ln", city: "Dayton", state: "OH", zip: "45402",
        phone: "(937) 555-0177",
      },
      rx: baseRx("25 mg", "Dr. Anita Rao, MD", 30),
      claims: [len("25 mg", 8), asa(8), lisinopril(8)],
      chart: {
        diagnosisLine: mmDx, crcl: 85, anc: "3.0 x10^9/L", platelets: "240 x10^9/L",
        rems, weightKg: 82, scr: 0.9,
        meds: ["Lenalidomide 25 mg daily d1-21 q28d", "Aspirin 81 mg daily", "Lisinopril 10 mg daily"],
        plan: ["Start lenalidomide with dexamethasone 40 mg weekly.", "Aspirin for VTE prophylaxis."],
      },
      expected: {
        diagnosis: "pass", steroid: "fail", "steroid-dose": "unknown", vte: "pass",
        dose: "pass", labs: "pass", rems: "pass", refill: "pass",
      },
    },
    {
      key: "no-vte",
      description: "No aspirin / anticoagulant anywhere",
      patient: {
        firstName: "Dorothy", lastName: "Williams", dob: "1954-07-29",
        address: "1507 Lakeshore Blvd", city: "Cleveland", state: "OH", zip: "44113",
        phone: "(216) 555-0119",
      },
      rx: baseRx("25 mg", "Dr. Samuel Brooks, MD", 120),
      claims: [len("25 mg", 12), dex(40, 12), metformin(15)],
      chart: {
        diagnosisLine: mmDx, crcl: 66, anc: "2.1 x10^9/L", platelets: "175 x10^9/L",
        rems, weightKg: 64, scr: 0.9,
        meds: ["Lenalidomide 25 mg daily d1-21 q28d", "Dexamethasone 40 mg weekly", "Metformin 500 mg BID"],
        plan: ["Continue lenalidomide + dexamethasone.", "Monthly CBC."],
      },
      expected: {
        diagnosis: "pass", steroid: "pass", "steroid-dose": "pass", vte: "fail",
        dose: "pass", labs: "pass", rems: "pass", refill: "pass",
      },
    },
    {
      key: "renal-high-dose",
      description: "CrCl 38 but prescribed 25 mg (should be ~10 mg)",
      patient: {
        firstName: "James", lastName: "Patel", dob: "1949-01-21",
        address: "77 Cedar Court", city: "Toledo", state: "OH", zip: "43604",
        phone: "(419) 555-0188",
      },
      rx: baseRx("25 mg", "Dr. Samuel Brooks, MD", 60),
      claims: [len("25 mg", 15), dex(20, 15), apixaban(15), lisinopril(20)],
      chart: {
        diagnosisLine: mmDx, crcl: 38, anc: "1.9 x10^9/L", platelets: "150 x10^9/L",
        rems, weightKg: 69, scr: 1.8,
        meds: ["Lenalidomide 25 mg daily d1-21 q28d", "Dexamethasone 20 mg weekly", "Apixaban 2.5 mg BID", "Lisinopril 10 mg daily"],
        plan: ["Continue current regimen.", "Recheck renal function in 4 weeks."],
      },
      expected: {
        diagnosis: "pass", steroid: "pass", "steroid-dose": "pass", vte: "pass",
        dose: "fail", labs: "pass", rems: "pass", refill: "pass",
      },
    },
    {
      key: "thin-chart",
      description: "Chart lacks diagnosis, labs and REMS documentation",
      patient: {
        firstName: "Linda", lastName: "Okafor", dob: "1962-09-08",
        address: "230 Birchwood Ave", city: "Cincinnati", state: "OH", zip: "45202",
        phone: "(513) 555-0163",
      },
      rx: baseRx("25 mg", "Dr. Priya Natarajan, MD", 14),
      claims: [len("25 mg", 4), dex(40, 4), asa(4)],
      chart: {
        diagnosisLine: null, crcl: null, anc: null, platelets: null, rems: null,
        weightKg: 75, scr: 0.8,
        meds: ["Lenalidomide 25 mg daily d1-21 q28d", "Dexamethasone 40 mg weekly", "Aspirin 81 mg daily"],
        plan: ["Referral note only. See attached records."],
      },
      expected: {
        diagnosis: "fail", steroid: "pass", "steroid-dose": "pass", vte: "pass",
        dose: "unknown", labs: "fail", rems: "fail", refill: "pass",
      },
    },
    {
      key: "elderly-overdue",
      description: "Age 78 on 40 mg dex (high), lenalidomide refill overdue",
      patient: {
        firstName: "Harold", lastName: "Jensen", dob: "1948-05-17",
        address: "9 Willow Creek Rd", city: "Akron", state: "OH", zip: "44308",
        phone: "(330) 555-0124",
      },
      rx: baseRx("10 mg", "Dr. Priya Natarajan, MD", 240),
      claims: [len("10 mg", 50), dex(40, 20), apixaban(20), metformin(20)],
      chart: {
        diagnosisLine: mmDx, crcl: 45, anc: "1.7 x10^9/L", platelets: "132 x10^9/L",
        rems, weightKg: 77, scr: 1.4,
        meds: ["Lenalidomide 10 mg daily d1-21 q28d", "Dexamethasone 40 mg weekly", "Apixaban 2.5 mg BID", "Metformin 500 mg BID"],
        plan: ["Continue lenalidomide at renally adjusted dose.", "Reinforce adherence."],
      },
      expected: {
        diagnosis: "pass", steroid: "pass", "steroid-dose": "warn", vte: "pass",
        dose: "pass", labs: "pass", rems: "pass", refill: "warn",
      },
    },
  ];
}
