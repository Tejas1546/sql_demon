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
