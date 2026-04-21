import { DB } from "./src/core/db.js";
import { OracleSqlDriver } from "./src/drivers/oracle.driver.js";

// Match the credentials from your docker-compose.yml
const oracleConfig = {
  user: "orm_user",
  password: "orm_pass_123",
  connectString: "localhost:1521/FREEPDB1"
};

// 1. Inject the new driver
DB.setDriver(new OracleSqlDriver(oracleConfig));

async function smokeTest() {
  try {
    console.log("⏳ Connecting to Oracle in Docker...");
    await DB.driver.connect();
    console.log("✅ Connection established!");

    console.log("⏳ Executing smoke test query...");
    const result = await DB.driver.execute("SELECT 'Oracle ORM is alive!' AS status FROM DUAL");
    console.log("✅ Query successful. Result:", result.rows);

  } catch (err) {
    console.error("❌ Smoke test failed:", err);
  } finally {
    try {
      console.log("⏳ Disconnecting...");
      await DB.driver.disconnect();
      console.log("✅ Disconnected safely.");
    } catch (err) {
      console.error("Error during disconnect:", err);
    }
  }
}

void smokeTest();