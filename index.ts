import { User } from "./src/entities/user.entity.js";

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

  await User.deleteById(1);
  console.log("\n");

  await User.findOne({ name: "John Doe", email: "john.doe@example.com" });
  console.log("\n");

  await User.deleteOne({ name: "John Doe", email: "john.doe@example.com" });
  console.log("\n");

  dummyUser.address = "456 Side Street, Delhi";
  await dummyUser.save();
  console.log("\n");

  await User.updateOne(
    { id: 1 },
    { name: "Jane Doe", email: "jane.doe@example.com" },
  );
  console.log("\n");
}

// Execute the tests
runTests().catch((error) => {
  console.error("Test execution failed:", error);
});
