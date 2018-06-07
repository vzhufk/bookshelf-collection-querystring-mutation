const bcqm = require("../src/index.js");

const bookshelf = require("bookshelf");
const knex = require("knex");
const sqlite3 = require("sqlite3");

describe("bookshelf-collection-query-mutation", () => {
  const db = new sqlite3.Database("./test.sqlite3");
  const repository = bookshelf(
    knex({
      client: "sqlite3",
      connection: {
        filename: "./test.sqlite3"
      }
    })
  );

  repository.plugin(bcqm);

  const data = [
    { name: "Eggs", price: 0.5, qty: 10 },
    { name: "Milk", price: 2.5, qty: 2 },
    { name: "Bread", price: 2, qty: 1 },
    { name: "Apple", price: 1, qty: 3 },
    { name: "Banana", price: 1.5, qty: 2 },
    { name: "Spam", price: 5, qty: 1 },
    { name: "Salt", price: 2.78, qty: 1 }
  ];

  beforeAll(async () => {
    await repository.knex.schema.dropTableIfExists("shopping_list");

    await repository.knex.schema.createTable("shopping_list", table => {
      table.increments("id").primary();
      table.string("name");
      table.integer("qty").defaultTo(1);
      table.float("price").defaultTo(0.01);
    });
    await repository.knex.insert(data).debug();
  });

  const List = repository.Model.extend({
    tableName: "shopping_list"
  });

  test("select all", async () => {
    let items = await List.forge().fetchAll();
    expect(items.serialize().length).toBe(data.length);
  });
});
