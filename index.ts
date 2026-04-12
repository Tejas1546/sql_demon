import { User } from "./src/entities/user.entity.js";
import { DB } from "./src/core/db.js";
import { MySqlDriver } from "./src/driver/mysql.driver.js";

async function runTests() {
  // --- 1. Instantiate a new User ---
  const dummyUser = new User({
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 123,
    updatedBy: 456,
    name: "John Doe",
    address: "123 Main Street, Mumbai",
    dob: new Date("1995-06-15"),
    email: "john.doe@example.com",
  });

  await dummyUser.save();
  console.log("\n");

  await User.findById(1);
  console.log("\n");

  await User.findAll();
  console.log("\n");

  await User.delete({ condition: { id: 1 }, limit: 1 });
  console.log("\n");

  await User.findOne({ name: "John Doe", email: "john.doe@example.com" });
  console.log("\n");

  await User.delete({
    condition: { name: "John Doe", email: "john.doe@example.com" },
    limit: 1,
  });
  console.log("\n");

  dummyUser.address = "456 Side Street, Delhi";
  await dummyUser.save();
  console.log("\n");

  await User.update(
    { name: "Jane Doe", email: "jane.doe@example.com" },
    { condition: { id: 1 }, limit: 1 },
  );
  console.log("\n");
}

async function testDriver() {
  const driver = new MySqlDriver();
  DB.setDriver(driver);

  await DB.driver.connect();

  const insertQuery = DB.driver.getInsertQuery("users", ["name", "email", "age"]);
  console.log(insertQuery);

  DB.driver.getUpdateQuery("users", ["name", "email"], { id: 1 });
  DB.driver.getSelectQuery("users", ["name", "email"], { age: 25 }, 10, 0);
  DB.driver.getDeleteQuery("users", { id: 1 }, 1);
  DB.driver.getCountQuery("users", { role: "admin" });

  await DB.driver.execute("SELECT 1;");
  await DB.driver.disconnect();
}

// Execute the tests
async function main() {
  await testDriver();
  await runTests();
}

main().catch((error) => {
  console.error("Test execution failed:", error);
});
