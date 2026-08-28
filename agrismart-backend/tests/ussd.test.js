const { applySchema, truncateAll, closeAdmin } = require("./helpers/db");
const request = require("supertest");
const { createApp } = require("../src/app");

const app = createApp();

beforeAll(async () => {
  await applySchema();
  await truncateAll();
});

afterAll(async () => {
  await closeAdmin();
});

async function ussd(sessionId, phone, text) {
  const res = await request(app).post("/ussd").send({ sessionId, phoneNumber: phone, text });
  return res;
}

describe("USSD buyer registration (required buyer_type + optional follow-ups)", () => {
  const phone = "+233247771001";
  const sess = "ussd-buyer-test";

  test("walk through the buyer menu to a completed registration", async () => {
    let r = await ussd(sess, phone, "");
    expect(r.text).toContain("AgriSmart");

    r = await ussd(sess, phone, "1");
    expect(r.text).toContain("full name");

    r = await ussd(sess, phone, "1*Kojo Buyer");
    expect(r.text).toContain("role");

    r = await ussd(sess, phone, "1*Kojo Buyer*2"); // Buyer
    expect(r.text).toContain("town/market");

    r = await ussd(sess, phone, "1*Kojo Buyer*2*Kumasi");
    // buyer_type is REQUIRED here (FR-1.4)
    expect(r.text).toContain("What type of buyer");
    expect(r.text).toContain("Wholesale");

    r = await ussd(sess, phone, "1*Kojo Buyer*2*Kumasi*9"); // invalid type -> re-prompt
    expect(r.text).toContain("Invalid choice");

    r = await ussd(sess, phone, "1*Kojo Buyer*2*Kumasi*9*1"); // wholesale
    expect(r.text).toContain("crops you usually buy");

    r = await ussd(sess, phone, "1*Kojo Buyer*2*Kumasi*9*1*tomato,maize");
    expect(r.text).toContain("preferred language");

    r = await ussd(sess, phone, "1*Kojo Buyer*2*Kumasi*9*1*tomato,maize*0"); // skip language
    expect(r.text).toContain("Registration complete");
    expect(r.text).toContain("wholesale buyer");
    expect(r.text).toContain("tomato, maize");
  });
});

describe("USSD farmer registration (unchanged 3-step + optional)", () => {
  const phone = "+233247771002";
  const sess = "ussd-farmer-test";

  test("farmer registers with crops and language", async () => {
    await ussd(sess, phone, "1");
    await ussd(sess, phone, "1*Ama");
    await ussd(sess, phone, "1*Ama*1"); // Farmer
    const loc = await ussd(sess, phone, "1*Ama*1*Kasoa");
    expect(loc.text).toContain("crops you grow");
    await ussd(sess, phone, "1*Ama*1*Kasoa*tomato,maize");
    const done = await ussd(sess, phone, "1*Ama*1*Kasoa*tomato,maize*2"); // Twi
    expect(done.text).toContain("Registration complete");
    expect(done.text).toContain("farmer");
  });
});
