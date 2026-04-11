import { User } from "./src/entities/user.entity.js";

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

console.log(dummyUser);

await dummyUser.save();

await User.findById(1);

await User.findAll();

await User.deleteById(1);

await User.findOne({ name: "John Doe", email: "john.doe@example.com" });

await User.deleteOne({ name: "John Doe", email: "john.doe@example.com" });

dummyUser.address = "456 Side Street, Delhi";
await dummyUser.update();

await User.update({ id: 1 }, { name: "Jane Doe", email: "jane.doe@example.com" });
