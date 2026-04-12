import { BaseEntity, type IBaseEntity } from "../core/base.entity.js";
import { Column, Table } from "../core/table.decorator.js";

interface IEmployee extends IBaseEntity<number> {
  name: string;
  position: string;
  department: string;
  salary: number;
}

@Table("employee")
export class Employee extends BaseEntity<number> implements IEmployee {
  @Column()
  name: string;
  @Column()
  position: string;
  @Column()
  department: string;
  @Column()
  salary: number;

  constructor(employee: IEmployee) {
    super(employee);
    this.name = employee.name;
    this.position = employee.position;
    this.department = employee.department;
    this.salary = employee.salary;
  }
}
