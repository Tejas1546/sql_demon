import { BaseEntity, type IBaseEntity } from "../core/base.entity.js";
import { Table } from "../core/table.decorator.js";

interface IEmployee extends IBaseEntity<number> {
  name: string;
  position: string;
  department: string;
  salary: number;
}

@Table("employee")
export class Employee extends BaseEntity<number> implements IEmployee {
  name: string;
  position: string;
  department: string;
  salary: number;

  constructor(employee: IEmployee) {
    super(employee);
    this.name = employee.name;
    this.position = employee.position;
    this.department = employee.department;
    this.salary = employee.salary;
  }
}
