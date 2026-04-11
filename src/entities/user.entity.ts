import { BaseEntitiy, type IBaseEntity } from "./base.entitiy.js";
import { Table } from "./table.decorator.js";

interface IUser extends IBaseEntity {
  name: string;
  address: string;
  dob: Date;
  email: string;
}

@Table("users")
export class User extends BaseEntitiy implements IUser {
  private static TABLE_NAME = "users";
  name: string;
  address: string;
  dob: Date;
  email: string;

  constructor(user: IUser) {
    super(user);
    this.name = user.name;
    this.address = user.address;
    this.dob = user.dob;
    this.email = user.email;
  }
}
