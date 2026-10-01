import {
  customType,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: string }>({
  dataType: () => "bytea",
  toDriver: (v) => "\\x" + v.toString("hex"),
  fromDriver: (v) => Buffer.from(v.replace(/^\\x/, ""), "hex"),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: date("dob").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  phone: text("phone").notNull(),
});

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  drugName: text("drug_name").notNull(),
  strength: text("strength").notNull(),
  directions: text("directions").notNull(),
  quantity: integer("quantity").notNull(),
  daysSupply: integer("days_supply").notNull(),
  status: text("status").notNull().default("active"),
  diagnosis: text("diagnosis").notNull(),
  prescriber: text("prescriber").notNull(),
  startDate: date("start_date").notNull(),
});

export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  drugName: text("drug_name").notNull(),
  strength: text("strength").notNull(),
  directions: text("directions"),
  fillDate: date("fill_date").notNull(),
  daysSupply: integer("days_supply").notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("paid"),
});

export const charts = pgTable("charts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  filename: text("filename").notNull(),
  pdf: bytea("pdf").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});
