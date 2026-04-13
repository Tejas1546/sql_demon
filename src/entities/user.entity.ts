import { BaseEntity, type IBaseEntity } from "../core/base.entity.js";
import { Column, Table } from "../core/table.decorator.js";

interface IUser extends IBaseEntity<number> {
  name: string;
  address: string;
  dob: Date;
  email: string;
}

@Table("users")
export class User extends BaseEntity<number> implements IUser {
  @Column()
  name: string;

  @Column()
  address: string;

  @Column("date_of_birth")
  dob: Date;

  @Column()
  email: string;

  constructor(user: IUser) {
    super(user);
    this.name = user.name;
    this.address = user.address;
    this.dob = user.dob;
    this.email = user.email;
  }
}
