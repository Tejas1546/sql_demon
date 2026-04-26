import { DB } from "./src/core/db.js";
import { PostgreSqlDriver } from "./src/drivers/postgresql.driver.js";
import { Employee } from "./src/entities/employee.entity.js";
import { User } from "./src/entities/user.entity.js";

// Build the PostgreSQL connection string from environment variables.
// Falls back to sensible local development defaults if env vars are not set.
const connectionString = `postgresql://${process.env["DB_USER"] ?? "postgres"}:${process.env["DB_PASSWORD"] ?? "postgres"}@${process.env["DB_HOST"] ?? "localhost"}:${process.env["DB_PORT"] ?? "5432"}/${process.env["DB_NAME"] ?? "appdb"}`;

// Register the PostgreSQL driver as the active database driver.
// All entity operations (save, findAll, etc.) will use this driver from this point on.
DB.setDriver(new PostgreSqlDriver(connectionString));

async function bootstrap(): Promise<void> {
  try {
    await DB.driver.connect();
    console.log("Connected to database");

    // --- User example ---
    // Create a new User instance and persist it to the "users" table.
    const newUser = new User({
      name: "John Doe",
      address: "123 Main St",
      dob: new Date("1990-01-01"),
      email: "john.doe@example.com",
      createdAt: new Date(),
      createdBy: 1,
      updatedAt: new Date(),
      updatedBy: 1,
    });
    await newUser.save(); // Runs an upsert; newUser.id is populated after this call.

    // Fetch all users from the database and log them.
    const foundUser = await User.findAll();
    console.log(foundUser);

    // --- Employee example ---
    // Create a new Employee instance and persist it to the "employees" table.
    const newEmployee = new Employee({
      name: "Jane Smith",
      position: "Software Engineer",
      department: "Engineering",
      salary: 90000,
      createdAt: new Date(),
      createdBy: 1,
      updatedAt: new Date(),
      updatedBy: 1,
    });
    await newEmployee.save(); // Runs an upsert; newEmployee.id is populated after this call.

    // Fetch the employee with id = 1 and log it.
    const foundEmployee = await Employee.findById(1);
    console.log(foundEmployee);

  } catch (err) {
    console.error("Application startup failed:", err);
  } finally {
    // Always disconnect cleanly, even if an error occurred.
    try {
      await DB.driver.disconnect();
      console.log("Disconnected from database");
    } catch (err) {
      console.error("Error disconnecting from database:", err);
    }
  }
}

void bootstrap();
