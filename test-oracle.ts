import { DB } from "./src/core/db.js";
import { OracleSqlDriver } from "./src/drivers/oracle.driver.js";

// Connection credentials matching the APP_USER / APP_USER_PASSWORD set in docker-compose.yml.
// connectString format: "host:port/serviceName"
const oracleConfig = {
  user: "orm_user",
  password: "orm_pass_123",
  connectString: "localhost:1521/FREEPDB1",
};

// Register the Oracle driver as the active database driver for this smoke test.
DB.setDriver(new OracleSqlDriver(oracleConfig));

// Smoke test that verifies:
//   1. The Oracle Docker container is reachable and accepting connections.
//   2. The OracleSqlDriver's connect() and execute() methods work correctly.
//   3. The result is returned in the expected { rows, affectedRows } shape.
//
// Note: Oracle requires a FROM clause on every SELECT — "FROM DUAL" is Oracle's
// built-in dummy table used when no real table is needed.
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
    // Always close the connection, even if the query failed.
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
