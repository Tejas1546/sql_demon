import { BaseEntity, type IBaseEntity } from "../core/base.entity.js";
import { Column } from "../core/column.decorator.js";
import { Table } from "../core/table.decorator.js";

// Shape of the data required to construct a User.
// Extends IBaseEntity to inherit id, createdAt, createdBy, updatedAt, updatedBy.
export interface IUser extends IBaseEntity {
    name: string;
    address: string;
    dob: Date;       // Date of birth
    email: string;
}

// Maps this entity to the "users" table in the database.
// All CRUD operations (save, findAll, findById, etc.) are inherited from BaseEntity.
@Table('users')
export class User extends BaseEntity implements IUser {

    @Column()
    name: string;

    @Column()
    address: string;

    @Column()
    dob: Date;

    @Column()
    email: string;

    /**
     * Accepts a partial IUser so the class can be instantiated with only some fields
     * (e.g. when hydrating from a DB row where id is already known).
     * Falls back to safe defaults for any missing fields.
     */
    constructor(user: Partial<IUser> = {}) {
        super(user as IBaseEntity);
        this.name = (user.name ?? '') as string;
        this.address = (user.address ?? '') as string;
        this.dob = (user.dob ?? new Date(0)) as Date;
        this.email = (user.email ?? '') as string;
    }
}
