import oracledb from "oracledb";

async function testConnection() {
  let connection;

  try {
    console.log("Attempting to connect to Oracle...");

    // Connect using the specific user we created in the docker-compose file
    connection = await oracledb.getConnection({
      user: "orm_user",
      password: "orm_pass_123",
      // Host : Port / ServiceName
      connectString: "localhost:1521/FREEPDB1",
    });

    console.log("✅ Successfully connected to Oracle!");

    // Another Oracle Quirk: You can't just run "SELECT 1".
    // Oracle requires a FROM clause. We use the dummy table "DUAL".
    const result = await connection.execute("SELECT 1 AS status FROM DUAL");
    console.log("Database says:", result.rows);
  } catch (err) {
    console.error("❌ Connection failed:", err);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log("Connection closed.");
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}

testConnection();
